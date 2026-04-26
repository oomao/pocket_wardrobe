import { beforeEach, describe, expect, it } from 'vitest';
import localforage from 'localforage';
import {
  addWearLog,
  deleteClothing,
  getAllClothing,
  getAllOutfits,
  getAllStyles,
  getAllWearLogs,
  getCategories,
  getUserProfile,
  incrementWearCounts,
  initDB,
  logWearToday,
  saveClothing,
  saveOutfit,
  saveStyle,
  todayString,
  updateClothing,
} from './storage';
import { DEFAULT_CATEGORIES } from '../types';

beforeEach(async () => {
  await localforage.clear();
  await initDB();
});

describe('initDB', () => {
  it('seeds defaults on first run', async () => {
    expect(await getCategories()).toEqual(DEFAULT_CATEGORIES);
    const profile = await getUserProfile();
    expect(profile.gender).toBe('male');
    expect(profile.heightCm).toBe(170);
    expect(profile.avatarMode).toBe('default');
  });
});

describe('clothing CRUD', () => {
  it('round-trips a clothing item', async () => {
    const created = await saveClothing({
      name: 'Test',
      imageBase64: 'data:image/png;base64,abc',
      category: '上衣',
    });
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBeGreaterThan(0);

    const all = await getAllClothing();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Test');
  });

  it('updateClothing patches existing record', async () => {
    const c = await saveClothing({ name: 'A', imageBase64: '', category: '上衣' });
    const updated = await updateClothing(c.id, { name: 'B', wearCount: 3 });
    expect(updated?.name).toBe('B');
    expect(updated?.wearCount).toBe(3);
    expect((await getAllClothing())[0].name).toBe('B');
  });

  it('deleteClothing removes by id', async () => {
    const c = await saveClothing({ name: 'A', imageBase64: '', category: '上衣' });
    expect(await deleteClothing(c.id)).toBe(true);
    expect(await getAllClothing()).toHaveLength(0);
  });
});

describe('wear tracking', () => {
  it('incrementWearCounts bumps only listed ids', async () => {
    const a = await saveClothing({ name: 'a', imageBase64: '', category: '上衣' });
    const b = await saveClothing({ name: 'b', imageBase64: '', category: '下著' });
    await incrementWearCounts([a.id]);
    const all = await getAllClothing();
    expect(all.find((c) => c.id === a.id)?.wearCount).toBe(1);
    expect(all.find((c) => c.id === b.id)?.wearCount ?? 0).toBe(0);
  });

  it('logWearToday creates a log AND bumps wearCount', async () => {
    const c = await saveClothing({ name: 'a', imageBase64: '', category: '上衣' });
    await logWearToday([c.id], { note: 'meeting' });
    const logs = await getAllWearLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].clotheIds).toEqual([c.id]);
    expect(logs[0].date).toBe(todayString());
    expect((await getAllClothing())[0].wearCount).toBe(1);
  });

  it('addWearLog creates a record with id and createdAt', async () => {
    const log = await addWearLog({ date: '2026-04-26', clotheIds: ['x'] });
    expect(log.id).toBeTruthy();
    expect(log.createdAt).toBeGreaterThan(0);
  });
});

describe('outfit + style stores', () => {
  it('saveOutfit + getAllOutfits round trip', async () => {
    const o = await saveOutfit({ name: 'O', items: [] });
    expect((await getAllOutfits())[0].id).toBe(o.id);
  });
  it('saveStyle + getAllStyles round trip', async () => {
    const s = await saveStyle({ name: 'S', backgroundId: 'studio', items: [] });
    expect((await getAllStyles())[0].id).toBe(s.id);
  });
});

describe('todayString', () => {
  it('returns local YYYY-MM-DD format', () => {
    const today = todayString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
