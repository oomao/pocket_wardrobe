// Wrapper around @gradio/client for calling a public Hugging Face Space
// that hosts a virtual try-on model (CatVTON, IDM-VTON, Kolors-VTON, …).
//
// Different Spaces expose different endpoints and parameter orders, so the
// space + endpoint + cloth-type mapping are configurable from the UI/settings.
// The default below is known to work as of the time of writing; users can
// swap it via the AI 試穿 page if their preferred Space changes.

import { Client, handle_file } from '@gradio/client';

export type ProgressStage = 'connect' | 'queue' | 'processing' | 'done';

export interface AITryOnConfig {
  spaceId: string;
  endpoint?: string; // default '/tryon' or '/predict' depending on space
  hfToken?: string;
}

export interface RunOptions extends AITryOnConfig {
  category: string; // wardrobe category — mapped to cloth_type below
  onStatus?: (stage: ProgressStage, message: string) => void;
}

// Curated list of public HF Spaces the user can pick from. Ordered by
// quality / suitability so the first item is the recommended default.
// Liveness verified 2026-04 against the HF API (/info endpoint).
export interface HFSpacePreset {
  id: string;
  label: string;
  description: string;
  spaceId: string;
  endpoint: string;
  badge?: '推薦' | '快' | '通用' | '經典' | '需 Token';
  /** Build the call payload object for this Space's predict call. Returning a
   *  plain object lets each Space declare its own parameter names without
   *  forcing the runner to try a list of guesses.
   */
  buildPayload?: (person: any, garment: any, category: string) => Record<string, any>;
}

export const HF_SPACE_PRESETS: HFSpacePreset[] = [
  {
    id: 'ootd',
    label: 'OOTDiffusion (推薦)',
    description: 'AAAI 2024，~6.3k stars。匿名公開、2.3s 喚醒、API 穩定。實測 2026/4 可用。',
    spaceId: 'levihsu/OOTDiffusion',
    endpoint: '/process_hd',
    badge: '推薦',
    buildPayload: (person, garment) => ({
      vton_img: person,
      garm_img: garment,
      n_samples: 1,
      n_steps: 20,
      image_scale: 2,
      seed: -1,
    }),
  },
  {
    id: 'idm-vton',
    label: 'IDM-VTON',
    description: '經典 SOTA。匿名公開、API 穩定、自動 masking。實測 2026/4 可用。',
    spaceId: 'yisol/IDM-VTON',
    endpoint: '/tryon',
    badge: '推薦',
    buildPayload: (person, garment, category) => ({
      dict: { background: person, layers: [], composite: null },
      garm_img: garment,
      garment_des: idmVtonGarmentDescription(category),
      is_checked: true,        // auto-mask
      is_checked_crop: false,
      denoise_steps: 20,
      seed: 42,
    }),
  },
  {
    id: 'qwen-edit',
    label: 'Qwen-Image-Edit 2511',
    description: '阿里巴巴官方通用編輯模型 (2026)，盲測勝過 Gemini 2.5。需 HF Token（ZeroGPU）。',
    spaceId: 'Qwen/Qwen-Image-Edit-2511',
    endpoint: '/predict',
    badge: '需 Token',
  },
  {
    id: 'flux-kontext',
    label: 'FLUX.1 Kontext-Dev',
    description: 'Black Forest Labs 通用編輯 SOTA。需 HF Token（ZeroGPU）。',
    spaceId: 'black-forest-labs/FLUX.1-Kontext-Dev',
    endpoint: '/predict',
    badge: '需 Token',
  },
];

function idmVtonGarmentDescription(category: string): string {
  switch (category) {
    case '上衣': return 'a top';
    case '外套': return 'an outer jacket';
    case '下著': return 'pants';
    case '連身': return 'a one-piece dress';
    case '鞋子': return 'shoes';
    case '配件': return 'an accessory';
    default: return 'clothing';
  }
}

// Default — OOTDiffusion (verified alive 2026-04, simplest open API).
export const DEFAULT_CONFIG: AITryOnConfig = {
  spaceId: 'levihsu/OOTDiffusion',
  endpoint: '/process_hd',
};

// Map our wardrobe categories to the cloth-type taxonomy commonly used by
// VTON models. Most spaces accept upper / lower / overall / dress.
export function mapCategoryToClothType(category: string): string {
  switch (category) {
    case '上衣':
    case '外套':
      return 'upper';
    case '下著':
      return 'lower';
    case '連身':
      return 'overall';
    default:
      return 'upper';
  }
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const r = await fetch(dataUrl);
  return r.blob();
}

