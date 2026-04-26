export type Gender = 'male' | 'female';

export interface UserProfile {
  gender: Gender;
  heightScale: number;
  weightScale: number;
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

export const DEFAULT_PROFILE: UserProfile = {
  gender: 'male',
  heightScale: 1.0,
  weightScale: 1.0,
};
