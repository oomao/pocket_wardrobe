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

// Pure-canvas gentle enhance. Earlier versions used gray-world auto white
// balance which distorted colourful clothing (a red shirt got pulled toward
// gray). The new pipeline:
//   1) White-patch white balance only when the brightest pixels are clearly
//      off-white — otherwise leave colour alone.
//   2) Mild contrast (×1.04) to lift dull captures without crushing.
//   3) Tiny saturation boost (×1.05).
// Operates only on opaque pixels so transparent borders stay clean.
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

  // White-patch: collect the brightest 5% of opaque pixels by luma. If their
  // average isn't already near white, gently nudge it toward white.
  const luma: Array<{ i: number; l: number }> = [];
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] > 32) {
      const l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      luma.push({ i, l });
    }
  }
  if (luma.length === 0) return dataUrl;
  luma.sort((a, b) => b.l - a.l);
  const topN = Math.max(1, Math.floor(luma.length * 0.05));
  let rSum = 0, gSum = 0, bSum = 0;
  for (let k = 0; k < topN; k++) {
    const i = luma[k].i;
    rSum += px[i];
    gSum += px[i + 1];
    bSum += px[i + 2];
  }
  const rTop = rSum / topN;
  const gTop = gSum / topN;
  const bTop = bSum / topN;
  const topAvg = (rTop + gTop + bTop) / 3;

  // Only correct if the brightest patch is meaningfully tinted (channel
  // deviation > 6) AND not already very close to white. Otherwise skip WB.
  const channelSpread = Math.max(rTop, gTop, bTop) - Math.min(rTop, gTop, bTop);
  let rG = 1, gG = 1, bG = 1;
  if (channelSpread > 6 && topAvg < 245) {
    const target = Math.min(245, topAvg + 8); // mild push, never blow out
    rG = clampGain(target / Math.max(rTop, 1));
    gG = clampGain(target / Math.max(gTop, 1));
    bG = clampGain(target / Math.max(bTop, 1));
  }

  const contrast = 1.04;
  const sat = 1.05;
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

function clampGain(v: number) {
  return v < 0.92 ? 0.92 : v > 1.12 ? 1.12 : v;
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
