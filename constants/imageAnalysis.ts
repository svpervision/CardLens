/**
 * imageAnalysis.ts
 *
 * Real heuristics:
 *  - Corner sharpness: crop each corner region from a periodic capture, re-compress
 *    at fixed quality, measure the resulting file size. High-frequency (sharp) content
 *    survives JPEG compression better → larger file = sharper corner.
 *
 * Simulated (placeholder until real CV):
 *  - Live centering: spring-physics random walk. Real detection requires a frame
 *    processor (react-native-vision-camera) which isn't in the managed workflow.
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Dimensions } from 'react-native';
import type { FourCorners, CornerColor } from './cardData';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.82;
const CARD_H = CARD_W * 1.396;
const FRAME_LEFT = (SCREEN_W - CARD_W) / 2;
const FRAME_TOP = (SCREEN_H - CARD_H) / 2;

// ─── Corner sharpness ────────────────────────────────────────────────────────

const CROP_SIZE = 48; // px in photo-space (after resize to 320px wide)

function bytesToColor(bytes: number): CornerColor {
  // Calibrated against a 48×48 crop at compress:0.45 on real card photos.
  // Sharp corner: lots of high-freq content → survives JPEG → larger file.
  if (bytes >= 1600) return 'green';
  if (bytes >= 750)  return 'yellow';
  return 'red';
}

async function analyzeOneCorner(
  uri: string,
  originX: number,
  originY: number,
  photoW: number,
  photoH: number,
): Promise<CornerColor> {
  try {
    const ox = Math.max(0, Math.min(Math.round(originX), photoW - CROP_SIZE));
    const oy = Math.max(0, Math.min(Math.round(originY), photoH - CROP_SIZE));

    const cropped = await ImageManipulator.manipulateAsync(
      uri,
      [{ crop: { originX: ox, originY: oy, width: CROP_SIZE, height: CROP_SIZE } }],
      { compress: 0.45, format: ImageManipulator.SaveFormat.JPEG },
    );

    // expo-file-system gives us a reliable byte count on both iOS and Android
    const info = await FileSystem.getInfoAsync(cropped.uri);
    const bytes = (info as any).size ?? 0;

    return bytesToColor(bytes);
  } catch {
    return 'yellow'; // graceful fallback
  }
}

/**
 * Analyze all four card corners from a periodic capture.
 *
 * Coordinate mapping: the CameraView fills the screen in "cover" mode.
 * In portrait, width is the constraining axis on most phones, so:
 *   scaleX = photoWidth / SCREEN_W  (exact fit)
 *   scaleY = the same scale applied to height; excess is cropped top+bottom
 *
 * We map each screen-space corner of the AR overlay → photo space.
 */
export async function analyzeCardCorners(
  uri: string,
  photoWidth: number,
  photoHeight: number,
): Promise<FourCorners> {
  // Resize to a smaller working image first for speed
  const TARGET_W = 320;
  const resized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: TARGET_W } }],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
  );
  const rW = resized.width;
  const rH = resized.height;

  // Scale factor from screen coords to resized-photo coords
  // Camera covers the screen: scale = rW / SCREEN_W (portrait, width fits exactly)
  const scale = rW / SCREEN_W;
  // Y offset if camera is taller/shorter than the screen fill
  const rawH = SCREEN_H * scale; // how many photo rows map to the visible screen
  const yOff = (rH - rawH) / 2;  // extra rows cropped off top (can be negative = letterbox)

  const px = (sx: number) => sx * scale;
  const py = (sy: number) => yOff + sy * scale;

  const corners: [number, number][] = [
    [px(FRAME_LEFT),             py(FRAME_TOP)],                            // TL
    [px(FRAME_LEFT + CARD_W) - CROP_SIZE, py(FRAME_TOP)],                   // TR
    [px(FRAME_LEFT),             py(FRAME_TOP + CARD_H) - CROP_SIZE],       // BL
    [px(FRAME_LEFT + CARD_W) - CROP_SIZE, py(FRAME_TOP + CARD_H) - CROP_SIZE], // BR
  ];

  const results = await Promise.all(
    corners.map(([ox, oy]) => analyzeOneCorner(resized.uri, ox, oy, rW, rH)),
  );

  return results as FourCorners;
}

/** Map FourCorners to a numeric subgrade (0–10). */
export function cornerColorsToGrade(colors: FourCorners): number {
  const scores = colors.map((c) => (c === 'green' ? 10 : c === 'yellow' ? 8.5 : 7));
  return Math.round((scores.reduce((a, b) => a + b, 0) / 4) * 2) / 2; // round to 0.5
}

// ─── Live centering simulation ────────────────────────────────────────────────
// Spring-physics random walk. Replace with real edge detection once a frame
// processor is available (e.g. react-native-vision-camera + Skia).

class CenteringSimulator {
  private lr = 52.5;
  private tb = 54.0;
  private lrV = 0;
  private tbV = 0;

  tick(): { lr: [number, number]; tb: [number, number] } {
    const SPRING = 0.04;
    const DAMP   = 0.72;
    const NOISE  = 0.55;

    this.lrV = this.lrV * DAMP + (50 - this.lr) * SPRING + (Math.random() - 0.5) * NOISE * 2;
    this.tbV = this.tbV * DAMP + (50 - this.tb) * SPRING + (Math.random() - 0.5) * NOISE * 2;
    this.lr  = Math.max(39, Math.min(61, this.lr + this.lrV));
    this.tb  = Math.max(39, Math.min(61, this.tb + this.tbV));

    const lrL = +this.lr.toFixed(1);
    const tbT = +this.tb.toFixed(1);
    return {
      lr: [lrL, +(100 - lrL).toFixed(1)],
      tb: [tbT, +(100 - tbT).toFixed(1)],
    };
  }
}

// Module-level singleton so state persists between re-renders
export const centeringSim = new CenteringSimulator();

/** Color for the centering readout based on PSA tolerances. */
export function centeringColor(lr: [number, number], tb: [number, number]): CornerColor {
  const diff = Math.max(Math.abs(lr[0] - lr[1]), Math.abs(tb[0] - tb[1]));
  if (diff <= 10) return 'green';  // ≤55/45 → PSA 10
  if (diff <= 20) return 'yellow'; // ≤60/40 → PSA 9
  return 'red';
}

/** Human-readable grade name for a centering color. */
export function centeringGradeLabel(color: CornerColor): string {
  if (color === 'green')  return 'PSA 10 range';
  if (color === 'yellow') return 'PSA 9 range';
  return 'PSA 8 or lower';
}
