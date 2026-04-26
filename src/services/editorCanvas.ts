// Plain-canvas image editor that loads a transparent PNG and lets the user
// erase pixels with destination-out compositing. Exports the result as a
// data URL for storage.

export class EditorCanvas {
  el: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  imgWidth = 0;
  imgHeight = 0;
  brushSize = 30;
  enabled = false;
  private drawing = false;
  private lastX = 0;
  private lastY = 0;
  private detachers: Array<() => void> = [];

  constructor(el: HTMLCanvasElement) {
    this.el = el;
    const ctx = el.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('canvas 2d context unavailable');
    this.ctx = ctx;
  }

  async loadImage(src: string, maxSize = 600) {
    const img = await loadImage(src);
    const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
    this.imgWidth = Math.round(img.width * ratio);
    this.imgHeight = Math.round(img.height * ratio);
    this.el.width = this.imgWidth;
    this.el.height = this.imgHeight;
    this.ctx.clearRect(0, 0, this.imgWidth, this.imgHeight);
    this.ctx.drawImage(img, 0, 0, this.imgWidth, this.imgHeight);
  }

  setBrushSize(size: number) {
    this.brushSize = Math.max(2, size);
  }

  enableEraser(enable: boolean) {
    this.enabled = enable;
    this.detach();
    if (!enable) return;
    const onDown = (e: PointerEvent) => this.onDown(e);
    const onMove = (e: PointerEvent) => this.onMove(e);
    const onUp = () => (this.drawing = false);
    this.el.addEventListener('pointerdown', onDown);
    this.el.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    this.detachers.push(
      () => this.el.removeEventListener('pointerdown', onDown),
      () => this.el.removeEventListener('pointermove', onMove),
      () => window.removeEventListener('pointerup', onUp),
    );
  }

  private getPos(e: PointerEvent) {
    const rect = this.el.getBoundingClientRect();
    const sx = this.el.width / rect.width;
    const sy = this.el.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  private onDown(e: PointerEvent) {
    this.drawing = true;
    const { x, y } = this.getPos(e);
    this.lastX = x;
    this.lastY = y;
    this.eraseAt(x, y, x, y);
  }

  private onMove(e: PointerEvent) {
    if (!this.drawing) return;
    const { x, y } = this.getPos(e);
    this.eraseAt(this.lastX, this.lastY, x, y);
    this.lastX = x;
    this.lastY = y;
  }

  private eraseAt(x1: number, y1: number, x2: number, y2: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = this.brushSize;
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  exportDataURL(): string {
    return this.el.toDataURL('image/png');
  }

  private detach() {
    this.detachers.forEach((fn) => fn());
    this.detachers = [];
  }

  dispose() {
    this.detach();
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
