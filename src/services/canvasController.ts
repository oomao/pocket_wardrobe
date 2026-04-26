import * as fabric from 'fabric';
import {
  CATEGORY_BODY_LANDMARKS,
  CATEGORY_PLACEMENT,
  CategoryBox,
  Clothing,
  DEFAULT_PLACEMENT,
  MANNEQUIN_VIEWBOX,
  OutfitItem,
  UserProfile,
  profileToScales,
} from '../types';
import type { NormalizedLandmark } from './poseDetection';

interface AvatarTransform {
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  viewW: number;
  viewH: number;
  isPhoto: boolean;
}

export class TryOnController {
  canvas: fabric.Canvas;
  private avatarImg: fabric.FabricImage | null = null;
  private avatarTx: AvatarTransform | null = null;
  private bodyLandmarks: NormalizedLandmark[] | null = null;

  constructor(el: HTMLCanvasElement, width: number, height: number) {
    this.canvas = new fabric.Canvas(el, {
      width,
      height,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: false,
    });
  }

  dispose() {
    this.canvas.dispose();
  }

  setBodyLandmarks(lm: NormalizedLandmark[] | null) {
    this.bodyLandmarks = lm;
  }

  async setAvatar(profile: UserProfile, defaultUrl: string) {
    if (this.avatarImg) {
      this.canvas.remove(this.avatarImg);
      this.avatarImg = null;
    }
    const cw = this.canvas.getWidth();
    const ch = this.canvas.getHeight();

    const useUserPhoto = profile.avatarMode === 'photo' && !!profile.photoBase64;
    const url = useUserPhoto ? (profile.photoBase64 as string) : defaultUrl;
    const img = await fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' });

    const naturalW = img.width ?? MANNEQUIN_VIEWBOX.w;
    const naturalH = img.height ?? MANNEQUIN_VIEWBOX.h;

    let scaleX: number;
    let scaleY: number;
    if (useUserPhoto) {
      const fit = Math.min(cw / naturalW, ch / naturalH) * 0.95;
      scaleX = scaleY = fit;
    } else {
      const baseScale = (ch * 0.95) / naturalH;
      const s = profileToScales(profile);
      scaleX = baseScale * s.scaleX;
      scaleY = baseScale * s.scaleY;
    }

    img.set({
      originX: 'center',
      originY: 'center',
      left: cw / 2,
      top: ch / 2,
      scaleX,
      scaleY,
      selectable: false,
      evented: false,
      hoverCursor: 'default',
    });
    this.canvas.add(img);
    this.canvas.sendObjectToBack(img);
    this.avatarImg = img;
    this.avatarTx = {
      left: cw / 2,
      top: ch / 2,
      scaleX,
      scaleY,
      viewW: naturalW,
      viewH: naturalH,
      isPhoto: useUserPhoto,
    };
    this.canvas.requestRenderAll();
  }

  // Convert mannequin viewBox / photo native coords → canvas pixels.
  private viewToCanvas(vx: number, vy: number) {
    if (!this.avatarTx) return { x: vx, y: vy };
    const { left, top, scaleX, scaleY, viewW, viewH } = this.avatarTx;
    return {
      x: left + (vx - viewW / 2) * scaleX,
      y: top + (vy - viewH / 2) * scaleY,
    };
  }

  // Convert MediaPipe normalized landmark (0..1) to canvas pixels.
  private landmarkToCanvas(idx: number) {
    if (!this.avatarTx || !this.bodyLandmarks) return null;
    const lm = this.bodyLandmarks[idx];
    if (!lm) return null;
    return this.viewToCanvas(lm.x * this.avatarTx.viewW, lm.y * this.avatarTx.viewH);
  }

  private resolvePlacementBox(category: string): CategoryBox {
    const fromMap = CATEGORY_PLACEMENT[category] ?? DEFAULT_PLACEMENT;
    if (!this.avatarTx?.isPhoto) return fromMap;
    const { viewW, viewH } = this.avatarTx;
    const ratios: Record<string, { topR: number; botR: number; leftR: number; rightR: number }> = {
      上衣: { topR: 0.18, botR: 0.52, leftR: 0.20, rightR: 0.80 },
      外套: { topR: 0.16, botR: 0.58, leftR: 0.15, rightR: 0.85 },
      連身: { topR: 0.18, botR: 0.78, leftR: 0.20, rightR: 0.80 },
      下著: { topR: 0.52, botR: 0.95, leftR: 0.30, rightR: 0.70 },
      鞋子: { topR: 0.92, botR: 0.99, leftR: 0.30, rightR: 0.70 },
      配件: { topR: 0.25, botR: 0.40, leftR: 0.40, rightR: 0.60 },
    };
    const r = ratios[category] ?? { topR: 0.30, botR: 0.60, leftR: 0.30, rightR: 0.70 };
    return {
      topY: r.topR * viewH,
      bottomY: r.botR * viewH,
      leftX: r.leftR * viewW,
      rightX: r.rightR * viewW,
    };
  }

