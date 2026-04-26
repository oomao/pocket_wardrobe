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

// Quick dominant-colour extraction for auto-tagging clothing on save.
// Downsamples to 64×64, buckets channels into 5-bit cells, picks the most
// populated cell among opaque pixels and returns its averaged colour.
export async function extractDominantColor(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const cnv = document.createElement('canvas');
  cnv.width = 64;
  cnv.height = 64;
  const ctx = cnv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '#888888';
  ctx.drawImage(img, 0, 0, 64, 64);
  const data = ctx.getImageData(0, 0, 64, 64).data;

  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 32) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Skip near-white & near-black to avoid background / shadow contamination
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum > 240 || lum < 18) continue;
    const key = `${Math.floor(r / 8)},${Math.floor(g / 8)},${Math.floor(b / 8)}`;
    const cur = buckets.get(key);
    if (cur) {
      cur.r += r;
      cur.g += g;
      cur.b += b;
      cur.n++;
    } else {
      buckets.set(key, { r, g, b, n: 1 });
    }
  }
  if (buckets.size === 0) return '#888888';
  let best = { r: 0, g: 0, b: 0, n: 0 };
  for (const v of buckets.values()) {
    if (v.n > best.n) best = v;
  }
  const r = Math.round(best.r / best.n);
  const g = Math.round(best.g / best.n);
  const b = Math.round(best.b / best.n);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
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
