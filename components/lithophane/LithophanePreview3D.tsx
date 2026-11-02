"use client";

/**
 * Interactive 3D lithophane preview (three.js). Loaded with next/dynamic { ssr: false }.
 * The relief mesh is rebuilt only when `relief` changes; the product shell only when the variety /
 * geometry options / size change; light ON/OFF is a uniform + material toggle (no geometry work).
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { HeightMap } from "@/lib/lithophaneRelief";
import { buildReliefGeometry, buildShell, createReliefMaterial, disposeObject, lightColorOf, type ShellResult } from "./lithophaneMesh";

export interface ReliefData {
  map: HeightMap;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  /** identity of this relief (generation hash) */
  hash: string;
}

export interface Preview3DProps {
  relief: ReliefData | null;
  baseModel: string;
  depthMm: number | null;
  options: Record<string, string>;
  lightOn: boolean;
  view: "front" | "perspective";
  resetKey: number;
}

interface State {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  root: THREE.Group;
  panel: THREE.Mesh | null;
  shell: ShellResult | null;
  glow: THREE.Mesh;
  ambient: THREE.AmbientLight;
  key: THREE.DirectionalLight;
  radius: number;
  sizeX: number;
  sizeY: number;
  center: THREE.Vector3;
  raf: number;
  dirty: boolean;
  shellReady: boolean;
  fitKey: string;
  touched: boolean;
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export default function LithophanePreview3D({ relief, baseModel, depthMm, options, lightOn, view, resetKey }: Preview3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const st = useRef<State | null>(null);
  const builds = useRef({ relief: 0, shell: 0 });
  const latest = useRef({ lightOn, options });
  latest.current = { lightOn, options };
  const viewRef = useRef(view);
  viewRef.current = view;
  const wrapper = useRef<HTMLDivElement>(null);

  const placeCamera = (s: State, v: "front" | "perspective") => {
    // distance that fits the model both vertically and horizontally for the current canvas aspect
    const tanV = Math.tan((s.camera.fov * Math.PI) / 360);
    const aspect = Math.max(0.2, s.camera.aspect);
    const fit = Math.max((s.sizeY / 2) / tanV, (s.sizeX / 2) / (tanV * aspect));
    const d = Math.max(fit * (v === "front" ? 1.18 : 1.4), 80);
    const c = s.center;
    if (v === "front") s.camera.position.set(c.x, c.y, c.z + d);
    else s.camera.position.set(c.x + d * 0.55, c.y + d * 0.32, c.z + d * 0.85);
    s.controls.target.copy(c);
    s.controls.update();
    s.dirty = true;
  };

  // ---- init / teardown
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 1, 5000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 40;
    controls.maxDistance = 1500;
    controls.enablePan = false;
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(200, 300, 400);
    scene.add(ambient, key);
    const root = new THREE.Group();
    scene.add(root);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    glow.position.z = -30;
    scene.add(glow);

    const state: State = { renderer, scene, camera, controls, root, panel: null, shell: null, glow, ambient, key, radius: 200, sizeX: 200, sizeY: 200, center: new THREE.Vector3(), raf: 0, dirty: true, shellReady: false, fitKey: "", touched: false };
    st.current = state;
    controls.addEventListener("change", () => (state.dirty = true));
    controls.addEventListener("start", () => (state.touched = true));

    const resize = () => {
      const w = Math.max(1, el.clientWidth);
      const h = Math.max(1, el.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (state.shellReady && !state.touched) placeCamera(state, viewRef.current);
      state.dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const loop = () => {
      state.raf = requestAnimationFrame(loop);
      const moved = controls.update();
      if (state.dirty || moved) {
        renderer.render(scene, camera);
        state.dirty = false;
      }
    };
    loop();

    return () => {
      cancelAnimationFrame(state.raf);
      ro.disconnect();
      controls.dispose();
      disposeObject(root);
      disposeObject(glow);
      renderer.dispose();
      renderer.domElement.remove();
      st.current = null;
    };
  }, []);

  // ---- relief (PREVIEW_MODEL panel)
  useEffect(() => {
    const s = st.current;
    if (!s) return;
    if (s.panel) {
      s.panel.parent?.remove(s.panel);
      disposeObject(s.panel);
      s.panel = null;
    }
    if (!relief) {
      s.dirty = true;
      return;
    }
    const geo = buildReliefGeometry(relief.map, relief.widthMm, relief.heightMm);
    const mat = createReliefMaterial(relief.map, latest.current.lightOn, latest.current.options.light_temperature !== "cool");
    mat.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(geo, mat);
    s.panel = mesh;
    (s.shell?.panelPivot ?? s.root).add(mesh);
    builds.current.relief += 1;
    wrapper.current?.setAttribute("data-relief-builds", String(builds.current.relief));
    wrapper.current?.setAttribute("data-relief-hash", relief.hash);
    s.dirty = true;
  }, [relief]);

  // ---- product shell (VARIETY geometry)
  const shellKey = `${baseModel}|${relief?.widthMm}|${relief?.heightMm}|${relief?.thicknessMm}|${depthMm}|${JSON.stringify(options)}`;
  useEffect(() => {
    const s = st.current;
    if (!s) return;
    if (s.shell) {
      if (s.panel) s.root.add(s.panel); // detach the panel so disposing the old shell does not free it
      s.root.remove(s.shell.group);
      disposeObject(s.shell.group);
      s.shell = null;
    }
    if (!relief) {
      s.dirty = true;
      return;
    }
    const shell = buildShell({ baseModel, widthMm: relief.widthMm, heightMm: relief.heightMm, thicknessMm: relief.thicknessMm, depthMm, options });
    s.root.add(shell.group);
    s.shell = shell;
    if (s.panel) shell.panelPivot.add(s.panel);
    const size = new THREE.Vector3();
    shell.bounds.getSize(size);
    s.radius = Math.max(size.x, size.y, 60) * 0.62;
    s.sizeX = Math.max(size.x, 60);
    s.sizeY = Math.max(size.y, 60);
    shell.bounds.getCenter(s.center);
    s.center.z = Math.max(s.center.z, -20);
    s.glow.scale.set(s.radius * 4.2, s.radius * 4.2, 1);
    s.glow.position.set(s.center.x, s.center.y, -Math.max(40, size.z));
    s.shellReady = true;
    builds.current.shell += 1;
    wrapper.current?.setAttribute("data-shell-builds", String(builds.current.shell));
    const fitKey = `${Math.round(size.x)}|${Math.round(size.y)}|${baseModel}`;
    if (s.fitKey !== fitKey) {
      s.fitKey = fitKey;
      s.touched = false;
      placeCamera(s, view);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shellKey, relief]);

  // ---- light toggle: uniforms + materials only (instant, no geometry work)
  useEffect(() => {
    const s = st.current;
    if (!s) return;
    const warm = options.light_temperature !== "cool";
    const mat = s.panel?.material as THREE.ShaderMaterial | undefined;
    if (mat) {
      mat.uniforms.uLight.value = lightOn ? 1 : 0;
      mat.uniforms.uLightColor.value = lightColorOf(warm);
    }
    s.ambient.intensity = lightOn ? 0.18 : 0.9;
    s.key.intensity = lightOn ? 0.25 : 1.4;
    const gm = s.glow.material as THREE.MeshBasicMaterial;
    gm.opacity = lightOn ? 0.55 : 0;
    gm.color = lightColorOf(warm);
    s.dirty = true;
    wrapper.current?.setAttribute("data-light", lightOn ? "on" : "off");
  }, [lightOn, options.light_temperature, relief, shellKey]);

  // ---- camera presets / reset
  useEffect(() => {
    const s = st.current;
    if (s) {
      s.touched = false;
      placeCamera(s, view);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, resetKey]);

  // keep the glow facing the camera plane (it is a flat card behind the model)
  return (
    <div ref={wrapper} data-testid="lithophane-canvas" data-light="off" className="relative h-full w-full">
      <div ref={host} className="h-full w-full" />
    </div>
  );
}
