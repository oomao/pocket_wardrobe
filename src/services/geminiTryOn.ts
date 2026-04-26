// Virtual try-on via Google Gemini 2.5 Flash Image ("Nano Banana").
// Free with a personal Google AI Studio API key (https://aistudio.google.com/apikey).
// The model is Google's state-of-the-art multimodal image editor — the same
// generation family that powers Google Shopping's AI try-on, so quality is
// dramatically higher than open-source VTON models.

import { GoogleGenAI } from '@google/genai';

const MODEL_ID = 'gemini-2.5-flash-image';

export interface GeminiTryOnInput {
  apiKey: string;
  personImageDataUrl: string;
  garmentImageDataUrl: string;
  garmentCategory: string;
  garmentName?: string;
  onStatus?: (msg: string) => void;
}

export interface GeminiTryOnResult {
  imageDataUrl: string;
  textNotes?: string;
}

function dataUrlParts(dataUrl: string): { mimeType: string; data: string } {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error('Image data URL invalid (expected base64).');
  return { mimeType: m[1], data: m[2] };
}

function buildPrompt(category: string, garmentName?: string): string {
  const namePart = garmentName ? `「${garmentName}」` : '';
  const focus = (() => {
    switch (category) {
      case '上衣':
      case '外套':
        return `Replace ONLY the upper-body clothing with the garment from the second image (a ${category} top). Keep the person's face, hair, body pose, lower-body clothing, hands, background and lighting EXACTLY the same.`;
      case '下著':
        return `Replace ONLY the lower-body clothing with the bottoms from the second image. Keep the person's face, hair, body pose, upper-body clothing, footwear and background EXACTLY the same.`;
      case '連身':
        return `Replace the person's entire outfit with the dress/jumpsuit from the second image. Keep the person's face, hair, body pose, footwear and background EXACTLY the same.`;
      case '鞋子':
        return `Replace ONLY the footwear with the shoes from the second image. Keep everything else EXACTLY the same.`;
      case '配件':
        return `Add the accessory from the second image to the person in a natural position (e.g. bag held, hat worn, scarf around neck). Keep everything else EXACTLY the same.`;
      default:
        return `Place the garment from the second image onto the person from the first image, preserving their pose, face and background.`;
    }
  })();

  return [
    `Photorealistic virtual try-on task.`,
    `Image 1 = the customer (full body photo).`,
    `Image 2 = the garment ${namePart}laid flat / on a hanger.`,
    focus,
    `The garment must drape naturally with realistic folds, shading and shadows that match the lighting of the original photo. The result should look like a single, real photograph of the customer wearing the garment — not a collage.`,
    `Output: a single edited image. Do not add text, captions, watermarks, or extra people.`,
  ].join(' ');
}

export async function runGeminiTryOn(input: GeminiTryOnInput): Promise<GeminiTryOnResult> {
  const { apiKey, personImageDataUrl, garmentImageDataUrl, garmentCategory, garmentName, onStatus } = input;
  if (!apiKey) throw new Error('Gemini API key 尚未設定');
  onStatus?.('連線 Gemini 2.5 Flash Image…');

  const ai = new GoogleGenAI({ apiKey });
  const person = dataUrlParts(personImageDataUrl);
  const garment = dataUrlParts(garmentImageDataUrl);
  const prompt = buildPrompt(garmentCategory, garmentName);

  onStatus?.('AI 推論中（5–15 秒）…');

  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: person.mimeType, data: person.data } },
          { inlineData: { mimeType: garment.mimeType, data: garment.data } },
        ],
      },
    ],
  });

  const candidates = response.candidates ?? [];
  if (!candidates.length) throw new Error('Gemini 沒有回傳結果（可能被安全過濾，請換照片再試）');

  const parts = candidates[0]?.content?.parts ?? [];
  let imageDataUrl: string | null = null;
  let textNotes = '';
  for (const part of parts) {
    if ((part as any).inlineData?.data) {
      const inline = (part as any).inlineData;
      imageDataUrl = `data:${inline.mimeType ?? 'image/png'};base64,${inline.data}`;
    } else if ((part as any).text) {
      textNotes += (part as any).text;
    }
  }
  if (!imageDataUrl) {
    throw new Error(`Gemini 沒有回傳圖片。${textNotes ? `回應：${textNotes}` : ''}`);
  }
  onStatus?.('完成');
  return { imageDataUrl, textNotes: textNotes || undefined };
}

const KEY_STORAGE = 'pw_gemini_api_key';
export function loadGeminiKey(): string {
  return localStorage.getItem(KEY_STORAGE) || '';
}
export function saveGeminiKey(key: string): void {
  if (key) localStorage.setItem(KEY_STORAGE, key);
  else localStorage.removeItem(KEY_STORAGE);
}
