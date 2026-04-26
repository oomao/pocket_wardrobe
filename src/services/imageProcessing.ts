import { removeBackground as imglyRemove } from '@imgly/background-removal';

export type ProgressCb = (key: string, current: number, total: number) => void;

export async function removeBackground(
  input: Blob | string,
  onProgress?: ProgressCb,
): Promise<Blob> {
  return await imglyRemove(input, {
    progress: (key, current, total) => {
      onProgress?.(key, current, total);
    },
    output: { format: 'image/png' },
  });
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

// Crop transparent borders so the saved image hugs the visible subject.
// alphaThreshold: 0..255; pixels with alpha <= threshold are treated empty.
export async function cropTransparent(
  dataUrl: string,
  paddingPx = 8,
  alphaThreshold = 16,
): Promise<string> {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return dataUrl;

  const cnv = document.createElement('canvas');
  cnv.width = w;
  cnv.height = h;
  const ctx = cnv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, w, h);

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return dataUrl; // fully transparent

  minX = Math.max(0, minX - paddingPx);
  minY = Math.max(0, minY - paddingPx);
  maxX = Math.min(w - 1, maxX + paddingPx);
  maxY = Math.min(h - 1, maxY + paddingPx);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;

  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  const octx = out.getContext('2d');
  if (!octx) return dataUrl;
  octx.drawImage(cnv, minX, minY, cw, ch, 0, 0, cw, ch);
  return out.toDataURL('image/png');
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
