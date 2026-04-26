import localforage from 'localforage';
import { v4 as uuid } from 'uuid';
import {
  Clothing,
  Outfit,
  Style,
  UserProfile,
  WearLog,
  DEFAULT_CATEGORIES,
  DEFAULT_PROFILE,
} from '../types';

const KEY_PROFILE = 'user_profile';
const KEY_CATEGORIES = 'categories';
const KEY_CLOTHES = 'clothes';
const KEY_OUTFITS = 'outfits';
const KEY_STYLES = 'styles';
const KEY_WEAR_LOGS = 'wear_logs';

localforage.config({
  name: 'pocket_wardrobe',
  storeName: 'wardrobe',
  description: 'Smart Wardrobe local data',
});

export async function initDB(): Promise<void> {
  const profileRaw = await localforage.getItem<any>(KEY_PROFILE);
  if (!profileRaw) {
    await localforage.setItem(KEY_PROFILE, DEFAULT_PROFILE);
  } else {
    let migrated = profileRaw as Partial<UserProfile> & Record<string, any>;
    let dirty = false;
    if (migrated.heightCm === undefined || migrated.weightKg === undefined) {
      migrated = {
        ...migrated,
        heightCm: Math.round(170 * (profileRaw.heightScale ?? 1)),
        weightKg: Math.round(60 * (profileRaw.weightScale ?? 1)),
      };
      dirty = true;
    }
    if (!migrated.avatarMode) {
      migrated.avatarMode = 'default';
      dirty = true;
    }
    if (dirty) {
      await localforage.setItem(KEY_PROFILE, {
        gender: migrated.gender ?? 'male',
        heightCm: migrated.heightCm!,
        weightKg: migrated.weightKg!,
        avatarMode: migrated.avatarMode!,
        photoBase64: migrated.photoBase64,
      } as UserProfile);
    }
  }
  const cats = await localforage.getItem<string[]>(KEY_CATEGORIES);
  if (!cats) {
    await localforage.setItem(KEY_CATEGORIES, DEFAULT_CATEGORIES);
  }
  const clothes = await localforage.getItem<Clothing[]>(KEY_CLOTHES);
  if (!clothes) {
    await localforage.setItem(KEY_CLOTHES, []);
  }
  const outfits = await localforage.getItem<Outfit[]>(KEY_OUTFITS);
  if (!outfits) {
    await localforage.setItem(KEY_OUTFITS, []);
  }
  const styles = await localforage.getItem<Style[]>(KEY_STYLES);
  if (!styles) {
    await localforage.setItem(KEY_STYLES, []);
  }
  const logs = await localforage.getItem<WearLog[]>(KEY_WEAR_LOGS);
  if (!logs) {
    await localforage.setItem(KEY_WEAR_LOGS, []);
  }
}

export async function getUserProfile(): Promise<UserProfile> {
  return (await localforage.getItem<UserProfile>(KEY_PROFILE)) ?? DEFAULT_PROFILE;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await localforage.setItem(KEY_PROFILE, profile);
}

export async function getCategories(): Promise<string[]> {
  return (await localforage.getItem<string[]>(KEY_CATEGORIES)) ?? [...DEFAULT_CATEGORIES];
}

export async function saveCategories(categories: string[]): Promise<void> {
  await localforage.setItem(KEY_CATEGORIES, categories);
}

export async function getAllClothing(): Promise<Clothing[]> {
  return (await localforage.getItem<Clothing[]>(KEY_CLOTHES)) ?? [];
}

export async function getClothingById(id: string): Promise<Clothing | undefined> {
  const all = await getAllClothing();
  return all.find((c) => c.id === id);
}

export async function saveClothing(
  data: Omit<Clothing, 'id' | 'createdAt'>,
): Promise<Clothing> {
  const all = await getAllClothing();
  const item: Clothing = { ...data, id: uuid(), createdAt: Date.now() };
  all.push(item);
  await localforage.setItem(KEY_CLOTHES, all);
  return item;
}

export async function updateClothing(
  id: string,
  patch: Partial<Omit<Clothing, 'id' | 'createdAt'>>,
): Promise<Clothing | undefined> {
  const all = await getAllClothing();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  const next = { ...all[idx], ...patch };
  all[idx] = next;
  await localforage.setItem(KEY_CLOTHES, all);
  return next;
}

