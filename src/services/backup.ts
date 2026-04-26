// Local ZIP backup / restore for the entire wardrobe.
// Images that come in as data URLs are extracted into separate PNG files
// inside the zip (under images/clothes/, images/styles/, images/profile)
// so the archive is reasonably compact and human-browsable.

import JSZip from 'jszip';
import localforage from 'localforage';
import {
  Clothing,
  Outfit,
  Style,
  UserProfile,
  WearLog,
} from '../types';

const KEY_PROFILE = 'user_profile';
const KEY_CATEGORIES = 'categories';
const KEY_CLOTHES = 'clothes';
const KEY_OUTFITS = 'outfits';
const KEY_STYLES = 'styles';
const KEY_WEAR_LOGS = 'wear_logs';

interface Manifest {
  version: 1;
  exportedAt: number;
  profile: UserProfile;
  categories: string[];
  clothes: Array<Omit<Clothing, 'imageBase64'> & { imageFile: string }>;
  outfits: Outfit[];
  styles: Array<Omit<Style, 'thumbnail'> & { thumbnailFile?: string }>;
  wearLogs: WearLog[];
  profilePhotoFile?: string;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function exportToZip(): Promise<Blob> {
  const [profile, categories, clothes, outfits, styles, wearLogs] = await Promise.all([
    localforage.getItem<UserProfile>(KEY_PROFILE),
    localforage.getItem<string[]>(KEY_CATEGORIES),
    localforage.getItem<Clothing[]>(KEY_CLOTHES),
    localforage.getItem<Outfit[]>(KEY_OUTFITS),
    localforage.getItem<Style[]>(KEY_STYLES),
    localforage.getItem<WearLog[]>(KEY_WEAR_LOGS),
  ]);

  const zip = new JSZip();
  const images = zip.folder('images');
  const clothesImgs = images!.folder('clothes')!;
  const stylesImgs = images!.folder('styles')!;

  const manifestClothes: Manifest['clothes'] = [];
  for (const c of clothes ?? []) {
    const fileName = `${c.id}.png`;
    if (c.imageBase64) {
      const blob = await dataUrlToBlob(c.imageBase64);
      clothesImgs.file(fileName, blob);
    }
    const { imageBase64, ...rest } = c;
    manifestClothes.push({ ...rest, imageFile: fileName });
  }

  const manifestStyles: Manifest['styles'] = [];
  for (const s of styles ?? []) {
    let thumbName: string | undefined;
    if (s.thumbnail) {
      thumbName = `${s.id}.jpg`;
      const blob = await dataUrlToBlob(s.thumbnail);
      stylesImgs.file(thumbName, blob);
    }
    const { thumbnail, ...rest } = s;
    manifestStyles.push({ ...rest, thumbnailFile: thumbName });
  }

  // Profile photo (if any) goes alongside
  let profilePhotoFile: string | undefined;
  if (profile?.photoBase64) {
    profilePhotoFile = 'profile.png';
    const blob = await dataUrlToBlob(profile.photoBase64);
    images!.file(profilePhotoFile, blob);
  }

  const manifestProfile: UserProfile = profile
    ? { ...profile, photoBase64: profile.photoBase64 ? undefined : profile.photoBase64 }
    : { gender: 'male', heightCm: 170, weightKg: 60, avatarMode: 'default' };

  const manifest: Manifest = {
    version: 1,
    exportedAt: Date.now(),
    profile: manifestProfile,
    categories: categories ?? [],
    clothes: manifestClothes,
    outfits: outfits ?? [],
    styles: manifestStyles,
    wearLogs: wearLogs ?? [],
    profilePhotoFile,
  };

  zip.file('wardrobe.json', JSON.stringify(manifest, null, 2));

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export interface ImportSummary {
  clothes: number;
  outfits: number;
  styles: number;
  wearLogs: number;
}

export async function importFromZip(file: Blob): Promise<ImportSummary> {
  const zip = await JSZip.loadAsync(file);
  const manifestText = await zip.file('wardrobe.json')?.async('string');
  if (!manifestText) throw new Error('壓縮檔內缺少 wardrobe.json');
  const manifest: Manifest = JSON.parse(manifestText);

  // JSZip's blob extraction returns Blob with no MIME type, which causes
  // FileReader to spit out 'data:application/octet-stream;base64,…'. Wrap
  // each blob with the right type so the dataURL prefix is correct.
  async function readZipBlob(path: string, mime: string): Promise<string | undefined> {
    const file = zip.file(path);
    if (!file) return undefined;
    const buffer = await file.async('arraybuffer');
    const blob = new Blob([buffer], { type: mime });
    return blobToDataUrl(blob);
  }

  const clothes: Clothing[] = [];
  for (const c of manifest.clothes) {
    const imageBase64 =
      (await readZipBlob(`images/clothes/${c.imageFile}`, 'image/png')) ?? '';
    const { imageFile, ...rest } = c;
    clothes.push({ ...rest, imageBase64 } as Clothing);
  }

  const styles: Style[] = [];
  for (const s of manifest.styles) {
    let thumbnail: string | undefined;
    if (s.thumbnailFile) {
      thumbnail = await readZipBlob(`images/styles/${s.thumbnailFile}`, 'image/jpeg');
    }
    const { thumbnailFile, ...rest } = s;
    styles.push({ ...rest, thumbnail } as Style);
  }

  const profile: UserProfile = { ...manifest.profile };
  if (manifest.profilePhotoFile) {
    profile.photoBase64 = await readZipBlob(
      `images/${manifest.profilePhotoFile}`,
      'image/png',
    );
  }

  await Promise.all([
    localforage.setItem(KEY_PROFILE, profile),
    localforage.setItem(KEY_CATEGORIES, manifest.categories),
    localforage.setItem(KEY_CLOTHES, clothes),
    localforage.setItem(KEY_OUTFITS, manifest.outfits),
    localforage.setItem(KEY_STYLES, styles),
    localforage.setItem(KEY_WEAR_LOGS, manifest.wearLogs),
  ]);

  return {
    clothes: clothes.length,
    outfits: manifest.outfits.length,
    styles: styles.length,
    wearLogs: manifest.wearLogs.length,
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