  // Compute affine fit (scale + rotation + translation) from clothing's two
  // anchor points to the body's two landmarks. Returns Fabric setters or null
  // if landmarks/anchors aren't available.
  private computeBodyFit(clothing: Clothing, img: fabric.FabricImage) {
    if (!clothing.anchors) return null;
    const bodyMap = CATEGORY_BODY_LANDMARKS[clothing.category];
    if (!bodyMap) return null;
    const bodyL = this.landmarkToCanvas(bodyMap.left);
    const bodyR = this.landmarkToCanvas(bodyMap.right);
    if (!bodyL || !bodyR) return null;

    const cW = img.width ?? 1;
    const cH = img.height ?? 1;
    const cAL = { x: clothing.anchors.left.x * cW, y: clothing.anchors.left.y * cH };
    const cAR = { x: clothing.anchors.right.x * cW, y: clothing.anchors.right.y * cH };

    const dxC = cAR.x - cAL.x;
    const dyC = cAR.y - cAL.y;
    const dC = Math.hypot(dxC, dyC);
    if (dC < 1) return null;
    const angleC = Math.atan2(dyC, dxC);

    const dxB = bodyR.x - bodyL.x;
    const dyB = bodyR.y - bodyL.y;
    const dB = Math.hypot(dxB, dyB);
    const angleB = Math.atan2(dyB, dxB);

    const scale = dB / dC;
    const rad = angleB - angleC;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Offset from clothing image center to its mid-anchor (in clothing pixels)
    const midClothX = (cAL.x + cAR.x) / 2 - cW / 2;
    const midClothY = (cAL.y + cAR.y) / 2 - cH / 2;

    // After scale + rotation, where the mid-anchor lands relative to the
    // image center.
    const offsetX = (midClothX * cos - midClothY * sin) * scale;
    const offsetY = (midClothX * sin + midClothY * cos) * scale;

    const midBX = (bodyL.x + bodyR.x) / 2;
    const midBY = (bodyL.y + bodyR.y) / 2;

    return {
      left: midBX - offsetX,
      top: midBY - offsetY,
      scaleX: scale,
      scaleY: scale,
      angle: (rad * 180) / Math.PI,
    };
  }

  async addClothing(clothing: Clothing, opts?: Partial<OutfitItem>) {
    const img = await fabric.FabricImage.fromURL(clothing.imageBase64);
    const cw = this.canvas.getWidth();
    const ch = this.canvas.getHeight();

    let left = opts?.x ?? cw / 2;
    let top = opts?.y ?? ch / 2;
    let scaleX = opts?.scaleX;
    let scaleY = opts?.scaleY;
    let angle = opts?.angle ?? 0;

    const restoring = opts?.scaleX !== undefined;

    if (!restoring) {
      // 1) Try body-fit if avatar is a photo with detected landmarks
      const fit =
        this.avatarTx?.isPhoto && this.bodyLandmarks
          ? this.computeBodyFit(clothing, img)
          : null;
      if (fit) {
        left = fit.left;
        top = fit.top;
        scaleX = fit.scaleX;
        scaleY = fit.scaleY;
        angle = fit.angle;
      } else if (this.avatarTx) {
        // 2) Fall back to category placement box
        const box = this.resolvePlacementBox(clothing.category);
        const tl = this.viewToCanvas(box.leftX, box.topY);
        const br = this.viewToCanvas(box.rightX, box.bottomY);
        const targetW = Math.max(40, br.x - tl.x);
        const targetH = Math.max(40, br.y - tl.y);
        const naturalW = img.width ?? 1;
        const naturalH = img.height ?? 1;
        const f = Math.min(targetW / naturalW, targetH / naturalH);
        scaleX = scaleY = f;
        left = (tl.x + br.x) / 2;
        top = (tl.y + br.y) / 2;
      } else {
        const targetMax = Math.min(cw, ch) * 0.4;
        const naturalMax = Math.max(img.width ?? 1, img.height ?? 1);
        scaleX = scaleY = targetMax / naturalMax;
      }
    }

    img.set({
      originX: 'center',
      originY: 'center',
      left,
      top,
      scaleX: scaleX!,
      scaleY: scaleY ?? scaleX!,
      angle,
      cornerStyle: 'circle',
      cornerColor: '#a21caf',
      borderColor: '#a21caf',
      transparentCorners: false,
    });
    (img as any).clotheId = clothing.id;
    this.canvas.add(img);
    this.canvas.setActiveObject(img);
    this.canvas.requestRenderAll();
    return img;
  }

  bringForward() {
    const o = this.canvas.getActiveObject();
    if (o) this.canvas.bringObjectForward(o);
    this.canvas.requestRenderAll();
  }

  sendBackwards() {
    const o = this.canvas.getActiveObject();
    if (!o) return;
    const objects = this.canvas.getObjects();
    const idx = objects.indexOf(o);
    if (idx > 1) this.canvas.sendObjectBackwards(o);
    this.canvas.requestRenderAll();
  }

  removeActive() {
    const o = this.canvas.getActiveObject();
    if (o && o !== this.avatarImg) {
      this.canvas.remove(o);
      this.canvas.discardActiveObject();
      this.canvas.requestRenderAll();
    }
  }

  enableSelection(enable: boolean) {
    this.canvas.selection = enable;
  }

  getState(): OutfitItem[] {
    const items: OutfitItem[] = [];
    const objects = this.canvas.getObjects();
    objects.forEach((obj, idx) => {
      const clotheId = (obj as any).clotheId as string | undefined;
      if (!clotheId) return;
      items.push({
        clotheId,
        x: obj.left ?? 0,
        y: obj.top ?? 0,
        scaleX: obj.scaleX ?? 1,
        scaleY: obj.scaleY ?? 1,
        angle: obj.angle ?? 0,
        zIndex: idx,
      });
    });
    return items;
  }

  async restoreState(
    items: OutfitItem[],
    resolveClothing: (id: string) => Promise<Clothing | undefined>,
  ) {
    const toRemove = this.canvas.getObjects().filter((o) => o !== this.avatarImg);
    toRemove.forEach((o) => this.canvas.remove(o));

    const sorted = [...items].sort((a, b) => a.zIndex - b.zIndex);
    for (const it of sorted) {
      const c = await resolveClothing(it.clotheId);
      if (!c) continue;
      await this.addClothing(c, it);
    }
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
  }
}
