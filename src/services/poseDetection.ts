// Lazy MediaPipe Pose Landmarker wrapper with module-level caching.
// First call downloads the WASM (~1.5MB) and the lite pose model (~5MB).

import type { PoseLandmarker as PoseLandmarkerType, NormalizedLandmark } from '@mediapipe/tasks-vision';

let landmarkerPromise: Promise<PoseLandmarkerType> | null = null;
const detectionCache = new Map<string, NormalizedLandmark[] | null>();

async function getLandmarker(): Promise<PoseLandmarkerType> {
  if (landmarkerPromise) return landmarkerPromise;
  landmarkerPromise = (async () => {
    const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm',
    );
    return PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      numPoses: 1,
      minPoseDetectionConfidence: 0.4,
    });
  })();
  return landmarkerPromise;
}

export async function detectPose(
  imageSrc: string,
): Promise<NormalizedLandmark[] | null> {
  if (detectionCache.has(imageSrc)) return detectionCache.get(imageSrc) ?? null;

  const img = await loadImage(imageSrc);
  const landmarker = await getLandmarker();
  const result = landmarker.detect(img);
  const landmarks = result.landmarks?.[0] ?? null;
  detectionCache.set(imageSrc, landmarks);
  return landmarks;
}

export function clearPoseCacheFor(imageSrc: string) {
  detectionCache.delete(imageSrc);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Re-export for convenient typing in callers.
export type { NormalizedLandmark };