function pickImageUrlFromResult(data: unknown): string | null {
  if (!data) return null;
  // Gradio commonly returns array OR object with url/path/value.
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

export interface RunResult {
  imageUrl: string;
  raw: unknown;
}

function isResolveError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /could not resolve app|unable to fetch app config|space (?:is sleeping|not found)|destructure property ['"]?config['"]?/i.test(msg);
}

function connectWithTimeout(
  spaceId: string,
  options: any,
  timeoutMs: number,
): Promise<any> {
  return Promise.race([
    Client.connect(spaceId, options),
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `連接 ${spaceId} 逾時（${Math.round(timeoutMs / 1000)} 秒）。可能原因：Space 在睡眠／需要 HuggingFace 帳號授權／CORS 阻擋。`,
            ),
          ),
        timeoutMs,
      ),
    ),
  ]);
}

export async function runVirtualTryOn(
  personImageDataUrl: string,
  garmentImageDataUrl: string,
  opts: RunOptions,
): Promise<RunResult> {
  const { onStatus } = opts;
  // Single attempt with timeout — no auto-fallback chain because trying 7
  // sleeping Spaces in sequence would block the user for 5+ minutes.
  // Users switch Spaces manually via the picker.
  onStatus?.('connect', `連接 ${opts.spaceId}…`);
  try {
    return await runOneSpace(personImageDataUrl, garmentImageDataUrl, opts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isResolveError(err) || /timeout|逾時/i.test(msg)) {
      throw new Error(
        `${msg}\n\n💡 建議：\n` +
          '1. 點上方「🤗 模型」chip 切換到其他 Space（例如 Kolors-VTON / CatVTON）\n' +
          '2. 在進階設定貼上你的 HuggingFace Token（在 huggingface.co/settings/tokens 免費申請；許多 Space 在 2026 起需登入才有 GPU 額度）\n' +
          '3. 改用 Puter Nano Banana（每日有額度限制）',
      );
    }
    throw err;
  }
}

async function runOneSpace(
  personImageDataUrl: string,
  garmentImageDataUrl: string,
  opts: RunOptions,
): Promise<RunResult> {
  const { onStatus } = opts;
  const client = await connectWithTimeout(
    opts.spaceId,
    {
      token: (opts.hfToken as `hf_${string}` | undefined) || undefined,
      status_callback: (status: any) => {
        const s = status?.status || 'connecting';
        const detail = status?.detail || '';
        onStatus?.('connect', `Space 狀態：${s}${detail ? ` (${detail})` : ''}`);
      },
    },
    60_000,
  );

  onStatus?.('queue', '上傳影像並排隊…');
  const personBlob = await dataUrlToBlob(personImageDataUrl);
  const garmentBlob = await dataUrlToBlob(garmentImageDataUrl);
  const personFile = handle_file(personBlob);
  const garmentFile = handle_file(garmentBlob);
  const clothType = mapCategoryToClothType(opts.category);

  const endpoint = opts.endpoint || DEFAULT_CONFIG.endpoint!;

  // Look up the preset that matches this Space so we know the exact
  // parameter shape. If it isn't in our catalogue we fall back to a small
  // guess-list (legacy behaviour) for forward-compat with custom Spaces.
  const preset = HF_SPACE_PRESETS.find(
    (p) => p.spaceId === opts.spaceId && p.endpoint === endpoint,
  );

  const attempts: Array<() => Promise<unknown>> = preset?.buildPayload
    ? [() => client.predict(endpoint, preset.buildPayload!(personFile, garmentFile, opts.category))]
    : [
        () => client.predict(endpoint, { person_image: personFile, cloth_image: garmentFile, cloth_type: clothType }),
        () => client.predict(endpoint, [personFile, garmentFile, clothType]),
        () => client.predict(endpoint, [personFile, garmentFile]),
        () => client.predict(endpoint, { person_img: personFile, garment_img: garmentFile }),
      ];

  onStatus?.('processing', 'AI 推論中（30–90 秒）…');
  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      const result = await attempt();
      const data = (result as any).data ?? result;
      const url = pickImageUrlFromResult(data);
      if (!url) {
        lastError = new Error('Space 回傳格式無法解析');
        continue;
      }
      onStatus?.('done', '完成');
      return { imageUrl: url, raw: data };
    } catch (err) {
      lastError = err;
      // try next signature
    }
  }
  throw lastError ?? new Error('AI 試穿失敗');
}

const STORAGE_KEY = 'pw_ai_config';

export function loadAIConfig(): AITryOnConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_CONFIG;
}

export function saveAIConfig(cfg: AITryOnConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

const CONSENT_KEY = 'pw_ai_consent';
export function hasConsent() {
  return localStorage.getItem(CONSENT_KEY) === '1';
}
export function grantConsent() {
  localStorage.setItem(CONSENT_KEY, '1');
}
