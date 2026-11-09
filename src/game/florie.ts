/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { plaidTex } from './textures';
import { createIdleAnimationClip } from './idleAnimation';

export interface FlorieCharacter {
  group: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  legs: THREE.Group[];
  arms: THREE.Group[];
  eyes: THREE.Mesh[];
  tufts: THREE.Mesh[];
  skirt: THREE.Mesh;
  setBlink: (blink: boolean) => void;
  updateAnimation: (dt: number, time: number, phase: number, walk: number, isShift: boolean) => void;
  isGlbLoaded: () => boolean;
  getActiveModel: () => 'procedural' | 'glb';
  setActiveModel: (type: 'procedural' | 'glb') => void;
  dispose: () => void;
}

export function createFlorie(scene: THREE.Scene, initialX = 0, initialZ = 16): FlorieCharacter {
  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  const procGroup = new THREE.Group();
  const body = new THREE.Group();
  procGroup.add(body);
  rootGroup.add(procGroup);

  let activeModel: 'procedural' | 'glb' = 'glb';

  // Cel-shading 3-tone gradient map
  const GRAD = new THREE.DataTexture(new Uint8Array([80, 210, 255]), 3, 1, THREE.RedFormat);
  GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter;
  GRAD.needsUpdate = true;

  const tn = (hex: string, o: THREE.MeshToonMaterialParameters = {}) =>
    new THREE.MeshToonMaterial(Object.assign({ color: new THREE.Color(hex), gradientMap: GRAD }, o));

  const hullCache: Record<string, THREE.ShaderMaterial> = {};
  function hullMat(th: number, col: string) {
    const k = `${th}_${col}`;
    if (!hullCache[k]) {
      hullCache[k] = new THREE.ShaderMaterial({
        uniforms: { th: { value: th }, col: { value: new THREE.Color(col) } },
        vertexShader: `
          attribute vec3 hn;
          uniform float th;
          void main(){
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position + hn * th, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 col;
          void main(){
            gl_FragColor = vec4(col, 1.0);
          }
        `,
        side: THREE.BackSide,
      });
    }
    return hullCache[k];
  }

  function hull(mesh: THREE.Mesh, th: number, col: string) {
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    if (!pos || !nor) return;
    const acc = new Map<string, number[]>();
    const keys: string[] = [];

    for (let i = 0; i < pos.count; i++) {
      const k = `${Math.round(pos.getX(i) * 5000)},${Math.round(pos.getY(i) * 5000)},${Math.round(pos.getZ(i) * 5000)}`;
      keys.push(k);
      let a = acc.get(k);
      if (!a) {
        a = [0, 0, 0];
        acc.set(k, a);
      }
      a[0] += nor.getX(i);
      a[1] += nor.getY(i);
      a[2] += nor.getZ(i);
    }

    const hn = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const a = acc.get(keys[i]) || [0, 1, 0];
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      hn[i * 3] = a[0] / l;
      hn[i * 3 + 1] = a[1] / l;
      hn[i * 3 + 2] = a[2] / l;
    }

    const hg = new THREE.BufferGeometry();
    hg.setAttribute('position', pos);
    hg.setAttribute('hn', new THREE.BufferAttribute(hn, 3));
    if (geo.index) hg.setIndex(geo.index);
    const h = new THREE.Mesh(hg, hullMat(th, col));
    mesh.add(h);
    return h;
  }

  const INK = '#140a04';
  const INK_SKIN = '#5a2d1a';

  function part(
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    th = 0,
    col = INK
  ): THREE.Mesh {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    if (th) hull(m, th, col);
    return m;
  }

  function ell(rx: number, ry: number, rz: number, ws = 20, hs = 14) {
    const geo = new THREE.SphereGeometry(1, ws, hs);
    geo.scale(rx, ry, rz);
    return geo;
  }

  // Materials palette
  const skin = tn('#fce0c8');
  const cream = tn('#f8eedc');
  const creamD = tn('#e8d8b8');
  const choco = tn('#4a2c18');
  const sock = tn('#f4ead4');
  const sockS = tn('#9a7850');
  const shoe = tn('#5a3420');
  const hairM = tn('#4a2e14', { side: THREE.DoubleSide });
  const hairL = tn('#6a4428', { side: THREE.DoubleSide });
  const hairHi = new THREE.MeshBasicMaterial({
    color: 0x9a6a3a,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const clip = new THREE.MeshBasicMaterial({ color: 0xf8e860 });

  const pSkirt = plaidTex.clone();
  pSkirt.needsUpdate = true;
  pSkirt.repeat.set(5, 2);
  const pBod = plaidTex.clone();
  pBod.needsUpdate = true;
  pBod.repeat.set(3, 2);
  const skirtM = tn('#ffffff', { map: pSkirt, side: THREE.DoubleSide });
  const bodM = tn('#ffffff', { map: pBod });
  const strap = tn('#3a2010');

  // Legs
  const legs: THREE.Group[] = [];
  [-1, 1].forEach((s) => {
    const L = new THREE.Group();
    L.position.set(s * 0.075, 0.56, 0);
    procGroup.add(L);

    part(L, ell(0.053, 0.045, 0.053, 16, 12), skin, 0, -0.02, 0, 0.0016, INK_SKIN);
    part(L, new THREE.CylinderGeometry(0.048, 0.042, 0.18, 18), skin, 0, -0.11, 0, 0.0016, INK_SKIN);
    part(L, new THREE.CylinderGeometry(0.052, 0.044, 0.35, 18), sock, 0, -0.3, 0, 0.0018);

    [-0.16, -0.22, -0.28].forEach((y) =>
      part(L, new THREE.CylinderGeometry(0.0535, 0.0535, 0.016, 18), sockS, 0, y, 0)
    );

    const shoeG = ell(0.054, 0.038, 0.095, 16, 12);
    part(L, shoeG, shoe, 0, -0.5, 0.022, 0.002);
    part(L, new THREE.BoxGeometry(0.092, 0.013, 0.022), shoe, 0, -0.468, 0.01);
    legs.push(L);
  });

  // Skirt
  const sg = new THREE.CylinderGeometry(0.112, 0.265, 0.28, 80, 6, true);
  const sp = sg.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i);
    const y = sp.getY(i);
    const z = sp.getZ(i);
    const r = Math.hypot(x, z);
    const a = Math.atan2(z, x);
    const k = 1 + 0.062 * Math.sin(a * 20) * (((0.14 - y) / 0.28) * 0.65 + 0.35);
    sp.setXYZ(i, Math.cos(a) * r * k * 1.08, y, Math.sin(a) * r * k * 0.94);
  }
  sg.computeVertexNormals();
  const skirt = part(body, sg, skirtM, 0, 0.6, 0, 0.0025);

  // Torso / Bodice
  const shirtG = new THREE.CylinderGeometry(0.108, 0.09, 0.3, 30);
  shirtG.scale(1.2, 1, 0.85);
  part(body, shirtG, cream, 0, 0.87, 0, 0.002);

  const bodG = new THREE.CylinderGeometry(0.112, 0.094, 0.24, 30);
  bodG.scale(1.2, 1, 0.87);
  part(body, bodG, bodM, 0, 0.865, 0, 0.0022);

  const beltG = new THREE.CylinderGeometry(0.108, 0.108, 0.055, 30);
  beltG.scale(1.2, 1, 0.88);
  part(body, beltG, choco, 0, 0.755, 0, 0.0016);

  [-1, 1].forEach((s) => {
    part(body, new THREE.BoxGeometry(0.03, 0.3, 0.02), strap, s * 0.07, 0.92, -0.04, 0.0014);
    part(body, new THREE.BoxGeometry(0.02, 0.025, 0.2), strap, s * 0.075, 0.99, -0.04);
  });

  part(body, new THREE.CylinderGeometry(0.034, 0.038, 0.095, 14), skin, 0, 1.04, 0, 0.0014, INK_SKIN);
  const collar = part(body, new THREE.TorusGeometry(0.06, 0.014, 8, 24), cream, 0, 1.01, 0, 0.0014);
  collar.rotation.x = Math.PI / 2;
  collar.scale.set(1.2, 1, 1);

  // Arms
  const arms: THREE.Group[] = [];
  [-1, 1].forEach((s) => {
    const A = new THREE.Group();
    A.position.set(s * 0.148, 0.995, 0);
    body.add(A);
    part(A, ell(0.044, 0.042, 0.044, 14, 10), cream, 0, 0, 0, 0.0018);
    part(A, new THREE.CylinderGeometry(0.042, 0.036, 0.3, 18), cream, 0, -0.155, 0, 0.002);
    part(A, new THREE.CylinderGeometry(0.036, 0.036, 0.03, 16), creamD, 0, -0.316, 0, 0.0016);
    part(A, ell(0.028, 0.04, 0.022, 12, 10), skin, 0, -0.368, 0, 0.0014, INK_SKIN);
    part(A, ell(0.011, 0.022, 0.012, 8, 6), skin, s * -0.024, -0.354, 0.008, 0.001, INK_SKIN);
    A.rotation.z = s * 0.07;
    arms.push(A);
  });

  // Head
  const head = new THREE.Group();
  head.position.set(0, 1.17, 0);
  body.add(head);

  const HX = 0.145,
    HY = 0.155,
    HZ = 0.138;
  const taper = (v: number) => 1 - 0.28 * Math.pow(Math.max(0, (-v - 0.12) / 0.88), 1.4);
  const fg = new THREE.SphereGeometry(1, 48, 36);
  const fp = fg.attributes.position;
  for (let i = 0; i < fp.count; i++) {
    const u = fp.getX(i);
    const v = fp.getY(i);
    const w = fp.getZ(i);
    const k = taper(v);
    fp.setXYZ(i, HX * k * u, HY * v, HZ * k * w);
  }
  fg.computeVertexNormals();
  part(head, fg, skin, 0, 0, 0, 0.0018, INK_SKIN);

  function surfZ(x: number, y: number) {
    const v = y / HY;
    if (Math.abs(v) >= 1) return 0;
    const k = taper(v);
    const u = x / (HX * k);
    return HZ * k * Math.sqrt(Math.max(0, 1 - u * u - v * v));
  }

  function patch(cx: number, cy: number, w: number, h: number, mat: THREE.Material, off: number, flip: boolean) {
    const geo = new THREE.PlaneGeometry(w, h, 10, 10);
    const p = geo.attributes.position;
    const uv = geo.attributes.uv;
    const cz = surfZ(cx, cy) + off;
    for (let i = 0; i < p.count; i++) {
      const x = cx + p.getX(i);
      const y = cy + p.getY(i);
      p.setXYZ(i, p.getX(i), p.getY(i), surfZ(x, y) + off - cz);
      if (flip) uv.setX(i, 1 - uv.getX(i));
    }
    const m = new THREE.Mesh(geo, mat);
    m.position.set(cx, cy, cz);
    head.add(m);
    return m;
  }

  const flat = (o: THREE.MeshBasicMaterialParameters) =>
    Object.assign(
      {
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      },
      o
    );

  // Eyes texture
  const eyeTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d')!;
    const eye = new Path2D();
    eye.moveTo(18, 148);
    eye.bezierCurveTo(38, 72, 178, 58, 238, 118);
    eye.bezierCurveTo(222, 194, 82, 210, 18, 148);
    eye.closePath();
    x.save();
    x.clip(eye);
    x.fillStyle = '#fffaf2';
    x.fillRect(0, 0, 256, 256);

    const grTop = x.createLinearGradient(0, 60, 0, 130);
    grTop.addColorStop(0, 'rgba(110,70,60,.5)');
    grTop.addColorStop(1, 'rgba(110,70,60,0)');
    x.fillStyle = grTop;
    x.fillRect(0, 60, 256, 80);

    x.save();
    x.translate(128, 140);
    x.scale(0.82, 1);
    const gr = x.createLinearGradient(0, -60, 0, 60);
    gr.addColorStop(0, '#1a0a05');
    gr.addColorStop(0.45, '#4e2a10');
    gr.addColorStop(1, '#9a5a28');
    x.fillStyle = gr;
    x.beginPath();
    x.arc(0, 0, 62, 0, Math.PI * 2);
    x.fill();

    const rad = x.createRadialGradient(0, 36, 2, 0, 36, 44);
    rad.addColorStop(0, 'rgba(255,210,140,.9)');
    rad.addColorStop(1, 'rgba(255,210,140,0)');
    x.fillStyle = rad;
    x.beginPath();
    x.arc(0, 0, 62, 0, Math.PI * 2);
    x.fill();

    x.fillStyle = '#120704';
    x.beginPath();
    x.ellipse(0, 4, 22, 30, 0, 0, Math.PI * 2);
    x.fill();

    x.strokeStyle = '#180804';
    x.lineWidth = 7;
    x.beginPath();
    x.arc(0, 0, 62, 0, Math.PI * 2);
    x.stroke();
    x.restore();

    x.fillStyle = '#ffffff';
    x.beginPath();
    x.ellipse(94, 106, 16, 19, -0.35, 0, Math.PI * 2);
    x.fill();
    x.globalAlpha = 0.85;
    x.beginPath();
    x.arc(154, 160, 8, 0, Math.PI * 2);
    x.fill();
    x.globalAlpha = 1;
    x.restore();

    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.strokeStyle = '#160903';
    x.lineWidth = 16;
    x.beginPath();
    x.moveTo(16, 150);
    x.bezierCurveTo(38, 72, 178, 58, 238, 118);
    x.stroke();

    x.lineWidth = 9;
    x.beginPath();
    x.moveTo(220, 108);
    x.quadraticCurveTo(248, 104, 254, 88);
    x.stroke();

    x.lineWidth = 6;
    x.beginPath();
    x.moveTo(196, 86);
    x.quadraticCurveTo(222, 86, 234, 70);
    x.stroke();

    x.strokeStyle = 'rgba(80,40,28,.55)';
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(26, 154);
    x.bezierCurveTo(90, 210, 194, 196, 228, 132);
    x.stroke();

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  const blushTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d')!;
    const gr = x.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,120,110,.5)');
    gr.addColorStop(1, 'rgba(255,120,110,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  const eyeMat = new THREE.MeshBasicMaterial(flat({ map: eyeTex }));
  const blushMat = new THREE.MeshBasicMaterial(flat({ map: blushTex, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  const eyes: THREE.Mesh[] = [];

  [-1, 1].forEach((s) => {
    eyes.push(patch(s * 0.062, -0.018, 0.098, 0.098, eyeMat, 0.0014, s < 0));
    patch(s * 0.088, -0.06, 0.062, 0.042, blushMat, 0.001, false);
  });

  const inkB = (c: number) => new THREE.MeshBasicMaterial({ color: c });
  const onFace = (pts: [number, number][], off: number) =>
    pts.map((q) => new THREE.Vector3(q[0], q[1], surfZ(q[0], q[1]) + off));

  [-1, 1].forEach((s) => {
    const c = new THREE.CatmullRomCurve3(
      onFace(
        [
          [s * 0.022, 0.072],
          [s * 0.054, 0.081],
          [s * 0.092, 0.068],
        ],
        0.003
      )
    );
    head.add(new THREE.Mesh(new THREE.TubeGeometry(c, 14, 0.005, 6), inkB(0x2a1508)));
  });

  // Mouth
  head.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(
          onFace(
            [
              [-0.024, -0.082],
              [-0.012, -0.09],
              [0.012, -0.09],
              [0.024, -0.082],
            ],
            0.002
          )
        ),
        12,
        0.0022,
        5
      ),
      inkB(0x7a3228)
    )
  );

  // Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), inkB(0xd89a7a));
  nose.position.set(0, -0.05, surfZ(0, -0.05) + 0.003);
  nose.scale.set(1, 0.65, 0.65);
  head.add(nose);

  // Hair
  const PI = Math.PI;
  const HH = { x: HX, y: HY, z: HZ };
  const hp = (th: number, ph: number, s: number) =>
    new THREE.Vector3(-HH.x * s * Math.sin(th) * Math.cos(ph), HH.y * s * Math.cos(th), HH.z * s * Math.sin(th) * Math.sin(ph));

  function lockGeo(pts: THREE.Vector3[], w0: number, th0: number) {
    const curve = new THREE.CatmullRomCurve3(pts),
      N = 16,
      M = 8,
      pos: number[] = [],
      idx: number[] = [],
      o = pts[0];
    for (let i = 0; i <= N; i++) {
      const t2 = i / N,
        p = curve.getPointAt(t2),
        tg = curve.getTangentAt(t2).normalize(),
        n = p.clone().normalize();
      let b = new THREE.Vector3().crossVectors(tg, n);
      if (b.lengthSq() < 1e-8) b.set(1, 0, 0);
      b.normalize();
      const n2 = new THREE.Vector3().crossVectors(b, tg).normalize();
      const w = w0 * Math.pow(1 - t2, 0.65) * Math.min(1, 0.5 + t2 * 5),
        th = th0 * Math.pow(1 - t2, 0.55);
      for (let j = 0; j < M; j++) {
        const a = (j / M) * PI * 2,
          ca = Math.cos(a) * w,
          sa = Math.sin(a) * th;
        pos.push(p.x - o.x + b.x * ca + n2.x * sa, p.y - o.y + b.y * ca + n2.y * sa, p.z - o.z + b.z * ca + n2.z * sa);
      }
    }
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < M; j++) {
        const a = i * M + j,
          b = i * M + ((j + 1) % M),
          c = (i + 1) * M + j,
          d = (i + 1) * M + ((j + 1) % M);
        idx.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  const hairGroup = new THREE.Group();
  head.add(hairGroup);

  function lock(spec: [number, number, number][], w: number, th: number, mat: THREE.Material) {
    const pts = spec.map((q) => hp(q[0], q[1], q[2]));
    const m = new THREE.Mesh(lockGeo(pts, w, th), mat);
    m.position.copy(pts[0]);
    m.castShadow = true;
    hairGroup.add(m);
    hull(m, 0.003, INK);
    return m;
  }

  const capG = new THREE.SphereGeometry(1, 48, 24, 0, PI * 2, 0, PI * 0.28);
  capG.scale(HX * 1.1, HY * 1.1, HZ * 1.1);
  const cap = new THREE.Mesh(capG, hairM);
  hairGroup.add(cap);
  hull(cap, 0.0032, INK);

  const backG = new THREE.SphereGeometry(1, 48, 32, PI / 2 + 0.7, PI * 2 - 1.4, PI * 0.18, PI * 0.72);
  backG.scale(HX * 1.12, HY * 1.22, HZ * 1.14);
  const back = new THREE.Mesh(backG, hairM);
  back.position.set(0, -0.06, 0.02);
  hairGroup.add(back);
  hull(back, 0.0032, INK);

  const ringG = new THREE.SphereGeometry(1, 48, 4, PI / 2 + 0.75, PI * 2 - 1.5, PI * 0.16, PI * 0.08);
  ringG.scale(HX * 1.115, HY * 1.115, HZ * 1.115);
  hairGroup.add(new THREE.Mesh(ringG, hairHi));

  const bunG = new THREE.SphereGeometry(1, 20, 16);
  bunG.scale(HX * 0.62, HY * 0.52, HZ * 0.62);
  const bun = new THREE.Mesh(bunG, hairM);
  bun.position.set(0, -HY * 0.82, HZ * 0.05);
  hairGroup.add(bun);
  hull(bun, 0.0028, INK);

  const ribG = new THREE.TorusGeometry(HX * 0.38, 0.014, 6, 20, PI * 1.2);
  const rib = new THREE.Mesh(ribG, tn('#c82840'));
  rib.position.set(0, -HY * 0.82, HZ * 0.05);
  rib.rotation.x = PI / 2;
  hairGroup.add(rib);

  [-1, 1].forEach((s) => {
    const f = (a: number) => PI / 2 + s * a;
    lock(
      [
        [0.1, f(0.06), 1.04],
        [0.28, f(0.18), 1.12],
        [0.6, f(0.52), 1.11],
        [0.94, f(0.92), 1.065],
      ],
      0.058,
      0.018,
      hairM
    );
    lock(
      [
        [0.1, f(0.02), 1.04],
        [0.28, f(0.08), 1.12],
        [0.63, f(0.28), 1.1],
        [1.0, f(0.5), 1.055],
      ],
      0.05,
      0.016,
      hairL
    );
    lock(
      [
        [0.09, f(0), 1.04],
        [0.22, f(0.03), 1.12],
        [0.44, f(0.12), 1.1],
        [0.72, f(0.22), 1.07],
      ],
      0.034,
      0.012,
      hairM
    );
  });

  [-1, 1].forEach((s) => {
    const f = (a: number) => PI / 2 + s * a;
    lock(
      [
        [0.52, f(0.88), 1.05],
        [0.76, f(0.95), 1.12],
        [1.28, f(1.08), 1.11],
        [1.9, f(1.02), 1.11],
        [2.18, f(1.18), 1.2],
      ],
      0.062,
      0.018,
      hairM
    );
    lock(
      [
        [0.68, f(0.76), 1.05],
        [0.92, f(0.8), 1.11],
        [1.22, f(0.86), 1.09],
        [1.58, f(0.88), 1.09],
      ],
      0.04,
      0.014,
      hairL
    );
  });

  for (let i = 0; i < 8; i++) {
    const ph = PI / 2 + 0.9 + (i * (PI * 2 - 1.8)) / 7;
    const alt = i % 2 ? hairL : hairM;
    lock(
      [
        [0.05, ph, 1.09],
        [0.32, ph + 0.08, 1.14],
        [0.68, ph + 0.14, 1.13],
        [1.06, ph + 0.19, 1.12],
      ],
      0.054,
      0.015,
      alt
    );
  }

  const tufts: THREE.Mesh[] = [];
  for (let i = 0; i < 11; i++) {
    const ph = PI / 2 + 0.98 + (i * (PI * 2 - 1.96)) / 10;
    const alt = i % 2 ? hairL : hairM;
    const d = i % 2 ? 0.1 : -0.08;
    const m = lock(
      [
        [1.8, ph, 1.09],
        [2.26, ph + d * 0.5, 1.13],
        [2.68, ph + d, 1.24],
      ],
      0.05,
      0.015,
      alt
    );
    m.userData.rx = m.rotation.x;
    tufts.push(m);
  }

  // Yellow Hairpins
  [-1, 1].forEach((k) => {
    const pos = hp(0.8 + k * 0.05, PI / 2 - 0.78, 1.125);
    const nrm = pos.clone().normalize();
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.013, 0.009), clip);
    c.position.copy(pos);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
    c.rotateZ(0.72);
    head.add(c);
  });

  procGroup.traverse((o) => {
    if (o instanceof THREE.Mesh) o.receiveShadow = false;
  });

  // Face meshes with morph targets for natural anime eye blinking
  const faceMorphMeshes: THREE.Mesh[] = [];
  let isBlinking = false;
  let currentBlink = 0;

  const setBlink = (b: boolean) => {
    isBlinking = b;
    // Procedural model eyes
    const s = b ? 0.12 : 1;
    eyes.forEach((e) => {
      e.scale.y = s;
    });

    // GLB VRoid model morph-targets (instant key)
    const inf = b ? 1.0 : 0.0;
    faceMorphMeshes.forEach((mesh) => {
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        const dict = mesh.morphTargetDictionary;
        const targets = mesh.morphTargetInfluences;
        const closeIdx = dict['Fcl_EYE_Close'];
        if (closeIdx !== undefined) targets[closeIdx] = inf;
        const iris = dict['Fcl_EYE_Iris_Hide'];
        if (iris !== undefined) targets[iris] = inf;
        const hl = dict['Fcl_EYE_Highlight_Hide'];
        if (hl !== undefined) targets[hl] = inf;
        const closeL = dict['Fcl_EYE_Close_L'];
        const closeR = dict['Fcl_EYE_Close_R'];
        if (closeL !== undefined && closeIdx === undefined) targets[closeL] = inf;
        if (closeR !== undefined && closeIdx === undefined) targets[closeR] = inf;
      }
    });
  };

  rootGroup.position.set(initialX, 0, initialZ);

  // GLB Model & generated idle animation.
  let glbModel: THREE.Group | null = null;
  let glbMixer: THREE.AnimationMixer | null = null;
  let idleAction: THREE.AnimationAction | null = null;
  let glbLoaded = false;
  const boneMap: Record<string, THREE.Bone> = {};
  const initialQuat: Record<string, THREE.Quaternion> = {};

  const setupIdleMixer = (model: THREE.Group) => {
    if (glbMixer) {
      glbMixer.stopAllAction();
      glbMixer.uncacheRoot(model);
    }
    const idleClip = createIdleAnimationClip(model);
    glbMixer = new THREE.AnimationMixer(model);
    idleAction = glbMixer.clipAction(idleClip);
    idleAction.setLoop(THREE.LoopRepeat, Infinity);
    idleAction.play();
  };

  const loader = new GLTFLoader();
  const GLB_URL = '/models/florie.glb';

  loader.load(
    GLB_URL,
    (gltf) => {
      glbModel = gltf.scene;
      glbModel.scale.setScalar(1);

      // Enhance materials for bright anime rendering with harmonized brown hair and natural light beige skin
      glbModel.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;

          // Collect face meshes for blendshape / morph target blinking
          if (o.morphTargetDictionary && o.morphTargetInfluences) {
            faceMorphMeshes.push(o);
          }

          const materials = Array.isArray(o.material) ? o.material : [o.material];
          materials.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.roughness = 0.45;
              mat.metalness = 0.04;
              mat.envMapIntensity = 1.0;
              if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
              const name = (mat.name || '').toLowerCase();

              if (name.includes('hairback')) {
                // Back hair: cancel the orange/reddish undertone and match the front chocolate brown hair
                mat.color.setRGB(0.44, 0.30, 0.18);
                mat.emissive = new THREE.Color(0x120a06);
                mat.emissiveIntensity = 0.10;
              } else if (name.includes('hair')) {
                // Front hair: rich, uniform chocolate brown
                mat.color.setRGB(0.92, 0.88, 0.84);
                mat.emissive = new THREE.Color(0x120a06);
                mat.emissiveIntensity = 0.10;
              } else if (name.includes('brow') || name.includes('eyelash') || name.includes('eyeline')) {
                // Eyebrows and eyelashes: crisp dark chocolate espresso
                mat.color.setHex(0x221108);
                mat.emissive = new THREE.Color(0x100804);
                mat.emissiveIntensity = 0.10;
              } else if (name.includes('mouth')) {
                // Mouth / lips: natural warm rose-coral
                mat.color.setHex(0xc46e66);
                mat.emissive = new THREE.Color(0x26100e);
                mat.emissiveIntensity = 0.12;
              } else if (
                (name.includes('skin') || name.includes('face') || name.includes('body')) &&
                !name.includes('eye')
              ) {
                // Skin: natural light beige complexion, not stark white or washed out
                // Texture base is pale peach, multiplying by warm beige gives a healthy, soft beige
                mat.color.setRGB(0.86, 0.72, 0.62);
                mat.emissive = new THREE.Color(0x1a120c);
                mat.emissiveIntensity = 0.08;
              } else if (name.includes('eye') || name.includes('iris') || name.includes('highlight') || name.includes('eyewhite')) {
                mat.emissive = new THREE.Color(0x303030);
                mat.emissiveIntensity = 0.25;
              } else if (name.includes('cloth') || name.includes('tops') || name.includes('shoes')) {
                mat.emissive = new THREE.Color(0x1e1610);
                mat.emissiveIntensity = 0.20;
              }
            }
          });
        }

        if (o.type === 'Bone') {
          const bone = o as THREE.Bone;
          const n = bone.name;
          if (n.toLowerCase().includes('collider')) return;

          boneMap[n] = bone;
          initialQuat[n] = bone.quaternion.clone();

          if (n === 'J_Bip_C_Hips') {
            boneMap._hips = bone;
            initialQuat._hips = bone.quaternion.clone();
          }
          if (n === 'J_Bip_C_Spine') {
            boneMap._spine = bone;
            initialQuat._spine = bone.quaternion.clone();
          }
          if (n === 'J_Bip_C_Neck') {
            boneMap._neck = bone;
            initialQuat._neck = bone.quaternion.clone();
          }
          if (n === 'J_Bip_C_Head') {
            boneMap._head = bone;
            initialQuat._head = bone.quaternion.clone();
          }
          if (n === 'J_Bip_L_UpperLeg') {
            boneMap._lLeg = bone;
            initialQuat._lLeg = bone.quaternion.clone();
          }
          if (n === 'J_Bip_R_UpperLeg') {
            boneMap._rLeg = bone;
            initialQuat._rLeg = bone.quaternion.clone();
          }
          if (n === 'J_Bip_L_LowerLeg') {
            boneMap._lKnee = bone;
            initialQuat._lKnee = bone.quaternion.clone();
          }
          if (n === 'J_Bip_R_LowerLeg') {
            boneMap._rKnee = bone;
            initialQuat._rKnee = bone.quaternion.clone();
          }
          if (n === 'J_Bip_L_UpperArm') {
            boneMap._lArm = bone;
            initialQuat._lArm = bone.quaternion.clone();
          }
          if (n === 'J_Bip_R_UpperArm') {
            boneMap._rArm = bone;
            initialQuat._rArm = bone.quaternion.clone();
          }
          if (n === 'J_Bip_L_LowerArm') {
            boneMap._lForearm = bone;
            initialQuat._lForearm = bone.quaternion.clone();
          }
          if (n === 'J_Bip_R_LowerArm') {
            boneMap._rForearm = bone;
            initialQuat._rForearm = bone.quaternion.clone();
          }
        }
      });

      glbLoaded = true;
      rootGroup.add(glbModel);

      // Set active model to glb if activeModel is 'glb'
      if (activeModel === 'glb') {
        procGroup.visible = false;
        glbModel.visible = true;
      } else {
        glbModel.visible = false;
        procGroup.visible = true;
      }

      // Build the generated gentle idle from the model's rest pose.
      setupIdleMixer(glbModel);
    },
    undefined,
    () => {
      glbLoaded = false;
      activeModel = 'procedural';
      procGroup.visible = true;
    }
  );

  const setActiveModel = (type: 'procedural' | 'glb') => {
    activeModel = type;
    if (type === 'glb' && glbModel) {
      procGroup.visible = false;
      glbModel.visible = true;
    } else {
      procGroup.visible = true;
      if (glbModel) glbModel.visible = false;
    }
  };

  const updateAnimation = (
    dt: number,
    time: number,
    phase: number,
    walk: number,
    isShift: boolean
  ) => {
    const s = Math.sin(phase);
    const amp = walk * (isShift ? 0.85 : 0.6);

    // 1. Update smooth blink on GLB morph targets
    const targetBlink = isBlinking ? 1.0 : 0.0;
    const blinkSpeed = isBlinking ? 38 : 22;
    currentBlink += (targetBlink - currentBlink) * Math.min(1, dt * blinkSpeed);

    faceMorphMeshes.forEach((mesh) => {
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        const dict = mesh.morphTargetDictionary;
        const targets = mesh.morphTargetInfluences;
        const closeIdx = dict['Fcl_EYE_Close'];
        if (closeIdx !== undefined) targets[closeIdx] = currentBlink;
        const iris = dict['Fcl_EYE_Iris_Hide'];
        if (iris !== undefined) targets[iris] = currentBlink * 0.95;
        const hl = dict['Fcl_EYE_Highlight_Hide'];
        if (hl !== undefined) targets[hl] = currentBlink * 0.95;
        const closeL = dict['Fcl_EYE_Close_L'];
        const closeR = dict['Fcl_EYE_Close_R'];
        if (closeL !== undefined && closeIdx === undefined) targets[closeL] = currentBlink;
        if (closeR !== undefined && closeIdx === undefined) targets[closeR] = currentBlink;
      }
    });

    // 2. Character body animation
    if (activeModel === 'glb' && glbModel && glbModel.visible) {
      const walkWeight = Math.min(1, walk * 2.0);
      const idleWeight = 1 - walkWeight;

      if (glbMixer) {
        if (idleAction) {
          idleAction.setEffectiveWeight(idleWeight);
        }
        glbMixer.update(dt);
      }

      if (walkWeight > 0.02) {
        // Blend walk cycle on legs
        if (boneMap._lLeg && initialQuat._lLeg) {
          const swingQ = initialQuat._lLeg.clone();
          swingQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), s * amp * 0.65));
          boneMap._lLeg.quaternion.slerp(swingQ, walkWeight);
        }
        if (boneMap._rLeg && initialQuat._rLeg) {
          const swingQ = initialQuat._rLeg.clone();
          swingQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -s * amp * 0.65));
          boneMap._rLeg.quaternion.slerp(swingQ, walkWeight);
        }

        // Arm swing when walking
        if (boneMap._lArm && initialQuat._lArm) {
          const armQ = initialQuat._lArm.clone();
          const armEuler = new THREE.Euler(-1.25, 0, s * amp * 0.45, 'YXZ');
          armQ.multiply(new THREE.Quaternion().setFromEuler(armEuler));
          boneMap._lArm.quaternion.slerp(armQ, walkWeight);
        }
        if (boneMap._rArm && initialQuat._rArm) {
          const armQ = initialQuat._rArm.clone();
          const armEuler = new THREE.Euler(-1.25, 0, -s * amp * 0.45, 'YXZ');
          armQ.multiply(new THREE.Quaternion().setFromEuler(armEuler));
          boneMap._rArm.quaternion.slerp(armQ, walkWeight);
        }

        if (boneMap._head && initialQuat._head) {
          boneMap._head.rotateY(Math.sin(phase * 0.5) * 0.02 * walk);
        }
      } else if (!glbMixer) {
        // Fallback procedural pose if FBX animation is still loading
        if (boneMap._lArm && initialQuat._lArm) {
          boneMap._lArm.quaternion.copy(initialQuat._lArm);
          boneMap._lArm.rotateX(-1.25);
        }
        if (boneMap._rArm && initialQuat._rArm) {
          boneMap._rArm.quaternion.copy(initialQuat._rArm);
          boneMap._rArm.rotateX(-1.25);
        }
        if (boneMap._spine && initialQuat._spine) {
          const breathe = Math.sin(time * 2) * 0.005;
          boneMap._spine.quaternion.copy(initialQuat._spine);
          boneMap._spine.rotateX(breathe);
        }
      }
    } else {
      // Procedural model animation
      legs[0].rotation.x = s * amp;
      legs[1].rotation.x = -s * amp;
      arms[0].rotation.x = -s * amp * 0.8;
      arms[1].rotation.x = s * amp * 0.8;
      const breathe = Math.sin(time * 2) * 0.004 * (1 - walk);
      body.position.y = Math.abs(Math.cos(phase)) * 0.035 * walk + breathe;
      skirt.rotation.z = Math.sin(phase) * 0.035 * walk;
      head.rotation.z = Math.sin(phase * 0.5) * 0.03 * walk;
      tufts.forEach((o, i) => {
        o.rotation.x = (o.userData.rx as number) + Math.sin(time * 3 + i) * 0.06 * (0.3 + walk * 1.4);
      });
    }
  };

  const dispose = () => {
    procGroup.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry?.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else if (o.material) o.material.dispose();
      }
    });
    if (glbModel) {
      glbModel.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry?.dispose();
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else if (o.material) o.material.dispose();
        }
      });
    }
  };

  return {
    group: rootGroup,
    body,
    head,
    legs,
    arms,
    eyes,
    tufts,
    skirt,
    setBlink,
    updateAnimation,
    isGlbLoaded: () => glbLoaded,
    getActiveModel: () => activeModel,
    setActiveModel,
    dispose,
  };
}
