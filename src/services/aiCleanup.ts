// Cleanup paths for clothing photos so the saved image better represents
// the actual garment style. Multiple providers supported so the user can
// pick whichever is currently working / has free quota:
//   - aiCleanupViaPuter:    Google Nano Banana via Puter (rate-limited)
//   - aiCleanupViaHFSpace:  Qwen / FLUX / others on HuggingFace Spaces
//   - aiCleanupCanvas:      pure browser canvas (gentle WB + contrast)

import { Client, handle_file } from '@gradio/client';

declare global {
  interface Window {
    puter?: any;
  }
}

export const DEFAULT_CLEANUP_PROMPT = [
  'Re-render this clothing item as a clean e-commerce product photo on a pure white background.',
  'Preserve the EXACT original colors, fabric texture, prints, patterns, hardware and design details.',
  'Remove all shadows, wrinkles, hangers, mannequins, hands, and any background colour bleed on the edges.',
  'Show the garment centered, front-facing, evenly lit with soft studio lighting.',
  'No text, no watermark, no extra props.',
].join(' ');

const PROMPT = DEFAULT_CLEANUP_PROMPT;

export async function aiCleanupViaPuter(
  dataUrl: string,
  onStatus?: (msg: string) => void,
  promptOverride?: string,
): Promise<string> {
  const w = window;
  if (!w.puter) throw new Error('Puter.js 還沒載入完成，請稍候再試。');
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error('圖片資料格式不正確。');
  const mime = m[1];
  const base64 = m[2];

  onStatus?.('呼叫 Nano Banana…（首次使用需登入 Puter，僅一次）');
  const promptText = (promptOverride && promptOverride.trim()) || PROMPT;
  // Puter API change (2026): must pass provider, and the 2.5 preview model was
  // deprecated in favour of gemini-3.1-flash-image-preview. The previous shape
  // produces 'could not resolve app config' on newer Puter builds.
  const result = await w.puter.ai.txt2img(promptText, {
    provider: 'gemini',
    model: 'gemini-3.1-flash-image-preview',
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

// HF Space cleanup via gradio_client. Each preset can declare its own
// payload builder so we don't have to brute-force parameter names.
export interface HFCleanupPreset {
  spaceId: string;
  endpoint: string;
  /** If provided, called with the garment file to build the predict payload.
   *  Only used by Spaces that need extra params (e.g. try-on Spaces being
   *  repurposed for single-image cleanup). */
  buildPayload?: (garment: any) => Record<string, any>;
}

export const CLEANUP_PRESETS: Array<{
  id: string;
  label: string;
  description: string;
  preset: HFCleanupPreset;
  /** ZeroGPU spaces require an HF read token in 2026. */
  needsToken?: boolean;
  /** Marks repurposed try-on Spaces — output quality may vary. */
  experimental?: boolean;
}> = [
  {
    id: 'ootd',
    label: 'OOTDiffusion (匿名可用)',
    description: '原為 try-on 模型，匿名 2.3 秒喚醒可用。cleanup 用法把衣物同時當 person 和 garment 送，效果視衣物而定（實驗性）。',
    preset: {
      spaceId: 'levihsu/OOTDiffusion',
      endpoint: '/process_hd',
      buildPayload: (garment) => ({
        vton_img: garment,
        garm_img: garment,
        n_samples: 1,
        n_steps: 20,
        image_scale: 2,
        seed: -1,
      }),
    },
    experimental: true,
  },
  {
    id: 'idm-vton',
    label: 'IDM-VTON (匿名可用)',
    description: '原為 try-on 模型，匿名可用。cleanup 用法把衣物同時當 person 和 garment（實驗性）。',
    preset: {
      spaceId: 'yisol/IDM-VTON',
      endpoint: '/tryon',
      buildPayload: (garment) => ({
        dict: { background: garment, layers: [], composite: null },
        garm_img: garment,
        garment_des: 'a clean studio product photo of this garment',
        is_checked: true,
        is_checked_crop: false,
        denoise_steps: 20,
        seed: 42,
      }),
    },
    experimental: true,
  },
  {
    id: 'qwen-edit',
    label: 'Qwen-Image-Edit 2511',
    description: '阿里官方通用編輯模型，盲測勝過 Gemini 2.5 Flash。需 HF Token（ZeroGPU）。最適合 cleanup 任務。',
    preset: { spaceId: 'Qwen/Qwen-Image-Edit-2511', endpoint: '/predict' },
    needsToken: true,
  },
  {
    id: 'flux-kontext',
    label: 'FLUX.1 Kontext-Dev',
    description: 'Black Forest Labs 通用編輯。需 HF Token（ZeroGPU）。',
    preset: { spaceId: 'black-forest-labs/FLUX.1-Kontext-Dev', endpoint: '/predict' },
    needsToken: true,
  },
];

export async function aiCleanupViaHFSpace(
  dataUrl: string,
  preset: HFCleanupPreset,
  onStatus?: (msg: string) => void,
  hfToken?: string,
  promptOverride?: string,
): Promise<string> {
  onStatus?.(`連接 ${preset.spaceId}…`);
  const client = await Promise.race([
    Client.connect(preset.spaceId, {
      token: (hfToken as `hf_${string}` | undefined) || undefined,
      status_callback: (status: any) => {
        const s = status?.status || 'connecting';
        onStatus?.(`Space 狀態：${s}`);
      },
    } as any),
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `連接 ${preset.spaceId} 逾時（60 秒）。可能 Space 在睡眠或需要 HF Token；請改試其他模型或在設定貼 Token。`,
            ),
          ),
        60_000,
      ),
    ),
  ]);
  const blob = await fetch(dataUrl).then((r) => r.blob());
  const file = handle_file(blob);

  onStatus?.('AI 推論中（Space 在睡眠時首次喚醒約 30–60 秒）…');
  const promptText = (promptOverride && promptOverride.trim()) || PROMPT;
  const attempts: Array<() => Promise<unknown>> = preset.buildPayload
    ? [() => client.predict(preset.endpoint, preset.buildPayload!(file))]
    : [
        () => client.predict(preset.endpoint, { input_image: file, prompt: promptText }),
        () => client.predict(preset.endpoint, { image: file, prompt: promptText }),
        () => client.predict(preset.endpoint, [file, promptText]),
        () => client.predict(preset.endpoint, [promptText, file]),
      ];

  let lastErr: unknown = null;
  for (const attempt of attempts) {
    try {
      const result = await attempt();
      const url = pickImageUrl((result as any).data ?? result);
      if (url) return url;
      lastErr = new Error('Space 回傳格式無法解析');
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('所有參數組合都失敗');
}

function pickImageUrl(data: unknown): string | null {
  const visit = (v: any): string | null => {
    if (!v) return null;
    if (typeof v === 'string' && (v.startsWith('http') || v.startsWith('data:'))) return v;
    if (typeof v === 'object') {
      if (typeof v.url === 'string') return v.url;
      if (typeof v.path === 'string') return v.path;
      if (typeof v.value === 'string') return v.value;
      if (Array.isArray(v)) {
        for (const it of v) {
          const r = visit(it);
          if (r) return r;
        }
      }
      for (const k of Object.keys(v)) {
        const r = visit(v[k]);
        if (r) return r;
      }
    }
    return null;
  };
  return visit(data);
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
