import { describe, expect, it } from 'vitest';
import {
  mmToMeters,
  metersToMm,
  formatDimensionsMm,
  formatDimensionsMeters,
  isArEligible,
  computeArTablePlacement,
  generateArSessionToken,
  hashArSessionToken,
  isArSessionExpired,
  AR_SESSION_TTL_MS,
} from '@/lib/lithophaneAr';
import { detectDeviceAr } from '@/lib/lithophaneArDetection';
import { buildArScene, exportArGlb } from '@/lib/lithophaneArModel';
import type { HeightMap } from '@/lib/lithophaneRelief';

describe('Real-World Scaling (Millimeter to Meter Conversion)', () => {
  it('converts millimeters to meters accurately (GLTF world units)', () => {
    expect(mmToMeters(120)).toBe(0.12);
    expect(mmToMeters(180)).toBe(0.18);
    expect(mmToMeters(30)).toBe(0.03);
    expect(mmToMeters(0)).toBe(0);
    expect(mmToMeters(1500)).toBe(1.5);
  });

  it('converts meters back to millimeters accurately', () => {
    expect(metersToMm(0.12)).toBe(120);
    expect(metersToMm(0.18)).toBe(180);
    expect(metersToMm(0.03)).toBe(30);
  });

  it('formats display strings in mm and meters', () => {
    expect(formatDimensionsMm(120, 180)).toBe('120 × 180 mm');
    expect(formatDimensionsMm(120, 180, 30)).toBe('120 × 180 × 30 mm');
    expect(formatDimensionsMeters(120, 180)).toBe('0.12m × 0.18m');
    expect(formatDimensionsMeters(120, 180, 30)).toBe('0.12m × 0.18m × 0.03m');
  });
});

describe('Horizontal Table Placement & Model Origin', () => {
  it('places lowest base contact point flush at Y=0 on detected horizontal surface', () => {
    // Simulated table stand with width 144mm, height 188mm, bottom edge at Y = -96mm
    const boundsMm = {
      min: { x: -72, y: -96, z: -30 },
      max: { x: 72, y: 92, z: 30 },
    };

    const placement = computeArTablePlacement(boundsMm, 0);

    // X and Z are centered
    expect(placement.positionOffsetMeters.x).toBe(0);
    expect(placement.positionOffsetMeters.z).toBe(0);

    // Y offset lifts the model so that minY (-0.096m) rests exactly at y = 0
    expect(placement.positionOffsetMeters.y).toBe(0.096);
    expect(placement.dimensionsMeters.x).toBe(0.144);
    expect(placement.dimensionsMeters.y).toBe(0.188);
    expect(placement.dimensionsMeters.z).toBe(0.06);
  });

  it('accounts for admin AR base offset', () => {
    const boundsMm = {
      min: { x: -50, y: -75, z: -10 },
      max: { x: 50, y: 75, z: 10 },
    };

    // 2mm base offset
    const placement = computeArTablePlacement(boundsMm, 2);
    expect(placement.positionOffsetMeters.y).toBe(0.075 + 0.002);
  });
});

describe('AR Eligibility Rule', () => {
  const base = {
    phase: 'ready',
    isStale: false,
    isRunning: false,
    hasPhoto: true,
    hasPreview: true,
    variety: { arEnabled: true, isActive: true },
  };

  it('allows AR when generated preview is ready and not stale', () => {
    expect(isArEligible(base)).toBe(true);
  });

  it('disables AR when photo or preview is absent', () => {
    expect(isArEligible({ ...base, hasPhoto: false })).toBe(false);
    expect(isArEligible({ ...base, hasPreview: false })).toBe(false);
  });

  it('disables AR when generation is pending, running, or stale', () => {
    expect(isArEligible({ ...base, phase: 'generating' })).toBe(false);
    expect(isArEligible({ ...base, phase: 'uploading' })).toBe(false);
    expect(isArEligible({ ...base, isRunning: true })).toBe(false);
    expect(isArEligible({ ...base, isStale: true })).toBe(false);
  });

  it('disables AR when variety has arEnabled = false', () => {
    expect(isArEligible({ ...base, variety: { arEnabled: false, isActive: true } })).toBe(false);
  });
});

describe('Ephemeral AR Sessions & Token Security', () => {
  it('generates secure random hex tokens and stable sha256 hashes', () => {
    const t1 = generateArSessionToken();
    const t2 = generateArSessionToken();
    expect(t1).not.toBe(t2);
    expect(t1.length).toBe(48); // 24 bytes in hex

    const h1 = hashArSessionToken(t1);
    const h2 = hashArSessionToken(t1);
    expect(h1).toBe(h2);
    expect(h1.length).toBe(64); // sha256 hex
  });

  it('correctly validates expired sessions', () => {
    const now = Date.now();
    const future = new Date(now + AR_SESSION_TTL_MS);
    const past = new Date(now - 1000);

    expect(isArSessionExpired(future)).toBe(false);
    expect(isArSessionExpired(past)).toBe(true);
  });
});

describe('Device Capability Detection Fallbacks', () => {
  it('identifies Android user agent for Scene Viewer fallback', async () => {
    const androidUa = 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 Chrome/100.0.0.0 Mobile Safari/537.36';
    const info = await detectDeviceAr(androidUa);
    expect(info.isAndroid).toBe(true);
    expect(info.isMobile).toBe(true);
    expect(info.capability).toBe('SUPPORTED_SCENE_VIEWER');
    expect(info.recommendedMode).toBe('scene-viewer');
  });

  it('identifies iPhone user agent for Quick Look fallback', async () => {
    const iphoneUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
    const info = await detectDeviceAr(iphoneUa);
    expect(info.isIOS).toBe(true);
    expect(info.isMobile).toBe(true);
    expect(info.capability).toBe('SUPPORTED_QUICK_LOOK');
    expect(info.recommendedMode).toBe('quick-look');
  });

  it('identifies desktop Windows PC as unsupported for camera AR (offers QR handoff)', async () => {
    const desktopUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
    const info = await detectDeviceAr(desktopUa);
    expect(info.isMobile).toBe(false);
    expect(info.capability).toBe('UNSUPPORTED');
    expect(info.supportsCameraAr).toBe(false);
    expect(info.recommendedMode).toBe('qr-handoff');
  });
});

describe('AR 3D Model Scene & GLB Export', () => {
  const dummyMap: HeightMap = {
    cols: 10,
    rows: 10,
    data: new Float32Array(100).fill(1.8),
    minMm: 0.8,
    maxMm: 3.0,
  };

  it('constructs real-world scaled AR scene and exports valid GLB binary', async () => {
    const build = buildArScene({
      map: dummyMap,
      widthMm: 120,
      heightMm: 180,
      thicknessMm: 3,
      depthMm: 60,
      baseModel: 'table_stand',
      options: { stand_type: 'angled', base_colour: 'black' },
      lightOn: true,
    });

    expect(build.root).toBeDefined();
    expect(build.root.scale.x).toBe(0.001);
    expect(build.root.scale.y).toBe(0.001);
    expect(build.root.scale.z).toBe(0.001);

    // Export to GLB
    const glbBuffer = await exportArGlb(build.root);
    expect(glbBuffer).toBeInstanceOf(ArrayBuffer);
    expect(glbBuffer.byteLength).toBeGreaterThan(100);

    // Check GLB magic header: 0x46546C67 ("glTF")
    const header = new DataView(glbBuffer).getUint32(0, true);
    expect(header).toBe(0x46546c67);
  });
});

