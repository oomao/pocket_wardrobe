// Two cleanup paths for clothing photos so the saved image better
// represents the actual garment style:
//   - aiCleanupViaPuter:  free Google Nano Banana via Puter.js (best quality,
//                         requires the user to sign in to Puter once).
//   - aiCleanupCanvas:    pure browser canvas (gray-world WB + slight
//                         contrast/saturation boost). Instant, no sign-in,
//                         only fixes mild colour casts.

declare global {
  interface Window {
    puter?: any;
  }
}

const PROMPT = [
  'Re-render this clothing item as a clean e-commerce product photo on a pure white background.',
  'Preserve the EXACT original colors, fabric texture, prints, patterns, hardware and design details.',
  'Remove all shadows, wrinkles, hangers, mannequins, hands, and any background colour bleed on the edges.',
  'Show the garment centered, front-facing, evenly lit with soft studio lighting.',
  'No text, no watermark, no extra props.',
].join(' ');

export async function aiCleanupViaPuter(
  dataUrl: string,
  onStatus?: (msg: string) => void,
): Promise<string> {
  const w = window;
  if (!w.puter) throw new Error('Puter.js 還沒載入完成，請稍候再試。');
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error('圖片資料格式不正確。');
  const mime = m[1];
  const base64 = m[2];

  onStatus?.('呼叫 Nano Banana…（首次使用需登入 Puter，僅一次）');
  const result = await w.puter.ai.txt2img(PROMPT, {
    model: 'gemini-2.5-flash-image-preview',
    input_image: base64,
    input_image_mime_type: mime,
  });

  const imgEl: HTMLImageElement | null =
    result instanceof HTMLImageElement
      ? result
      : typeof result === 'string'
      ? Object.assign(new Image(), { src: result })
      : null;
  if (!imgEl) throw new Error('Puter 回傳格式不認得。');

  if (!imgEl.complete || imgEl.naturalWidth === 0) {
    await new Promise<void>((resolve, reject) => {
      imgEl.onload = () => resolve();
      imgEl.onerror = () => reject(new Error('AI 結果圖片載入失敗。'));
    });
  }

  const cnv = document.createElement('canvas');
  cnv.width = imgEl.naturalWidth;
  cnv.height = imgEl.naturalHeight;
  const ctx = cnv.getContext('2d');
  if (!ctx) throw new Error('無法建立 canvas context。');
  ctx.drawImage(imgEl, 0, 0);
  return cnv.toDataURL('image/png');
}

// Pure-canvas cleanup: gray-world auto white balance + light contrast and
// saturation push. Operates only on opaque pixels so transparent borders
// are preserved.
export async function aiCleanupCanvas(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const cnv = document.createElement('canvas');
  cnv.width = img.naturalWidth;
  cnv.height = img.naturalHeight;
  const ctx = cnv.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas context');
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, cnv.width, cnv.height);
  const px = imgData.data;

  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] > 32) {
      rSum += px[i];
      gSum += px[i + 1];
      bSum += px[i + 2];
      count++;
    }
  }
  if (count === 0) return dataUrl;

  const rAvg = rSum / count;
  const gAvg = gSum / count;
  const bAvg = bSum / count;
  const grayAvg = (rAvg + gAvg + bAvg) / 3;
  const clampGain = (v: number) => Math.max(0.75, Math.min(1.35, v));
  const rG = clampGain(grayAvg / Math.max(rAvg, 1));
  const gG = clampGain(grayAvg / Math.max(gAvg, 1));
  const bG = clampGain(grayAvg / Math.max(bAvg, 1));

  const contrast = 1.06;
  const sat = 1.10;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    let r = px[i] * rG;
    let g = px[i + 1] * gG;
    let b = px[i + 2] * bG;
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    r = lum + (r - lum) * sat;
    g = lum + (g - lum) * sat;
    b = lum + (b - lum) * sat;
    px[i] = clamp255(r);
    px[i + 1] = clamp255(g);
    px[i + 2] = clamp255(b);
  }
  ctx.putImageData(imgData, 0, 0);
  return cnv.toDataURL('image/png');
}

function clamp255(v: number) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
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
