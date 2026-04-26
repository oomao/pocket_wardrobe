export type Gender = 'male' | 'female';
export type AvatarMode = 'default' | 'photo';

export interface UserProfile {
  gender: Gender;
  heightCm: number;
  weightKg: number;
  avatarMode: AvatarMode;
  photoBase64?: string;
}

export interface Clothing {
  id: string;
  name: string;
  imageBase64: string;
  category: string;
  createdAt: number;
}

export interface OutfitItem {
  clotheId: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  zIndex: number;
}

export interface Outfit {
  id: string;
  name: string;
  createdAt: number;
  items: OutfitItem[];
}

export const DEFAULT_CATEGORIES: string[] = ['上衣', '下著', '外套', '連身', '鞋子', '配件'];

export const BASE_HEIGHT_CM = 170;
export const BASE_WEIGHT_KG = 60;

export const HEIGHT_RANGE = { min: 140, max: 200, step: 1 };
export const WEIGHT_RANGE = { min: 35, max: 120, step: 1 };

export const DEFAULT_PROFILE: UserProfile = {
  gender: 'male',
  heightCm: BASE_HEIGHT_CM,
  weightKg: BASE_WEIGHT_KG,
  avatarMode: 'default',
};

export function profileToScales(profile: UserProfile): { scaleX: number; scaleY: number } {
  const heightRatio = profile.heightCm / BASE_HEIGHT_CM;
  const weightRatio = profile.weightKg / BASE_WEIGHT_KG;
  const widthFactor = Math.sqrt(weightRatio / heightRatio);
  return { scaleX: widthFactor, scaleY: heightRatio };
}

// Mannequin SVGs use a 200×500 viewBox. Body landmarks below are in those coords.
export const MANNEQUIN_VIEWBOX = { w: 200, h: 500 };

export interface CategoryBox {
  topY: number;
  bottomY: number;
  leftX: number;
  rightX: number;
}

// Where a piece of clothing of each category should land on the mannequin.
// Coordinates use the SVG viewBox; controller converts to canvas pixels at runtime.
// Coordinates target the new mannequin SVG (legs end ~432, pedestal below).
export const CATEGORY_PLACEMENT: Record<string, CategoryBox> = {
  上衣: { topY: 102, bottomY: 260, leftX: 28, rightX: 172 },
  外套: { topY: 100, bottomY: 295, leftX: 18, rightX: 182 },
  連身: { topY: 102, bottomY: 410, leftX: 28, rightX: 172 },
  下著: { topY: 280, bottomY: 432, leftX: 55, rightX: 145 },
  鞋子: { topY: 412, bottomY: 432, leftX: 60, rightX: 140 },
  配件: { topY: 130, bottomY: 200, leftX: 75, rightX: 125 },
};

export const DEFAULT_PLACEMENT: CategoryBox = {
  topY: 150, bottomY: 300, leftX: 55, rightX: 145,
};
