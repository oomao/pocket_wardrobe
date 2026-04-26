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

export const DEFAULT_CONFIG: AITryOnConfig = {
  spaceId: 'Kwai-Kolors/Kolors-Virtual-Try-On',
  endpoint: '/tryon',
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

export async function runVirtualTryOn(
  personImageDataUrl: string,
  garmentImageDataUrl: string,
  opts: RunOptions,
): Promise<RunResult> {
  const { onStatus } = opts;
  onStatus?.('connect', `連接 ${opts.spaceId}…`);

  const client = await Client.connect(opts.spaceId, {
    token: (opts.hfToken as `hf_${string}` | undefined) || undefined,
  });

  onStatus?.('queue', '上傳影像並排隊…');
  const personBlob = await dataUrlToBlob(personImageDataUrl);
  const garmentBlob = await dataUrlToBlob(garmentImageDataUrl);
  const personFile = handle_file(personBlob);
  const garmentFile = handle_file(garmentBlob);
  const clothType = mapCategoryToClothType(opts.category);

  const endpoint = opts.endpoint || DEFAULT_CONFIG.endpoint!;

  // We try the most common parameter shapes in turn. First success wins.
  const attempts: Array<() => Promise<unknown>> = [
    // a) named: person_image, cloth_image, cloth_type
    () =>
      client.predict(endpoint, {
        person_image: personFile,
        cloth_image: garmentFile,
        cloth_type: clothType,
      }),
    // b) positional with cloth type
    () => client.predict(endpoint, [personFile, garmentFile, clothType]),
    // c) positional, two images only
    () => client.predict(endpoint, [personFile, garmentFile]),
    // d) Kolors-style (person_img, garment_img, seed, …)
    () =>
      client.predict(endpoint, {
        person_img: personFile,
        garment_img: garmentFile,
      }),
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
