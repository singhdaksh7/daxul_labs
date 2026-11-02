/**
 * three.js geometry builders for the Lithophane preview (browser only; dynamically imported).
 *  - buildReliefGeometry: PREVIEW_MODEL panel from a height map (dark = thicker)
 *  - buildShell:          PRODUCT VARIETY GEOMETRY (frame / table stand / light box) around the panel
 * The relief and the shell are independent so a variety switch swaps only the shell.
 */
import * as THREE from "three";
import type { HeightMap } from "@/lib/lithophaneRelief";

export function buildReliefGeometry(map: HeightMap, widthMm: number, heightMm: number): THREE.BufferGeometry {
  const { cols, rows, data, minMm, maxMm } = map;
  const pos: number[] = [];
  const thick: number[] = [];
  const idx: number[] = [];

  // front surface (relief), viewer side (+z)
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = (i / (cols - 1) - 0.5) * widthMm;
      const y = (0.5 - j / (rows - 1)) * heightMm;
      const h = data[j * cols + i];
      pos.push(x, y, h);
      thick.push(h);
    }
  }
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }

  const addQuad = (p0: number[], p1: number[], p2: number[], p3: number[], t: number) => {
    const base = pos.length / 3;
    for (const p of [p0, p1, p2, p3]) {
      pos.push(p[0], p[1], p[2]);
      thick.push(t);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const hw = widthMm / 2;
  const hh = heightMm / 2;
  // back plane (z=0), facing -z
  addQuad([-hw, -hh, 0], [-hw, hh, 0], [hw, hh, 0], [hw, -hh, 0], minMm);

  // side walls: strips between z=0 and the relief edge, duplicated vertices for crisp edges
  const wall = (pts: Array<[number, number, number]>, flip: boolean) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [x0, y0, h0] = pts[k];
      const [x1, y1, h1] = pts[k + 1];
      const base = pos.length / 3;
      pos.push(x0, y0, 0, x1, y1, 0, x1, y1, h1, x0, y0, h0);
      thick.push(h0, h1, h1, h0);
      if (flip) idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
      else idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  };
  const top: Array<[number, number, number]> = [];
  const bottom: Array<[number, number, number]> = [];
  const left: Array<[number, number, number]> = [];
  const right: Array<[number, number, number]> = [];
  for (let i = 0; i < cols; i++) {
    const x = (i / (cols - 1) - 0.5) * widthMm;
    top.push([x, hh, data[i]]);
    bottom.push([x, -hh, data[(rows - 1) * cols + i]]);
  }
  for (let j = 0; j < rows; j++) {
    const y = (0.5 - j / (rows - 1)) * heightMm;
    left.push([-hw, y, data[j * cols]]);
    right.push([hw, y, data[j * cols + cols - 1]]);
  }
  wall(top, true);
  wall(bottom, false);
  wall(left, false);
  wall(right, true);

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aThick", new THREE.Float32BufferAttribute(thick, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const VERT = /* glsl */ `
attribute float aThick;
varying float vThick;
varying vec3 vN;
void main() {
  vThick = aThick;
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform float uLight;
uniform vec3 uLightColor;
uniform float uAbsorb;
uniform float uMin;
varying float vThick;
varying vec3 vN;
void main() {
  vec3 n = normalize(vN);
  float key = max(dot(n, normalize(vec3(0.45, 0.65, 0.75))), 0.0);
  float fill = max(dot(n, normalize(vec3(-0.65, -0.2, 0.55))), 0.0);
  vec3 off = vec3(0.90, 0.88, 0.83) * (0.28 + 0.62 * key + 0.22 * fill);
  float t = exp(-uAbsorb * (vThick - uMin));
  vec3 on = uLightColor * (0.03 + 1.2 * t) * (0.88 + 0.12 * n.z);
  gl_FragColor = vec4(mix(off, on, uLight), 1.0);
  #include <colorspace_fragment>
}`;

export interface ReliefMaterial {
  material: THREE.ShaderMaterial;
}

export function createReliefMaterial(map: HeightMap, lightOn: boolean, warm: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uLight: { value: lightOn ? 1 : 0 },
      uLightColor: { value: lightColorOf(warm) },
      uAbsorb: { value: 2.6 / Math.max(0.2, map.maxMm - map.minMm) },
      uMin: { value: map.minMm },
    },
  });
}

export const lightColorOf = (warm: boolean) => (warm ? new THREE.Color(1.0, 0.82, 0.55) : new THREE.Color(0.86, 0.93, 1.0));

const COLOURS: Record<string, string> = {
  black: "#161617",
  white: "#e9e6de",
  walnut: "#5b3b25",
  oak: "#a9814f",
  lime: "#c8ff35",
};
export const colourOf = (v: string | undefined, fallback = "black") => COLOURS[v ?? fallback] ?? COLOURS[fallback];

function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

export interface ShellSpec {
  baseModel: string;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  depthMm: number | null;
  options: Record<string, string>;
}

export interface ShellResult {
  /** group containing everything except the lithophane panel; dispose by traversing */
  group: THREE.Group;
  /** transform applied to the panel (tilt, offset) */
  panelPivot: THREE.Group;
  bounds: THREE.Box3;
}

/** PRODUCT VARIETY GEOMETRY: shell around a W x H lithophane panel whose back plane is at z = 0. */
export function buildShell(spec: ShellSpec): ShellResult {
  const { widthMm: W, heightMm: H, thicknessMm: T } = spec;
  const o = spec.options;
  const group = new THREE.Group();
  const panelPivot = new THREE.Group();
  group.add(panelPivot);

  if (spec.baseModel === "table_stand") {
    const mat = new THREE.MeshStandardMaterial({ color: colourOf(o.base_colour), roughness: 0.55, metalness: 0.05 });
    const depth = (spec.depthMm ?? 60) * (o.stand_type === "wide" ? 1.35 : 1);
    const tilt = o.stand_type === "flat" ? 0 : (9 * Math.PI) / 180;
    const baseH = 14;
    const slot = 8;
    panelPivot.position.set(0, -H / 2 + slot, 0);
    // panel centre sits H/2 above the pivot; lean back about the bottom edge
    const inner = new THREE.Group();
    inner.position.set(0, H / 2, 0);
    panelPivot.add(inner);
    panelPivot.rotation.x = -tilt;
    group.add(box(W + 24, baseH, depth, 0, -H / 2 + slot - baseH / 2, -depth * 0.1, mat));
    // small front lip so the panel reads as seated in a slot
    group.add(box(W + 24, 4, 6, 0, -H / 2 + slot + 1, T + 3.5, mat));
    return { group, panelPivot: inner, bounds: new THREE.Box3(new THREE.Vector3(-W / 2 - 12, -H / 2 - baseH + slot, -depth), new THREE.Vector3(W / 2 + 12, H / 2, T + 6)) };
  }

  if (spec.baseModel === "light_box") {
    const mat = new THREE.MeshStandardMaterial({ color: colourOf(o.box_colour), roughness: 0.5, metalness: 0.05 });
    const depth = spec.depthMm ?? 80;
    const b = 9;
    const fz = T + 3;
    group.add(box(W + 2 * b, b, fz, 0, H / 2 + b / 2, fz / 2 - 1.5, mat));
    group.add(box(W + 2 * b, b, fz, 0, -H / 2 - b / 2, fz / 2 - 1.5, mat));
    group.add(box(b, H, fz, -W / 2 - b / 2, 0, fz / 2 - 1.5, mat));
    group.add(box(b, H, fz, W / 2 + b / 2, 0, fz / 2 - 1.5, mat));
    group.add(box(W + 2 * b, H + 2 * b, depth, 0, 0, -depth / 2 - 1.5, mat));
    return { group, panelPivot, bounds: new THREE.Box3(new THREE.Vector3(-W / 2 - b, -H / 2 - b, -depth - 1.5), new THREE.Vector3(W / 2 + b, H / 2 + b, fz)) };
  }

  // photo_frame (default)
  const mat = new THREE.MeshStandardMaterial({ color: colourOf(o.frame_colour), roughness: 0.45, metalness: 0.08 });
  const b = o.frame_style === "wide" ? 20 : o.frame_style === "classic" ? 12 : 6;
  const fz = T + 6;
  group.add(box(W + 2 * b, b, fz, 0, H / 2 + b / 2, fz / 2 - 3, mat));
  group.add(box(W + 2 * b, b, fz, 0, -H / 2 - b / 2, fz / 2 - 3, mat));
  group.add(box(b, H, fz, -W / 2 - b / 2, 0, fz / 2 - 3, mat));
  group.add(box(b, H, fz, W / 2 + b / 2, 0, fz / 2 - 3, mat));
  return { group, panelPivot, bounds: new THREE.Box3(new THREE.Vector3(-W / 2 - b, -H / 2 - b, -3), new THREE.Vector3(W / 2 + b, H / 2 + b, fz)) };
}

export function disposeObject(obj: THREE.Object3D) {
  obj.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}
