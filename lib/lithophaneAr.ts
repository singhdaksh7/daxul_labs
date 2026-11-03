/**
 * Custom Lithophane AR: Pure, client-safe & unit-tested helpers.
 * Handles physical unit conversion (mm <-> meters), horizontal table placement,
 * AR eligibility rules, configuration hash checks, and secure ephemeral AR tokens.
 */
import { createHash, randomBytes } from 'crypto';

/**
 * GLTF/AR standards define 1.0 unit = 1.0 meter.
 * Lithophane builder internal dimensions are in millimeters (mm).
 */
export const MM_PER_METER = 1000;

export function mmToMeters(mm: number): number {
  if (!Number.isFinite(mm)) return 0;
  return Math.round((mm / MM_PER_METER) * 1e6) / 1e6;
}

export function metersToMm(meters: number): number {
  if (!Number.isFinite(meters)) return 0;
  return Math.round(meters * MM_PER_METER * 100) / 100;
}

export function formatDimensionsMm(widthMm: number, heightMm: number, depthMm?: number | null): string {
  const w = Math.round(widthMm);
  const h = Math.round(heightMm);
  if (depthMm && depthMm > 0) {
    return `${w} × ${h} × ${Math.round(depthMm)} mm`;
  }
  return `${w} × ${h} mm`;
}

export function formatDimensionsMeters(widthMm: number, heightMm: number, depthMm?: number | null): string {
  const wm = mmToMeters(widthMm);
  const hm = mmToMeters(heightMm);
  if (depthMm && depthMm > 0) {
    const dm = mmToMeters(depthMm);
    return `${wm}m × ${hm}m × ${dm}m`;
  }
  return `${wm}m × ${hm}m`;
}

export interface ArEligibilityParams {
  phase: string;
  isStale: boolean;
  isRunning: boolean;
  hasPhoto: boolean;
  hasPreview: boolean;
  variety?: {
    arEnabled?: boolean;
    isActive?: boolean;
  } | null;
}

/**
 * Determine if "VIEW ON YOUR TABLE" AR experience is available to launch.
 * Must only be available when preview generation is complete and not stale.
 */
export function isArEligible(params: ArEligibilityParams): boolean {
  if (!params.hasPhoto || !params.hasPreview) return false;
  if (params.phase !== 'ready') return false;
  if (params.isStale || params.isRunning) return false;
  if (params.variety && params.variety.isActive === false) return false;
  if (params.variety && params.variety.arEnabled === false) return false;
  return true;
}

export interface Bounds3D {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface ArTablePlacementTransform {
  /** Offset in meters to center the model on X and Z, and place base contact exactly on Y=0 */
  positionOffsetMeters: { x: number; y: number; z: number };
  /** Physical dimensions in meters */
  dimensionsMeters: { x: number; y: number; z: number };
  /** Bounding box in meters */
  boundsMeters: Bounds3D;
  /** Base contact plane Y coordinate before centering (meters) */
  baseContactPlaneMeters: number;
}

/**
 * Compute table placement transform:
 * Ensures the lowest physical contact point of the model rests directly on horizontal plane Y=0.
 * Center of model is aligned with X=0 and Z=0.
 */
export function computeArTablePlacement(
  boundsMm: Bounds3D,
  baseOffsetMm: number = 0
): ArTablePlacementTransform {
  const minX_m = mmToMeters(boundsMm.min.x);
  const maxX_m = mmToMeters(boundsMm.max.x);
  const minY_m = mmToMeters(boundsMm.min.y);
  const maxY_m = mmToMeters(boundsMm.max.y);
  const minZ_m = mmToMeters(boundsMm.min.z);
  const maxZ_m = mmToMeters(boundsMm.max.z);

  const dimX_m = Math.max(0, maxX_m - minX_m);
  const dimY_m = Math.max(0, maxY_m - minY_m);
  const dimZ_m = Math.max(0, maxZ_m - minZ_m);

  const centerX_m = (minX_m + maxX_m) / 2;
  const centerZ_m = (minZ_m + maxZ_m) / 2;

  // The base contact point should sit at y = 0 + (baseOffset in meters)
  const baseOffset_m = mmToMeters(baseOffsetMm);
  const offsetY_m = -minY_m + baseOffset_m;

  const norm0 = (n: number) => (Object.is(n, -0) ? 0 : n);

  return {
    positionOffsetMeters: {
      x: norm0(-centerX_m),
      y: norm0(offsetY_m),
      z: norm0(-centerZ_m),
    },
    dimensionsMeters: {
      x: norm0(Math.round(dimX_m * 1e4) / 1e4),
      y: norm0(Math.round(dimY_m * 1e4) / 1e4),
      z: norm0(Math.round(dimZ_m * 1e4) / 1e4),
    },
    boundsMeters: {
      min: { x: minX_m, y: minY_m, z: minZ_m },
      max: { x: maxX_m, y: maxY_m, z: maxZ_m },
    },
    baseContactPlaneMeters: minY_m,
  };
}

// ------------------------------------------------------------------ Ephemeral AR sessions
export const AR_SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function generateArSessionToken(): string {
  return randomBytes(24).toString('hex');
}

export function hashArSessionToken(token: string): string {
  return createHash('sha256').update(token.trim()).digest('hex');
}

export function isArSessionExpired(expiresAt: Date | string | number): boolean {
  const exp = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime();
  return Date.now() >= exp;
}
