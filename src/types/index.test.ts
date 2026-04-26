import { describe, expect, it } from 'vitest';
import {
  costPerWear,
  defaultAnchorsForCategory,
  landmarksForCategory,
  profileToScales,
  ANCHORS_USED_BY_CATEGORY,
  CATEGORY_PLACEMENT,
  CATEGORY_Z_ORDER,
  CANVAS_BACKGROUNDS,
  DEFAULT_BACKGROUND_ID,
} from './index';
import type { Clothing } from './index';

const baseClothing: Clothing = {
  id: 'x',
  name: 't',
  imageBase64: '',
  category: '上衣',
  createdAt: 0,
};

describe('costPerWear', () => {
  it('returns null when missing price or wearCount', () => {
    expect(costPerWear(baseClothing)).toBeNull();
    expect(costPerWear({ ...baseClothing, price: 100 })).toBeNull();
    expect(costPerWear({ ...baseClothing, wearCount: 0, price: 100 })).toBeNull();
  });
  it('returns price / wearCount when both present', () => {
    expect(costPerWear({ ...baseClothing, price: 1000, wearCount: 5 })).toBe(200);
  });
});

describe('profileToScales', () => {
  it('returns 1,1 at the baseline 170 cm / 60 kg', () => {
    const s = profileToScales({ gender: 'male', heightCm: 170, weightKg: 60, avatarMode: 'default' });
    expect(s.scaleX).toBeCloseTo(1, 5);
    expect(s.scaleY).toBeCloseTo(1, 5);
  });
  it('grows scaleY with height', () => {
    const s = profileToScales({ gender: 'male', heightCm: 187, weightKg: 60, avatarMode: 'default' });
    expect(s.scaleY).toBeGreaterThan(1);
  });
  it('grows scaleX more slowly with weight (square root dampening)', () => {
    const s = profileToScales({ gender: 'male', heightCm: 170, weightKg: 80, avatarMode: 'default' });
    // sqrt(80/60 / (170/170)) ≈ sqrt(1.333) ≈ 1.155
    expect(s.scaleX).toBeCloseTo(Math.sqrt(80 / 60), 3);
  });
});

describe('defaultAnchorsForCategory', () => {
  it('uses higher seed positions for tops (shoulders)', () => {
    expect(defaultAnchorsForCategory('上衣').left.y).toBeLessThan(0.3);
    expect(defaultAnchorsForCategory('外套').left.y).toBeLessThan(0.3);
  });
  it('uses very-top y for trousers waist line', () => {
    expect(defaultAnchorsForCategory('下著').left.y).toBeLessThan(0.15);
  });
  it('shoes anchor sits a bit lower', () => {
    expect(defaultAnchorsForCategory('鞋子').left.y).toBeGreaterThan(0.15);
  });
  it('left anchor x is on the left, right is on the right (image-side convention)', () => {
    const a = defaultAnchorsForCategory('上衣');
    expect(a.left.x).toBeLessThan(a.right.x);
  });
});

describe('landmarksForCategory (mannequin)', () => {
  it('returns shoulders for tops', () => {
    expect(landmarksForCategory('上衣')).toBe(landmarksForCategory('外套'));
  });
  it('returns hips for 下著', () => {
    const hips = landmarksForCategory('下著');
    expect(hips.left.y).toBeGreaterThan(landmarksForCategory('上衣').left.y);
  });
  it('returns ankles for 鞋子', () => {
    const ankles = landmarksForCategory('鞋子');
    expect(ankles.left.y).toBeGreaterThan(landmarksForCategory('下著').left.y);
  });
  it('left.x is less than right.x for all (image-left side first)', () => {
    for (const cat of ['上衣', '下著', '鞋子']) {
      const lm = landmarksForCategory(cat);
      expect(lm.left.x).toBeLessThan(lm.right.x);
    }
  });
});

describe('Z-order layering', () => {
  it('shoes go below pants which go below tops which go below jackets', () => {
    expect(CATEGORY_Z_ORDER['鞋子']).toBeLessThan(CATEGORY_Z_ORDER['下著']);
    expect(CATEGORY_Z_ORDER['下著']).toBeLessThan(CATEGORY_Z_ORDER['上衣']);
    expect(CATEGORY_Z_ORDER['上衣']).toBeLessThan(CATEGORY_Z_ORDER['外套']);
  });
});

describe('Anchors usage by category', () => {
  it('clothing categories use anchors', () => {
    expect(ANCHORS_USED_BY_CATEGORY['上衣']).toBe(true);
    expect(ANCHORS_USED_BY_CATEGORY['下著']).toBe(true);
  });
  it('accessories opt out (free placement)', () => {
    expect(ANCHORS_USED_BY_CATEGORY['配件']).toBe(false);
  });
});

describe('Category placement boxes', () => {
  it('tops sit above hips', () => {
    expect(CATEGORY_PLACEMENT['上衣'].bottomY).toBeLessThan(CATEGORY_PLACEMENT['下著'].topY + 50);
  });
  it('shoes sit at the bottom', () => {
    expect(CATEGORY_PLACEMENT['鞋子'].topY).toBeGreaterThan(CATEGORY_PLACEMENT['下著'].topY);
  });
});

describe('Canvas backgrounds', () => {
  it('default exists in the catalogue', () => {
    expect(CANVAS_BACKGROUNDS.find((b) => b.id === DEFAULT_BACKGROUND_ID)).toBeTruthy();
  });
  it('all entries have label and css', () => {
    for (const b of CANVAS_BACKGROUNDS) {
      expect(b.id).toBeTruthy();
      expect(b.label).toBeTruthy();
      expect(b.css).toBeTruthy();
    }
  });
});
