import * as fabric from 'fabric';
import {
  CATEGORY_PLACEMENT,
  CategoryBox,
  Clothing,
  DEFAULT_PLACEMENT,
  MANNEQUIN_VIEWBOX,
  OutfitItem,
  UserProfile,
  profileToScales,
} from '../types';

interface AvatarTransform {
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  viewW: number;
  viewH: number;
  // when true, photo mode → no SVG landmarks; auto-placement uses heuristic ratios
  isPhoto: boolean;
}

export class TryOnController {
  canvas: fabric.Canvas;
  private avatarImg: fabric.FabricImage | null = null;
  private avatarTx: AvatarTransform | null = null;

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
      // Fit photo into canvas keeping aspect ratio (no body-scaling)
      const fit = Math.min(cw / naturalW, ch / naturalH) * 0.95;
      scaleX = fit;
      scaleY = fit;
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

  // Convert mannequin viewBox coords → canvas pixels.
  private viewToCanvas(vx: number, vy: number) {
    if (!this.avatarTx) return { x: vx, y: vy };
    const { left, top, scaleX, scaleY, viewW, viewH } = this.avatarTx;
    return {
      x: left + (vx - viewW / 2) * scaleX,
      y: top + (vy - viewH / 2) * scaleY,
    };
  }

  // Resolve placement box for a category. For photo mode we use ratio-based
  // heuristics (e.g. shoulders ≈ 18% from top, hips ≈ 55%) because there are
  // no real landmarks until pose detection is added.
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

  async addClothing(clothing: Clothing, opts?: Partial<OutfitItem>) {
    const img = await fabric.FabricImage.fromURL(clothing.imageBase64);
    const cw = this.canvas.getWidth();
    const ch = this.canvas.getHeight();

    let left = opts?.x ?? cw / 2;
    let top = opts?.y ?? ch / 2;
    let scaleX = opts?.scaleX;
    let scaleY = opts?.scaleY;

    if (opts?.scaleX === undefined && this.avatarTx) {
      // First-time placement: snap to category landmark on the body.
      const box = this.resolvePlacementBox(clothing.category);
      const tl = this.viewToCanvas(box.leftX, box.topY);
      const br = this.viewToCanvas(box.rightX, box.bottomY);
      const targetW = Math.max(40, br.x - tl.x);
      const targetH = Math.max(40, br.y - tl.y);
      const naturalW = img.width ?? 1;
      const naturalH = img.height ?? 1;
      const fit = Math.min(targetW / naturalW, targetH / naturalH);
      scaleX = fit;
      scaleY = fit;
      left = (tl.x + br.x) / 2;
      top = (tl.y + br.y) / 2;
    } else if (scaleX === undefined) {
      const targetMax = Math.min(cw, ch) * 0.4;
      const naturalMax = Math.max(img.width ?? 1, img.height ?? 1);
      scaleX = scaleY = targetMax / naturalMax;
    }

    img.set({
      originX: 'center',
      originY: 'center',
      left,
      top,
      scaleX: scaleX!,
      scaleY: scaleY ?? scaleX!,
      angle: opts?.angle ?? 0,
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
