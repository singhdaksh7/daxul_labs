/**
 * Pure relief generation: crop + height map from RGBA pixel data. Runs in the browser (preview) and
 * is unit-tested in Node. No DOM, no three.js.
 */
import { clampCrop, type Crop } from './lithophane';

export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * Largest window of the target aspect ratio (w/h) inside the image, shrunk by zoom and centred at the
 * crop centre (clamped so the window stays inside the image). The photo is NEVER stretched:
 * sw / sh === aspect exactly.
 */
export function computeCropRect(imgW: number, imgH: number, aspect: number, cropIn?: Partial<Crop> | null): CropRect {
  const crop = clampCrop(cropIn);
  let sw: number;
  let sh: number;
  if (imgW / imgH > aspect) {
    sh = imgH;
    sw = imgH * aspect;
  } else {
    sw = imgW;
    sh = imgW / aspect;
  }
  sw /= crop.zoom;
  sh /= crop.zoom;
  const sx = Math.min(imgW - sw, Math.max(0, crop.cx * imgW - sw / 2));
  const sy = Math.min(imgH - sh, Math.max(0, crop.cy * imgH - sh / 2));
  return { sx, sy, sw, sh };
}

/** Grid resolution for a target aspect with `longSide` samples on the long edge. */
export function gridSize(aspect: number, longSide: number): { cols: number; rows: number } {
  const L = Math.max(8, Math.round(longSide));
  if (aspect >= 1) return { cols: L, rows: Math.max(2, Math.round(L / aspect)) };
  return { cols: Math.max(2, Math.round(L * aspect)), rows: L };
}

export interface HeightMap {
  cols: number;
  rows: number;
  /** thickness in mm at each grid point (row-major, row 0 = top of the image) */
  data: Float32Array;
  minMm: number;
  maxMm: number;
}

/** Perceptual luminance 0..1 of an RGBA pixel composited on white. */
export function luminance(r: number, g: number, b: number, a: number): number {
  const al = a / 255;
  const rr = r * al + 255 * (1 - al);
  const gg = g * al + 255 * (1 - al);
  const bb = b * al + 255 * (1 - al);
  return (0.2126 * rr + 0.7152 * gg + 0.0722 * bb) / 255;
}

/** dark = thick. Lightness 0 -> maxMm, lightness 1 -> minMm. */
export const thicknessFromLightness = (lightness: number, minMm: number, maxMm: number) =>
  minMm + (1 - Math.min(1, Math.max(0, lightness))) * (maxMm - minMm);

export function generateHeightMap(
  rgba: ArrayLike<number>,
  imgW: number,
  imgH: number,
  rect: CropRect,
  cols: number,
  rows: number,
  minMm: number,
  maxMm: number,
): HeightMap {
  const data = new Float32Array(cols * rows);
  const cellW = rect.sw / cols;
  const cellH = rect.sh / rows;
  // box-average each cell (cheap, anti-aliased); at most ~6x6 taps per cell
  const stepX = Math.max(1, Math.floor(cellW / 6));
  const stepY = Math.max(1, Math.floor(cellH / 6));
  for (let j = 0; j < rows; j++) {
    const y0 = rect.sy + j * cellH;
    for (let i = 0; i < cols; i++) {
      const x0 = rect.sx + i * cellW;
      let sum = 0;
      let n = 0;
      const xe = Math.max(x0 + 1, x0 + cellW);
      const ye = Math.max(y0 + 1, y0 + cellH);
      for (let y = y0; y < ye; y += stepY) {
        const py = Math.min(imgH - 1, Math.floor(y));
        for (let x = x0; x < xe; x += stepX) {
          const px = Math.min(imgW - 1, Math.floor(x));
          const o = (py * imgW + px) * 4;
          sum += luminance(rgba[o], rgba[o + 1], rgba[o + 2], rgba[o + 3]);
          n++;
        }
      }
      data[j * cols + i] = thicknessFromLightness(n ? sum / n : 1, minMm, maxMm);
    }
  }
  return { cols, rows, data, minMm, maxMm };
}
