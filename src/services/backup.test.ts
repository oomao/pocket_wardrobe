import { beforeEach, describe, expect, it } from 'vitest';
import localforage from 'localforage';
import { exportToZip, importFromZip } from './backup';
import {
  addWearLog,
  initDB,
  saveClothing,
  saveOutfit,
  saveStyle,
} from './storage';

// 1×1 transparent PNG data URL
const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

beforeEach(async () => {
  await localforage.clear();
  await initDB();
});

describe('ZIP backup round-trip', () => {
  it('exports then re-imports a populated wardrobe', async () => {
    const c = await saveClothing({
      name: 'White Tee',
      imageBase64: PIXEL,
      category: '上衣',
      color: '#ffffff',
      brand: 'TestCo',
      seasons: ['summer'],
      occasions: ['日常'],
      price: 590,
      purchaseDate: 1700000000000,
      wearCount: 2,
    });
    const o = await saveOutfit({
      name: 'Casual',
      items: [
        {
          clotheId: c.id,
          x: 100,
          y: 200,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          zIndex: 0,
        },
      ],
    });
    const s = await saveStyle({
      name: 'Look',
      backgroundId: 'studio',
      items: [],
      thumbnail: PIXEL,
    });
    await addWearLog({ date: '2026-04-26', clotheIds: [c.id], outfitId: o.id });

    const blob = await exportToZip();
    expect(blob.size).toBeGreaterThan(0);

    // Wipe local state
    await localforage.clear();
    await initDB();

    const summary = await importFromZip(blob);
    expect(summary.clothes).toBe(1);
    expect(summary.outfits).toBe(1);
    expect(summary.styles).toBe(1);
    expect(summary.wearLogs).toBe(1);

    // Spot-check: imported clothing kept its rich attributes
    const clothes = (await localforage.getItem<any[]>('clothes')) ?? [];
    expect(clothes[0].name).toBe('White Tee');
    expect(clothes[0].brand).toBe('TestCo');
    expect(clothes[0].seasons).toEqual(['summer']);
    expect(clothes[0].price).toBe(590);
    expect(clothes[0].imageBase64).toMatch(/^data:image\/png;base64,/);
  });
});
