/**
 * AR Model Generator for Lithophane Builder.
 * Converts the custom relief and variety shell into a real-world scale (meters)
 * horizontal table-aligned 3D model, and exports it to optimized binary GLB.
 */
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { HeightMap } from './lithophaneRelief';
import { buildReliefGeometry, buildShell, colourOf, lightColorOf } from '@/components/lithophane/lithophaneMesh';
import { computeArTablePlacement } from './lithophaneAr';

// Polyfill FileReader in Node/test environments for GLTFExporter
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).FileReader === 'undefined') {
  (globalThis as any).FileReader = class NodeFileReader {
    onload: any;
    onloadend: any;
    onerror: any;
    result: any;
    readAsArrayBuffer(blob: Blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        this.onload?.({ target: this });
        this.onloadend?.({ target: this });
      }).catch((err) => {
        this.onerror?.(err);
        this.onloadend?.({ target: this });
      });
    }
    readAsDataURL(blob: Blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = `data:${blob.type || 'application/octet-stream'};base64,` + Buffer.from(buf).toString('base64');
        this.onload?.({ target: this });
        this.onloadend?.({ target: this });
      }).catch((err) => {
        this.onerror?.(err);
        this.onloadend?.({ target: this });
      });
    }
  };
}

export interface ArModelOptions {
  map: HeightMap;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  depthMm: number | null;
  baseModel: string;
  options: Record<string, string>;
  lightOn?: boolean;
  baseOffsetMm?: number;
}

export interface ArModelBuildResult {
  root: THREE.Group;
  dimensionsMeters: { x: number; y: number; z: number };
  positionOffsetMeters: { x: number; y: number; z: number };
}

/**
 * Build a horizontal table-aligned Three.js Group in METERS for AR export.
 * Contact base rests directly at Y=0.
 */
export function buildArScene(opts: ArModelOptions): ArModelBuildResult {
  const { map, widthMm, heightMm, thicknessMm, depthMm, baseModel, options, lightOn = false, baseOffsetMm = 0 } = opts;

  // 1. Build relief geometry
  const reliefGeom = buildReliefGeometry(map, widthMm, heightMm);

  // 2. Build shell geometry
  const shell = buildShell({
    baseModel,
    widthMm,
    heightMm,
    thicknessMm,
    depthMm,
    options,
  });

  // 3. Materials optimized for mobile AR PBR rendering (GLTF Standard Material)
  const isWarm = options.light_temperature !== 'cool';
  const lithoMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xf5f3ec),
    roughness: 0.55,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  if (lightOn) {
    lithoMat.emissive = lightColorOf(isWarm);
    lithoMat.emissiveIntensity = 0.85;
  }

  const panelMesh = new THREE.Mesh(reliefGeom, lithoMat);
  panelMesh.name = 'LithophanePanel';
  shell.panelPivot.add(panelMesh);

  // Ensure shell parts use standard materials for GLTF export
  shell.group.name = 'LithophaneShell';

  // 4. Measure unscaled bounds in millimeters
  const assembly = new THREE.Group();
  assembly.name = 'Assembly';
  assembly.add(shell.group);

  const boxMm = new THREE.Box3().setFromObject(assembly);
  const placement = computeArTablePlacement(
    {
      min: { x: boxMm.min.x, y: boxMm.min.y, z: boxMm.min.z },
      max: { x: boxMm.max.x, y: boxMm.max.y, z: boxMm.max.z },
    },
    baseOffsetMm
  );

  // 5. Create final AR root with real physical scale (meters) and centered table contact
  // 1 mm = 0.001 m. We position the assembly so the contact base is at Y=0.
  const arRoot = new THREE.Group();
  arRoot.name = 'DaxulLithophaneAR';

  // Position assembly in mm so that (0,0,0) is center-bottom contact point
  const centerX_mm = (boxMm.min.x + boxMm.max.x) / 2;
  const centerZ_mm = (boxMm.min.z + boxMm.max.z) / 2;
  const bottomContactY_mm = boxMm.min.y - baseOffsetMm;

  assembly.position.set(-centerX_mm, -bottomContactY_mm, -centerZ_mm);

  // Scale root to meters (1 unit = 1 meter)
  arRoot.scale.set(0.001, 0.001, 0.001);
  arRoot.add(assembly);

  return {
    root: arRoot,
    dimensionsMeters: placement.dimensionsMeters,
    positionOffsetMeters: placement.positionOffsetMeters,
  };
}

/**
 * Export a Three.js scene/group to a binary GLB ArrayBuffer.
 */
export async function exportArGlb(root: THREE.Object3D): Promise<ArrayBuffer> {
  const exporter = new GLTFExporter();
  return new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      root,
      (gltf) => {
        if (gltf instanceof ArrayBuffer) {
          resolve(gltf);
        } else {
          // In case parser returned JSON object
          try {
            const str = JSON.stringify(gltf);
            const enc = new TextEncoder();
            resolve(enc.encode(str).buffer);
          } catch (e) {
            reject(e);
          }
        }
      },
      (error) => {
        reject(error);
      },
      {
        binary: true,
        onlyVisible: true,
        embedImages: true,
      }
    );
  });
}

/**
 * Convert ArrayBuffer to Blob URL for local model-viewer / quick-look preview.
 */
export function createArGlbBlob(buffer: ArrayBuffer): Blob {
  return new Blob([buffer], { type: 'model/gltf-binary' });
}

export function createArGlbUrl(buffer: ArrayBuffer): string {
  const blob = createArGlbBlob(buffer);
  return URL.createObjectURL(blob);
}
