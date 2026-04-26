import * as fabric from 'fabric';
import { Clothing, OutfitItem, UserProfile, profileToScales } from '../types';

export interface ClothingObjectMeta {
  clotheId: string;
}

export class TryOnController {
  canvas: fabric.Canvas;
  private avatarImg: fabric.FabricImage | null = null;

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

  async setAvatar(profile: UserProfile, avatarUrl: string) {
    if (this.avatarImg) {
      this.canvas.remove(this.avatarImg);
      this.avatarImg = null;
    }
    const img = await fabric.FabricImage.fromURL(avatarUrl, { crossOrigin: 'anonymous' });
    const cw = this.canvas.getWidth();
    const ch = this.canvas.getHeight();
    const baseScale = (ch * 0.95) / (img.height ?? 1);
    const { scaleX, scaleY } = profileToScales(profile);
    img.set({
      originX: 'center',
      originY: 'center',
      left: cw / 2,
      top: ch / 2,
      scaleX: baseScale * scaleX,
      scaleY: baseScale * scaleY,
      selectable: false,
      evented: false,
      hoverCursor: 'default',
    });
    this.canvas.add(img);
    this.canvas.sendObjectToBack(img);
    this.avatarImg = img;
    this.canvas.requestRenderAll();
  }

  async addClothing(clothing: Clothing, opts?: Partial<OutfitItem>) {
    const img = await fabric.FabricImage.fromURL(clothing.imageBase64);
    const cw = this.canvas.getWidth();
    const ch = this.canvas.getHeight();
    const targetMax = Math.min(cw, ch) * 0.4;
    const naturalMax = Math.max(img.width ?? 1, img.height ?? 1);
    const fitScale = targetMax / naturalMax;
    img.set({
      originX: 'center',
      originY: 'center',
      left: opts?.x ?? cw / 2,
      top: opts?.y ?? ch / 2,
      scaleX: opts?.scaleX ?? fitScale,
      scaleY: opts?.scaleY ?? fitScale,
      angle: opts?.angle ?? 0,
      cornerStyle: 'circle',
      cornerColor: '#a21caf',
      borderColor: '#a21caf',
      transparentCorners: false,
    });
    (img as any).clotheId = clothing.id;
    this.canvas.add(img);
    if (opts?.zIndex !== undefined) {
      // ordering applied after restoreState completes
    }
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
    // Don't send below avatar
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
    // remove all non-avatar
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
