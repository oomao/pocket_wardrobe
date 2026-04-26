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