export async function incrementWearCounts(clothingIds: string[]): Promise<void> {
  if (clothingIds.length === 0) return;
  const all = await getAllClothing();
  const ids = new Set(clothingIds);
  let dirty = false;
  for (const c of all) {
    if (ids.has(c.id)) {
      c.wearCount = (c.wearCount ?? 0) + 1;
      dirty = true;
    }
  }
  if (dirty) await localforage.setItem(KEY_CLOTHES, all);
}

export async function deleteClothing(id: string): Promise<boolean> {
  const all = await getAllClothing();
  const next = all.filter((c) => c.id !== id);
  await localforage.setItem(KEY_CLOTHES, next);
  return next.length !== all.length;
}

export async function countClothingByCategory(category: string): Promise<number> {
  const all = await getAllClothing();
  return all.filter((c) => c.category === category).length;
}

export async function getAllOutfits(): Promise<Outfit[]> {
  return (await localforage.getItem<Outfit[]>(KEY_OUTFITS)) ?? [];
}

export async function getOutfitById(id: string): Promise<Outfit | undefined> {
  const all = await getAllOutfits();
  return all.find((o) => o.id === id);
}

export async function saveOutfit(
  data: Omit<Outfit, 'id' | 'createdAt'>,
): Promise<Outfit> {
  const all = await getAllOutfits();
  const item: Outfit = { ...data, id: uuid(), createdAt: Date.now() };
  all.push(item);
  await localforage.setItem(KEY_OUTFITS, all);
  return item;
}

export async function deleteOutfit(id: string): Promise<boolean> {
  const all = await getAllOutfits();
  const next = all.filter((o) => o.id !== id);
  await localforage.setItem(KEY_OUTFITS, next);
  return next.length !== all.length;
}

// ─── Styles (flat-lay) ───────────────────────────────────────────────────────

export async function getAllStyles(): Promise<Style[]> {
  return (await localforage.getItem<Style[]>(KEY_STYLES)) ?? [];
}

export async function getStyleById(id: string): Promise<Style | undefined> {
  const all = await getAllStyles();
  return all.find((s) => s.id === id);
}

export async function saveStyle(
  data: Omit<Style, 'id' | 'createdAt'>,
): Promise<Style> {
  const all = await getAllStyles();
  const item: Style = { ...data, id: uuid(), createdAt: Date.now() };
  all.push(item);
  await localforage.setItem(KEY_STYLES, all);
  return item;
}

export async function updateStyle(
  id: string,
  patch: Partial<Omit<Style, 'id' | 'createdAt'>>,
): Promise<Style | undefined> {
  const all = await getAllStyles();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;
  const next: Style = { ...all[idx], ...patch };
  all[idx] = next;
  await localforage.setItem(KEY_STYLES, all);
  return next;
}

export async function deleteStyle(id: string): Promise<boolean> {
  const all = await getAllStyles();
  const next = all.filter((s) => s.id !== id);
  await localforage.setItem(KEY_STYLES, next);
  return next.length !== all.length;
}

// ─── Wear logs ───────────────────────────────────────────────────────────────

export function todayString(): string {
  // Local-time YYYY-MM-DD
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function getAllWearLogs(): Promise<WearLog[]> {
  return (await localforage.getItem<WearLog[]>(KEY_WEAR_LOGS)) ?? [];
}

export async function getWearLogsByDate(date: string): Promise<WearLog[]> {
  const all = await getAllWearLogs();
  return all.filter((l) => l.date === date);
}

export async function addWearLog(
  data: Omit<WearLog, 'id' | 'createdAt'>,
): Promise<WearLog> {
  const all = await getAllWearLogs();
  const item: WearLog = { ...data, id: uuid(), createdAt: Date.now() };
  all.push(item);
  await localforage.setItem(KEY_WEAR_LOGS, all);
  return item;
}

export async function deleteWearLog(id: string): Promise<boolean> {
  const all = await getAllWearLogs();
  const next = all.filter((l) => l.id !== id);
  await localforage.setItem(KEY_WEAR_LOGS, next);
  return next.length !== all.length;
}

// Convenience: log today's wear of a set of clothes (also bumps wearCount).
export async function logWearToday(
  clotheIds: string[],
  opts: { outfitId?: string; styleId?: string; note?: string } = {},
): Promise<void> {
  if (clotheIds.length === 0) return;
  await addWearLog({
    date: todayString(),
    clotheIds,
    outfitId: opts.outfitId,
    styleId: opts.styleId,
    note: opts.note,
  });
  await incrementWearCounts(clotheIds);
}
