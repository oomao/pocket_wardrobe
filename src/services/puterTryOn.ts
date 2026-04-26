// Free virtual try-on via Puter.js → Google Gemini Nano Banana.
// No API key, no credit card; user signs in to Puter once on first call.
//
// Nano Banana's txt2img + input_image accepts a single reference image,
// so we compose the person + garment side-by-side into one canvas and
// instruct the model to render the person wearing the garment.

declare global {
  interface Window {
    puter?: any;
  }
}

const PROMPT_TEMPLATE = (category: string, garmentName?: string) => {
  const namePart = garmentName ? ` named「${garmentName}」` : '';
  const focus = (() => {
    switch (category) {
      case '上衣':
      case '外套':
        return 'Replace ONLY the upper-body clothing on the LEFT person with the garment on the RIGHT. Keep face, hair, body pose, lower-body clothing and background EXACTLY the same.';
      case '下著':
        return 'Replace ONLY the lower-body clothing on the LEFT person with the bottoms on the RIGHT. Keep face, hair, body pose, upper-body clothing and background EXACTLY the same.';
      case '連身':
        return 'Replace the entire outfit on the LEFT person with the dress / jumpsuit on the RIGHT. Keep face, hair, body pose, footwear and background EXACTLY the same.';
      case '鞋子':
        return 'Replace ONLY the footwear on the LEFT person with the shoes on the RIGHT. Keep everything else EXACTLY the same.';
      case '配件':
        return 'Add the accessory on the RIGHT to the LEFT person in a natural position (bag held, hat worn, scarf around neck, necklace on the chest). Keep everything else EXACTLY the same.';
      default:
        return 'Place the garment on the RIGHT onto the person on the LEFT, preserving their pose, face and background.';
    }
  })();
  return [
    'Photorealistic virtual try-on. The provided image contains TWO photos placed side-by-side, separated by a vertical white gap.',
    `LEFT photo = a customer (full body). RIGHT photo = a single garment${namePart} laid flat / on a hanger.`,
    focus,
    'The garment must drape naturally with realistic folds, shading and shadows that match the lighting on the LEFT photo. Output a SINGLE photograph that looks like the customer is really wearing the garment — not a collage. Do NOT include the right-side garment image, do NOT include text, captions, watermarks, or extra people in the output.',
  ].join(' ');
};

export type ProgressStage = 'connect' | 'compose' | 'inference' | 'done';

export interface RunPuterTryOnInput {
  personImageDataUrl: string;
  garmentImageDataUrl: string;
  category: string;
  garmentName?: string;
  onStatus?: (stage: ProgressStage, msg: string) => void;
}

export interface RunPuterTryOnResult {
  imageDataUrl: string;
}

export async function runPuterTryOn(input: RunPuterTryOnInput): Promise<RunPuterTryOnResult> {
  const { personImageDataUrl, garmentImageDataUrl, category, garmentName, onStatus } = input;
  if (!window.puter) throw new Error('Puter.js 還沒載入完成，請稍候再試。');

  onStatus?.('compose', '組合輸入影像…');
  const composite = await composeSideBySide(personImageDataUrl, garmentImageDataUrl);
  const m = /^data:([^;]+);base64,(.+)$/.exec(composite);
  if (!m) throw new Error('組合影像失敗。');

  onStatus?.('inference', 'AI 推論中…（首次使用會跳出 Puter 登入，30 秒搞定）');
  const prompt = PROMPT_TEMPLATE(category, garmentName);
  const result = await window.puter.ai.txt2img(prompt, {
    model: 'gemini-2.5-flash-image-preview',
    input_image: m[2],
    input_image_mime_type: m[1],
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
  onStatus?.('done', '完成');
  return { imageDataUrl: cnv.toDataURL('image/png') };
}

async function composeSideBySide(leftSrc: string, rightSrc: string): Promise<string> {
  const [li, ri] = await Promise.all([loadImage(leftSrc), loadImage(rightSrc)]);
  const targetH = 1024;
  const lW = (li.naturalWidth / li.naturalHeight) * targetH;
  const rW = (ri.naturalWidth / ri.naturalHeight) * targetH;
  const gap = 60;
  const totalW = Math.round(lW + rW + gap);
  const cnv = document.createElement('canvas');
  cnv.width = totalW;
  cnv.height = targetH;
  const ctx = cnv.getContext('2d');
  if (!ctx) throw new Error('canvas context');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalW, targetH);
  ctx.drawImage(li, 0, 0, lW, targetH);
  ctx.drawImage(ri, lW + gap, 0, rW, targetH);
  return cnv.toDataURL('image/png');
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
