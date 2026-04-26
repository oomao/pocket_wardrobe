export type Gender = 'male' | 'female';

export interface UserProfile {
  gender: Gender;
  heightCm: number;
  weightKg: number;
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

// Reference body used when computing how much the avatar SVG should be scaled.
export const BASE_HEIGHT_CM = 170;
export const BASE_WEIGHT_KG = 60;

export const HEIGHT_RANGE = { min: 140, max: 200, step: 1 };
export const WEIGHT_RANGE = { min: 35, max: 120, step: 1 };

export const DEFAULT_PROFILE: UserProfile = {
  gender: 'male',
  heightCm: BASE_HEIGHT_CM,
  weightKg: BASE_WEIGHT_KG,
};

// Convert real height/weight into avatar SVG transform scales.
// Width (weight) is dampened so that the avatar doesn't get cartoonishly wide.
export function profileToScales(profile: UserProfile): { scaleX: number; scaleY: number } {
  const heightRatio = profile.heightCm / BASE_HEIGHT_CM;
  const weightRatio = profile.weightKg / BASE_WEIGHT_KG;
  // weight contributes via square-root → keeps proportions believable
  const widthFactor = Math.sqrt(weightRatio / heightRatio);
  return {
    scaleX: widthFactor,
    scaleY: heightRatio,
  };
}
