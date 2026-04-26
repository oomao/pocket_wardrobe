export type Gender = 'male' | 'female';
export type AvatarMode = 'default' | 'photo';

export interface UserProfile {
  gender: Gender;
  heightCm: number;
  weightKg: number;
  avatarMode: AvatarMode;
  photoBase64?: string;
}

// Two-point anchors used to align a garment to body landmarks during try-on.
// Coordinates are normalized 0..1 of the garment image dimensions.
// - 上衣/外套/連身: leftAnchor = left shoulder seam, rightAnchor = right shoulder seam
// - 下著:            leftAnchor = left waist,        rightAnchor = right waist
// - 鞋子:            leftAnchor = left shoe top,     rightAnchor = right shoe top
// - 配件:            (anchors not used; clothing centered manually)
export interface ClothingAnchors {
  left: { x: number; y: number };
  right: { x: number; y: number };
}

export interface Clothing {
  id: string;
  name: string;
  imageBase64: string;
  category: string;
  createdAt: number;
  anchors?: ClothingAnchors;
}

// Default normalized anchor positions, used to seed AnchorPicker before the
// user drags. Tuned per category: shoulders sit higher and wider on tops.
export function defaultAnchorsForCategory(category: string): ClothingAnchors {
  if (category === '下著') {
    return { left: { x: 0.18, y: 0.08 }, right: { x: 0.82, y: 0.08 } };
  }
  if (category === '鞋子') {
    return { left: { x: 0.30, y: 0.20 }, right: { x: 0.70, y: 0.20 } };
  }
  // 上衣 / 外套 / 連身
  return { left: { x: 0.18, y: 0.18 }, right: { x: 0.82, y: 0.18 } };
}

// Layering priority on the try-on canvas: lower number = drawn first (back).
// Used so that adding an outer 外套 to an existing 上衣 automatically lands
// on top of the shirt, etc. — without the user having to fiddle with the
// 上移/下移一層 buttons.
export const CATEGORY_Z_ORDER: Record<string, number> = {
  鞋子: 1,
  下著: 2,
  連身: 2,
  上衣: 3,
  外套: 4,
  配件: 5,
};

export const ANCHORS_USED_BY_CATEGORY: Record<string, boolean> = {
  上衣: true,
  外套: true,
  連身: true,
  下著: true,
  鞋子: true,
  配件: false,
};

// Map category -> body landmarks (MediaPipe Pose indices) the anchors map onto.
// IMPORTANT: keys here use *image-side* convention (left = visually-left side
// of the photo). MediaPipe's LEFT_SHOULDER (idx 11) is the *wearer's* left,
// which appears on the visual RIGHT of the photo. So we deliberately swap.
export const CATEGORY_BODY_LANDMARKS: Record<string, { left: number; right: number } | null> = {
  上衣: { left: 12, right: 11 }, // image-left = wearer's right shoulder (MP idx 12)
  外套: { left: 12, right: 11 },
  連身: { left: 12, right: 11 },
  下著: { left: 24, right: 23 }, // image-left = wearer's right hip (MP idx 24)
  鞋子: { left: 28, right: 27 }, // image-left = wearer's right ankle (MP idx 28)
  配件: null,
};

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
// Two-point body landmarks on the default mannequin SVG (viewBox 200×500).
// Used when there is no MediaPipe pose detection (i.e. default avatar mode)
// so smart-fit affine still works.
export const MANNEQUIN_LANDMARKS: Record<string, { left: { x: number; y: number }; right: { x: number; y: number } }> = {
  shoulders: { left: { x: 54, y: 112 }, right: { x: 146, y: 112 } },
  hips:      { left: { x: 64, y: 318 }, right: { x: 136, y: 318 } },
  ankles:    { left: { x: 80, y: 422 }, right: { x: 120, y: 422 } },
};

export function landmarksForCategory(category: string) {
  if (category === '下著') return MANNEQUIN_LANDMARKS.hips;
  if (category === '鞋子') return MANNEQUIN_LANDMARKS.ankles;
  return MANNEQUIN_LANDMARKS.shoulders;
}

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
