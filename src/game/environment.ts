/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { BoundingBox } from './physics';
import {
  brickTex,
  concreteTex,
  grassTex,
  asphaltTex,
  tileTex,
  lockerTex,
  flagTex,
  labelTex,
} from './textures';
import { buildAnimeCourtyard } from './animeCourtyard';
import { addCourtyardMeadow } from './courtyardMeadow';
import { buildDetailedCourtyard } from './detailedCourtyard';

export interface WorldEnvironment {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sun: THREE.DirectionalLight;
  solids: THREE.Mesh[];
  boxes: BoundingBox[];
  flagGeo: THREE.PlaneGeometry;
  flagBase: Float32Array;
  dispose: () => void;
}

export function buildEnvironment(isSoftwareGl: boolean): WorldEnvironment {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd0f5);
  scene.fog = new THREE.Fog(0xd3e8f6, 70, 200);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);

  // Lights: Warm ambient light + cool hemisphere fill so indoor and outdoor areas are bright
  const ambient = new THREE.AmbientLight(0xfff8ee, 0.72);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0xe8f4ff, 0x8a927a, 0.95);
  scene.add(hemi);

  // Soft fill light from the school side so character face is well-lit in closeups
  const fillLight = new THREE.DirectionalLight(0xfffaea, 0.6);
  fillLight.position.set(-15, 25, -35);
  scene.add(fillLight);

  const sun = new THREE.DirectionalLight(0xfff0d6, 1.15);
  if (!isSoftwareGl) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -48;
    sc.right = 48;
    sc.top = 48;
    sc.bottom = -48;
    sc.near = 1;
    sc.far = 160;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
  }
  scene.add(sun);
  scene.add(sun.target);

  const solids: THREE.Mesh[] = [];
  const boxes: BoundingBox[] = [];

  const std = (color: number, rough = 0.9, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough }, extra));

  const M = {
    brick: std(0xffffff, 0.95, { map: brickTex }),
    concrete: std(0xffffff, 0.95, { map: concreteTex }),
    grass: std(0xffffff, 1, { map: grassTex }),
    asphalt: std(0xffffff, 1, { map: asphaltTex }),
    floor: std(0xffffff, 0.55, { map: tileTex }),
    locker: std(0xffffff, 0.5, { map: lockerTex }),
    stone: std(0xdacdb3, 0.9),
    roof: std(0x6c6a66, 0.95),
    plaster: std(0xefe6d2, 0.95),
    ceil: std(0xf4efe3, 0.95),
    bronze: std(0x3a2f2a, 0.5, { metalness: 0.4 }),
    glass: std(0x7da2bd, 0.12, { metalness: 0.5, transparent: true, opacity: 0.42 }),
    glassDark: std(0x4d6a80, 0.2, { metalness: 0.5 }),
    wood: std(0xb8895a, 0.7),
    woodDark: std(0x7a5333, 0.8),
    board: std(0x24453a, 0.9),
    yellow: std(0xf2b81c, 0.5),
    black: std(0x1c1c1e, 0.7),
    lampGlass: new THREE.MeshStandardMaterial({
      color: 0xfff1c4,
      emissive: 0xffe9a8,
      emissiveIntensity: 0.9,
    }),
    light: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.9,
    }),
    metal: std(0xcfd3d8, 0.35, { metalness: 0.7 }),
    gold: std(0xd9b44a, 0.35, { metalness: 0.8 }),
    leafGreen: std(0x3f7d3a, 0.9),
    leafRed: std(0x8b2d34, 0.9),
    trunk: std(0x5a3b25, 1),
    shrub: std(0x3b7a3a, 0.95),
  };

  function setUV(g: THREE.BoxGeometry, w: number, h: number, d: number, sx: number, sy = sx) {
    const uv = g.attributes.uv;
    const dims = [
      [d, h],
      [d, h],
      [w, d],
      [w, d],
      [w, h],
      [w, h],
    ];
    for (let f = 0; f < 6; f++) {
      for (let i = 0; i < 4; i++) {
        const k = f * 4 + i;
        uv.setXY(k, (uv.getX(k) * dims[f][0]) / sx, (uv.getY(k) * dims[f][1]) / sy);
      }
    }
    uv.needsUpdate = true;
  }

  interface MkBoxOpts {
    uv?: number;
    uvy?: number;
    shadow?: boolean;
    ry?: number;
    collide?: boolean;
    ray?: boolean;
  }

  function mkBox(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    o: MkBoxOpts = {}
  ): THREE.Mesh {
    const g = new THREE.BoxGeometry(w, h, d);
    if (o.uv) setUV(g, w, h, d, o.uv, o.uvy);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = !isSoftwareGl && o.shadow !== false;
    m.receiveShadow = !isSoftwareGl;
    if (o.ry) m.rotation.y = o.ry;
    scene.add(m);
    if (o.collide) boxes.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
    if (o.ray) solids.push(m);
    return m;
  }

  function mkCyl(
    rt: number,
    rb: number,
    h: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    seg = 28,
    o?: { noShadow?: boolean }
  ): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = !isSoftwareGl && !(o && o.noShadow);
    m.receiveShadow = !isSoftwareGl;
    scene.add(m);
    return m;
  }

  function mkSphere(
    r: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    sx = 1,
    sy = 1,
    sz = 1,
    seg = 24
  ): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = !isSoftwareGl;
    m.receiveShadow = !isSoftwareGl;
    scene.add(m);
    return m;
  }

  function mkPlane(w: number, h: number, x: number, y: number, z: number, mat: THREE.Material, ry = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    scene.add(m);
    return m;
  }

  // --- Ground, Street, Sidewalks, Paths ---
  mkBox(320, 0.2, 320, 0, -0.2, -20, M.grass, { uv: 6, shadow: false });
  mkBox(320, 0.03, 10, 0, 0, 31, M.asphalt, { uv: 6, shadow: false });
  for (let x = -60; x <= 60; x += 6) mkBox(3, 0.035, 0.18, x, 0, 31, M.yellow, { shadow: false });
  mkBox(320, 0.12, 0.5, 0, 0, 25.75, M.concrete, { uv: 2, shadow: false });
  mkBox(320, 0.05, 3.5, 0, 0, 23.75, M.concrete, { uv: 2, shadow: false });
  mkBox(60, 0.04, 1.4, 0, 0, -9.0, M.concrete, { uv: 2, shadow: false });
  mkBox(14, 0.05, 6, 0, 0, -3, M.concrete, { uv: 2, shadow: false });
  mkBox(6, 0.045, 26, 0, 0, 10, M.concrete, { uv: 2, shadow: false });

  [-1, 1].forEach((s) => {
    const x0 = s * 5,
      z0 = 0,
      x1 = s * 25,
      z1 = 22.5,
      dx = x1 - x0,
      dz = z1 - z0,
      L = Math.hypot(dx, dz);
    mkBox(L, 0.042, 3, (x0 + x1) / 2, 0, (z0 + z1) / 2, M.concrete, {
      uv: 2,
      shadow: false,
      ry: -Math.atan2(dz, dx),
    });
  });

  // --- Building: Exterior Walls ---
  const H = 9;
  [-1, 1].forEach((s) => {
    mkBox(24, H, 0.6, s * 18, 0, -10, M.brick, { uv: 1.2, collide: true, ray: true });
    mkBox(24.4, 0.4, 0.9, s * 18, 4.3, -10, M.stone, { uv: 1 });
    mkBox(24.4, 0.6, 0.9, s * 18, 0, -10, M.stone, { uv: 1 });
    mkBox(0.6, H, 20, s * 30, 0, -20, M.brick, { uv: 1.2, collide: true, ray: true });
    mkBox(0.05, 4.2, 19.4, s * 29.675, 0, -20, M.plaster);
    mkBox(24, 4.2, 0.05, s * 18, 0, -10.33, M.plaster);
    // Entry pillars
    mkBox(3, 13, 4.4, s * 4.5, 0, -7.8, M.brick, { uv: 1.2, collide: true, ray: true });
    // Windows
    [9.5, 14, 18.5, 23, 27.5].forEach((x) => {
      [
        [1.25, 2.1],
        [5.4, 2.1],
      ].forEach((r) => {
        mkBox(2.84, r[1] + 0.24, 0.1, s * x, r[0] - 0.12, -9.66, M.bronze, { shadow: false });
        mkBox(2.6, r[1], 0.14, s * x, r[0], -9.64, M.glassDark, { shadow: false });
        mkBox(3.1, 0.14, 0.3, s * x, r[0] - 0.2, -9.62, M.stone, { shadow: false });
      });
    });
  });

  mkBox(59.4, 4.2, 0.05, 0, 0, -29.675, M.plaster);
  mkBox(60.6, 0.7, 0.9, 0, H - 0.1, -10, M.stone, { uv: 1 });
  mkBox(60.6, 0.7, 0.9, 0, H - 0.1, -30, M.stone, { uv: 1 });
  mkBox(60.6, 0.5, 20.6, 0, H + 0.6, -20, M.roof, { uv: 2 });
  mkBox(59.4, 0.2, 19.4, 0, 4.2, -20, M.ceil, { ray: true, shadow: true });
  mkBox(60, 0.04, 20, 0, 0, -20, M.floor, { uv: 2, shadow: false });
  mkBox(60, H, 0.6, 0, 0, -30, M.brick, { uv: 1.2, collide: true, ray: true });

  // --- Arched Entrance + EAST HIGH Sign ---
  mkBox(6, 6, 4.2, 0, 7, -7.9, M.brick, { uv: 1.2, ray: true });
  mkBox(10.4, 0.9, 0.5, 0, 13, -7.7, M.stone, { uv: 1 });
  mkBox(12.4, 0.4, 5, 0, 13.9, -7.9, M.roof, { uv: 2 });
  mkBox(9, 0.3, 3, 0, 3.4, -7.2, M.stone, { uv: 1 });
  const archGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 3, 0.1, 40, 1, false, Math.PI / 2, Math.PI),
    M.glassDark
  );
  archGlass.rotation.x = Math.PI / 2;
  archGlass.position.set(0, 7, -5.85);
  scene.add(archGlass);

  mkBox(6, 0.5, 0.3, 0, 3.15, -5.95, M.bronze, { shadow: false });
  [-3, -1.5, 1.5, 3].forEach((x) => mkBox(0.14, 3.15, 0.2, x, 0, -5.95, M.bronze, { shadow: false }));
  [-2.25, 2.25].forEach((x) => mkBox(1.5, 3.1, 0.06, x, 0, -5.93, M.glass, { shadow: false }));
  mkBox(6, 3.9, 0.08, 0, 3.45, -5.93, M.glass, { shadow: false });
  [-1.5, 0, 1.5].forEach((x) => mkBox(0.08, 6.9, 0.14, x, 0.05, -5.9, M.bronze, { shadow: false }));

  const signTex = labelTex('EAST HIGH', 640, 110, '#d9ccb2', '#4a3a2c', '700 70px Georgia, "Times New Roman", serif');
  mkPlane(8.4, 1.45, 0, 11.65, -5.77, new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.8 }));
  mkBox(9, 0.08, 0.08, 0, 10.85, -5.77, M.bronze, { shadow: false });
  mkBox(6, 0.05, 4.2, 0, 0, -7.9, M.concrete, { uv: 2, shadow: false });

  // --- Interior Hall, Lockers, Classrooms 101 to 104 ---
  [-1, 1].forEach((s) => {
    mkBox(21, 2.2, 0.5, s * 18.5, 0.02, -10.58, M.locker, { uv: 1.8, uvy: 2.2, collide: true, ray: true });
  });

  const gaps = [-22, -7, 7, 22];
  const segs = [
    [-30, -23.1],
    [-20.9, -8.1],
    [-5.9, 5.9],
    [8.1, 20.9],
    [23.1, 30],
  ];
  segs.forEach((s) => mkBox(s[1] - s[0], 4.2, 0.4, (s[0] + s[1]) / 2, 0, -22, M.plaster, { collide: true, ray: true }));
  [-14, 0, 14].forEach((x) => mkBox(0.4, 4.2, 8, x, 0, -26, M.plaster, { collide: true, ray: true }));

  gaps.forEach((cx, i) => {
    mkBox(2.5, 1, 0.5, cx, 3.2, -22, M.plaster, { ray: true });
    mkBox(0.12, 3.2, 0.45, cx - 1.16, 0, -22, M.bronze, { shadow: false });
    mkBox(0.12, 3.2, 0.45, cx + 1.16, 0, -22, M.bronze, { shadow: false });
    const lt = labelTex(
      `Salle 10${i + 1}`,
      256,
      80,
      '#2a1810',
      '#fff3d6',
      '700 44px "M PLUS Rounded 1c", system-ui, sans-serif'
    );
    mkPlane(1.6, 0.5, cx, 3.62, -21.78, new THREE.MeshStandardMaterial({ map: lt, roughness: 0.8 }));

    // Classroom: chalkboard + student desks + teacher desk
    mkBox(6, 1.4, 0.08, cx, 1.1, -29.65, M.board);
    mkBox(6.2, 0.08, 0.12, cx, 0.98, -29.6, M.woodDark, { shadow: false });
    for (let r = 0; r < 3; r++) {
      for (let c = -1; c <= 1; c++) {
        const dx = cx + c * 3.4;
        const dz = -24.9 - r * 1.6;
        mkBox(1.1, 0.06, 0.6, dx, 0.72, dz, M.wood, { collide: false });
        mkBox(0.9, 0.7, 0.4, dx, 0, dz, M.woodDark, { collide: true });
      }
    }
    mkBox(1.8, 0.06, 0.8, cx + 3.2, 0.74, -23.3, M.wood);
    mkBox(1.6, 0.72, 0.6, cx + 3.2, 0, -23.3, M.woodDark, { collide: true });
  });

  // Ceiling lights + Hallway pointlights
  [-24, -12, 0, 12, 24].forEach((x) =>
    [-13.5, -18.5].forEach((z) => mkBox(2.2, 0.05, 0.6, x, 4.14, z, M.light, { shadow: false }))
  );
  // Interior hall lights
  [-20, -10, 0, 10, 20].forEach((x) => {
    const p = new THREE.PointLight(0xfffae6, 0.9, 26, 1.4);
    p.position.set(x, 3.8, -16);
    scene.add(p);
  });
  // Classroom lights
  [-22, -7, 7, 22].forEach((cx) => {
    const roomLight = new THREE.PointLight(0xfff8e8, 0.95, 20, 1.4);
    roomLight.position.set(cx, 3.8, -26);
    scene.add(roomLight);
  });

  // Hallway benches
  [-14, 14].forEach((x) => {
    mkBox(2.4, 0.08, 0.6, x, 0.5, -15, M.wood);
    mkBox(2.2, 0.5, 0.4, x, 0, -15, M.woodDark, { collide: true });
  });

  // --- Flagpole and Waving American Flag ---
  mkCyl(2.7, 2.7, 0.07, 0, 0, 5, M.concrete, 48, { noShadow: true });
  mkCyl(0.34, 0.42, 0.5, 0, 0.07, 5, M.stone, 16);
  mkCyl(0.05, 0.07, 15, 0, 0.5, 5, M.metal, 10);
  mkSphere(0.14, 0, 15.6, 5, M.gold);
  boxes.push({ x0: -0.4, x1: 0.4, z0: 4.6, z1: 5.4 });

  const flagGeo = new THREE.PlaneGeometry(2.5, 1.32, 24, 10);
  const flag = new THREE.Mesh(
    flagGeo,
    new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.9 })
  );
  flag.position.set(1.3, 14.5, 5);
  flag.castShadow = !isSoftwareGl;
  scene.add(flag);
  const flagBase = Float32Array.from(flagGeo.attributes.position.array);

  // --- High-fidelity Victorian Anime Streetlamps ---
  function lamp(x: number, z: number) {
    // Stepped plinth & fluted base (24 segments)
    mkCyl(0.20, 0.24, 0.22, x, 0, z, M.black, 24);
    mkCyl(0.16, 0.20, 0.18, x, 0.22, z, M.black, 24);
    // Fluted tapered post with decorative collars
    mkCyl(0.065, 0.085, 3.4, x, 0.40, z, M.black, 24);
    mkCyl(0.10, 0.10, 0.06, x, 1.85, z, M.gold, 24);
    mkCyl(0.11, 0.085, 0.12, x, 3.80, z, M.black, 24);

    // Decorative arched arm bracket
    const arm = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.022, 12, 24, Math.PI * 0.9), M.black);
    arm.rotation.z = Math.PI * 0.1;
    arm.position.set(x, 3.98, z);
    scene.add(arm);

    // Hexagonal beveled lantern housing with warm glow
    mkCyl(0.25, 0.17, 0.50, x, 4.04, z, M.lampGlass, 6, { noShadow: false });
    // Brass lantern cap & ball finial
    mkCyl(0.04, 0.28, 0.20, x, 4.54, z, M.black, 6, { noShadow: true });
    mkSphere(0.055, x, 4.78, z, M.gold, 1, 1, 1, 16);

    // Warm atmospheric point light
    const pl = new THREE.PointLight(0xffe2ad, 0.45, 14, 1.8);
    pl.position.set(x, 4.25, z);
    scene.add(pl);

    boxes.push({ x0: x - 0.25, x1: x + 0.25, z0: z - 0.25, z1: z + 0.25 });
  }

  [
    [-8, 2],
    [8, 2],
    [-16, 9],
    [16, 9],
    [-3.6, 17],
    [3.6, 17],
    [-26, 18],
    [26, 18],
    [-11, -6.5],
    [11, -6.5],
  ].forEach((p) => lamp(p[0], p[1]));

  // --- High-fidelity Organic Anime Trees ---
  function tree(x: number, z: number, s: number, leaf: THREE.Material, collide = true) {
    // Smooth tapered trunk with subtle flare
    mkCyl(0.10 * s, 0.18 * s, 2.5 * s, x, 0, z, M.trunk, 24);
    // Root base flare
    mkCyl(0.18 * s, 0.28 * s, 0.35 * s, x, 0, z, M.trunk, 24);

    // Organic primary branches
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.10 * s, 1.4 * s, 16), M.trunk);
    b1.position.set(x - 0.35 * s, 2.4 * s, z + 0.15 * s);
    b1.rotation.z = Math.PI * 0.22;
    scene.add(b1);

    const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.10 * s, 1.3 * s, 16), M.trunk);
    b2.position.set(x + 0.38 * s, 2.3 * s, z - 0.2 * s);
    b2.rotation.z = -Math.PI * 0.24;
    scene.add(b2);

    const c = 2.8 * s;
    // Multi-tiered smooth canopy clusters with rich volume
    [
      [0, c + 0.7 * s, 0, 1.25, 1.1, 0.95, 1.1],
      [0.65 * s, c + 0.15 * s, 0.25 * s, 0.95, 1.05, 0.9, 1.05],
      [-0.6 * s, c + 0.3 * s, -0.35 * s, 0.98, 1.1, 0.88, 1.05],
      [0.15 * s, c + 1.25 * s, 0.15 * s, 0.82, 1.0, 0.85, 1.0],
      [-0.1 * s, c + 0.1 * s, 0.55 * s, 0.85, 1.05, 0.88, 1.0],
      [0.2 * s, c - 0.1 * s, -0.5 * s, 0.78, 1.0, 0.85, 0.95],
    ].forEach((p) => {
      mkSphere(p[3] as number, x + (p[0] as number), (p[1] as number), z + (p[2] as number), leaf, p[4] as number, p[5] as number, p[6] as number, 26);
    });
    if (collide) boxes.push({ x0: x - 0.35 * s, x1: x + 0.35 * s, z0: z - 0.35 * s, z1: z + 0.35 * s });
  }

  [
    [-12, 8],
    [12, 8],
    [-22, 2],
    [22, 2],
    [-32, 12],
    [32, 12],
    [-5.6, -1.2],
    [5.6, -1.2],
    [-18, 16],
    [18, 16],
  ].forEach((p) => tree(p[0], p[1], 1, M.leafRed));

  let seed2 = 12345;
  function rnd2() {
    seed2 = (seed2 * 9301 + 49297) % 233280;
    return seed2 / 233280;
  }
  for (let i = 0; i < 40; i++) {
    const x = -130 + rnd2() * 260;
    const z = -120 + rnd2() * 190;
    if (x > -64 && x < 64 && z > -50 && z < 44) continue;
    tree(x, z, 1.9 + rnd2() * 1.6, M.leafGreen, false);
  }

  // --- High-fidelity Flowering Shrubs ---
  for (let i = 0; i < 22; i++) {
    const x = (i < 11 ? -1 : 1) * (8 + (i % 11) * 2.3);
    mkSphere(0.62, x, 0.42, -6.9, M.shrub, 1.25, 0.85, 1.05, 24);
  }
  [
    [-8.6, -4.4],
    [8.6, -4.4],
    [-3.9, 16],
    [3.9, 16],
    [-3.9, 4],
    [3.9, 4],
  ].forEach((p) => mkSphere(0.56, p[0], 0.38, p[1], M.shrub, 1.18, 0.82, 1.12, 24));

  // --- Yellow School Bus ---
  const bx = -24,
    bz = 29;
  mkBox(9, 2.3, 2.5, bx, 0.55, bz, M.yellow, { collide: true });
  mkBox(9.02, 0.18, 2.52, bx, 1.3, bz, M.black, { shadow: false });
  mkBox(8.4, 0.7, 2.54, bx, 1.6, bz, M.glassDark, { shadow: false });
  [-3.2, 3.2].forEach((dx) => {
    [-1, 1].forEach((s) => {
      // 24-segment rubber tire with chrome hubcap
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 24), M.black);
      w.rotation.x = Math.PI / 2;
      w.position.set(bx + dx, 0.55, bz + s * 1.1);
      w.castShadow = !isSoftwareGl;
      scene.add(w);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.32, 24), M.metal);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(bx + dx, 0.55, bz + s * 1.1);
      scene.add(hub);
    });
  });

  // --- Clouds in Sky ---
  for (let i = 0; i < 12; i++) {
    const cx = -150 + rnd2() * 300,
      cz = -170 + rnd2() * 120,
      cy = 70 + rnd2() * 30;
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false });
    for (let k = 0; k < 5; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(8 + rnd2() * 7, 16, 12), mat);
      m.position.set(cx + k * 9 - 18, cy + rnd2() * 3, cz + rnd2() * 6);
      m.scale.y = 0.55;
      scene.add(m);
    }
  }

  // Stylized anime school entrance, glazed double doors, benches, crest, and cherry trees.
  buildAnimeCourtyard(scene, boxes, isSoftwareGl);

  // Fine meadow around the entry: soft grass tufts, tiny flowers, and scattered petals.
  addCourtyardMeadow(scene, isSoftwareGl);

  // High-fidelity detailed courtyard assets (fountain, bicycle pavilion, school bulletin board, vending machines, curbstones, planters).
  buildDetailedCourtyard(scene, boxes, isSoftwareGl);

  const dispose = () => {
    const callbacks = scene.userData.cleanupCallbacks as Array<() => void> | undefined;
    callbacks?.forEach((cb) => cb());
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    });
  };

  return { scene, camera, sun, solids, boxes, flagGeo, flagBase, dispose };
}
