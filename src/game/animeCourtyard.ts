/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';
import { BoundingBox } from './physics';

/** Detailed entrance trim, animated double doors and extra courtyard finishing. */
export function buildAnimeCourtyard(scene: THREE.Scene, boxes: BoundingBox[], isSoftwareGl: boolean): void {
  const mat = (color: number, roughness = 0.82, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  const stone = mat(0xd8c8a9);
  const stoneHi = mat(0xf0e4ca, 0.76);
  const bronze = mat(0x443832, 0.42, { metalness: 0.42 });
  const glass = mat(0x91b6c4, 0.16, { metalness: 0.18, transparent: true, opacity: 0.72 });
  const glassDark = mat(0x527483, 0.22, { metalness: 0.2 });
  const wood = mat(0x74503c, 0.78);
  const woodHi = mat(0xa9825d, 0.78);
  const foliage = [mat(0x567d4d, 0.94), mat(0x789b60, 0.94), mat(0x496b46, 0.94)];
  const pinks = [mat(0xc8788e), mat(0xe9b7c0), mat(0xf4d9d4)];
  const soil = mat(0x514638, 1);

  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = scene) => {
    const result = new THREE.Mesh(geometry, material);
    result.castShadow = !isSoftwareGl;
    result.receiveShadow = !isSoftwareGl;
    parent.add(result);
    return result;
  };
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material, parent: THREE.Object3D = scene) => {
    const result = mesh(new THREE.BoxGeometry(w, h, d), material, parent);
    result.position.set(x, y, z);
    return result;
  };
  const sphere = (r: number, x: number, y: number, z: number, material: THREE.Material, parent: THREE.Object3D = scene) => {
    const result = mesh(new THREE.SphereGeometry(r, 24, 18), material, parent);
    result.position.set(x, y, z);
    return result;
  };

  // Layered limestone portal, capstones, fine seams and a crest plate.
  [-3.35, 3.35].forEach((x) => {
    box(0.34, 7.35, 0.48, x, 3.65, -7.52, stone);
    box(0.52, 0.32, 0.62, x, 0.18, -7.5, stoneHi);
    box(0.52, 0.32, 0.62, x, 7.2, -7.5, stoneHi);
    for (let y = 1.15; y < 6.8; y += 1.25) box(0.39, 0.035, 0.5, x, y, -7.25, stoneHi);
  });
  box(7.25, 0.32, 0.52, 0, 7.35, -7.5, stone);
  box(8.15, 0.18, 0.66, 0, 7.6, -7.5, stoneHi);
  box(9.4, 0.16, 0.58, 0, 9.02, -7.7, stone);
  box(9.55, 0.07, 0.6, 0, 8.88, -7.7, stoneHi);
  box(2.4, 1.22, 0.16, 0, 10.15, -5.69, bronze);
  box(2.24, 1.06, 0.08, 0, 10.15, -5.58, stoneHi);

  // Hide the prototype's flat glazing behind the functional door leaves; preserve frame and arch.
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object.position.z > -5.84 || object.position.z < -5.97) return;
    if (Math.abs(object.position.x) > 3.1 || object.position.y > 3.5) return;
    const dimensions = object.geometry.boundingBox;
    if (!dimensions) object.geometry.computeBoundingBox();
    const box3 = object.geometry.boundingBox;
    if (box3 && (box3.max.y - box3.min.y) > 1.5) object.visible = false;
  });

  // Hinged double doors. Each leaf pivots around its outside jamb and swings toward the courtyard.
  const doorGroup = new THREE.Group();
  doorGroup.position.set(0, 0, -5.76);
  scene.add(doorGroup);
  const leaves: Array<{ group: THREE.Group; side: number }> = [];
  const leafWidth = 1.44;
  const doorHeight = 3.12;
  [-1, 1].forEach((side) => {
    const leaf = new THREE.Group();
    leaf.position.x = side * leafWidth;
    doorGroup.add(leaf);
    leaves.push({ group: leaf, side });
    const center = -side * leafWidth / 2;
    box(leafWidth - 0.06, doorHeight, 0.13, center, doorHeight / 2, 0, bronze, leaf);
    box(leafWidth - 0.22, doorHeight - 0.2, 0.045, center, doorHeight / 2 + 0.01, 0.083, glass, leaf);
    box(leafWidth - 0.22, 0.12, 0.08, center, 1.08, 0.11, bronze, leaf);
    box(0.075, doorHeight - 0.18, 0.09, center, doorHeight / 2, 0.11, bronze, leaf);
    // Brushed-metal pull handles and protective kick plates.
    box(0.055, 0.48, 0.08, -side * 0.17, 1.28, 0.16, stoneHi, leaf);
    const handle = mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.06, 16), bronze, leaf);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(-side * 0.17, 1.53, 0.17);
    box(0.3, 0.32, 0.1, center, 0.28, 0.14, glassDark, leaf);
    box(0.3, 0.24, 0.1, center, doorHeight - 0.28, 0.14, glassDark, leaf);
    // Subtle vertical glass reflection.
    box(0.055, 1.65, 0.012, center - side * 0.34, 2.15, 0.113, stoneHi, leaf).material = mat(0xeaf5f3, 0.25, { transparent: true, opacity: 0.34 });
  });
  // Transom, side lights and polished threshold.
  box(3.08, 0.12, 0.18, 0, 3.2, -5.66, stoneHi);
  [-1.63, 1.63].forEach((x) => {
    box(0.12, 3.1, 0.13, x, 1.58, -5.68, bronze);
    box(0.96, 2.92, 0.055, x, 1.58, -5.59, glass);
    box(1.02, 0.12, 0.14, x, 3.11, -5.62, stoneHi);
    box(1.02, 0.12, 0.14, x, 0.07, -5.62, stoneHi);
  });
  box(3.05, 0.06, 0.72, 0, 0.045, -5.45, stoneHi);
  // Keep the doorway traversable only while the door is swung open.
  const doorBlock: BoundingBox = { x0: -1.44, x1: 1.44, z0: -5.92, z1: -5.68 };
  boxes.push(doorBlock);

  let opened = false;
  let angle = 0;
  let previousTime = performance.now();
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat || event.key.toLowerCase() !== 'e') return;
    opened = !opened;
    if (opened) {
      const index = boxes.indexOf(doorBlock);
      if (index >= 0) boxes.splice(index, 1);
    } else if (!boxes.includes(doorBlock)) {
      boxes.push(doorBlock);
    }
  };
  window.addEventListener('keydown', onKeyDown);
  doorGroup.onBeforeRender = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - previousTime) / 1000);
    previousTime = now;
    const target = opened ? 1.12 : 0;
    angle += (target - angle) * Math.min(1, dt * 4.5);
    leaves.forEach(({ group, side }) => {
      group.rotation.y = -side * angle;
    });
  };
  const cleanup = scene.userData.cleanupCallbacks as Array<() => void> | undefined;
  if (cleanup) cleanup.push(() => window.removeEventListener('keydown', onKeyDown));
  else scene.userData.cleanupCallbacks = [() => window.removeEventListener('keydown', onKeyDown)];

  // Fine window trim and small warm sconces around the entry.
  [-1, 1].forEach((side) => {
    [9.5, 14, 18.5, 23, 27.5].forEach((offset) => {
      [1.25, 5.4].forEach((y) => {
        const x = side * offset;
        box(2.94, 0.12, 0.36, x, y - 1.12, -9.48, stone);
        box(2.84, 0.08, 0.28, x, y + 1.2, -9.49, stoneHi);
        box(0.07, 2.14, 0.1, x, y, -9.53, bronze);
      });
    });
  });
  const sconce = new THREE.MeshStandardMaterial({ color: 0xffe6a8, emissive: 0xffc968, emissiveIntensity: 0.55, roughness: 0.36 });
  [-2.55, 2.55].forEach((x) => {
    box(0.28, 0.38, 0.14, x, 4.05, -7.32, bronze);
    box(0.19, 0.25, 0.1, x, 4.05, -7.22, sconce);
    box(0.36, 0.06, 0.18, x, 4.26, -7.32, bronze);
  });

  // Raised symmetrical flower beds: rounded foliage with layered petals and leaf accents.
  const makeFlowerBed = (x: number, z: number) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    scene.add(group);
    box(5.3, 0.24, 1.42, 0, 0.12, 0, stone, group);
    box(4.96, 0.1, 1.12, 0, 0.28, 0, soil, group);
    [-2.34, 2.34].forEach((edge) => box(0.12, 0.34, 1.34, edge, 0.22, 0, stoneHi, group));
    for (let i = 0; i < 10; i++) {
      const px = -2.05 + i * 0.45;
      const plant = sphere(0.27 + (i % 3) * 0.025, px, 0.56 + (i % 2) * 0.04, i % 2 ? 0.2 : -0.18, foliage[i % foliage.length], group);
      plant.scale.set(1.15, 0.86, 0.9);
      if (i % 2 === 0) {
        const center = sphere(0.085, px, 0.91, 0.04, pinks[i % pinks.length], group);
        for (let p = 0; p < 5; p++) {
          const petal = sphere(0.055, px + Math.cos(p * Math.PI * 0.4) * 0.095, 0.92, 0.04 + Math.sin(p * Math.PI * 0.4) * 0.095, pinks[(i + p + 1) % pinks.length], group);
          petal.scale.set(1, 0.72, 1);
        }
        center.scale.set(0.7, 0.7, 0.7);
      }
    }
  };
  [[-10.2, 10.2], [10.2, 10.2], [-18.2, 20.5], [18.2, 20.5]].forEach(([x, z]) => makeFlowerBed(x, z));

  // Slatted benches with iron legs and backrests.
  const makeBench = (x: number, z: number) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    scene.add(group);
    for (let i = 0; i < 4; i++) {
      box(2.25, 0.085, 0.15, 0, 0.52, -0.23 + i * 0.15, i % 2 ? woodHi : wood, group);
      box(2.25, 0.08, 0.15, 0, 1.03, -0.57 + i * 0.15, i % 2 ? wood : woodHi, group);
    }
    [-0.86, 0.86].forEach((xSide) => {
      box(0.11, 0.52, 0.12, xSide, 0.27, 0, bronze, group);
      box(0.11, 0.11, 0.88, xSide, 0.5, 0.02, bronze, group);
      box(0.11, 0.72, 0.12, xSide, 0.84, -0.48, bronze, group);
    });
    boxes.push({ x0: x - 1.3, x1: x + 1.3, z0: z - 0.85, z1: z + 0.85 });
  };
  makeBench(-7.3, 18.4);
  makeBench(7.3, 18.4);

  // Blossom trees use smooth, overlapping canopy clusters for a softer silhouette.
  const makeTree = (x: number, z: number, scale: number) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    scene.add(group);
    const trunk = mesh(new THREE.CylinderGeometry(0.18, 0.28, 3.1, 24), wood, group);
    trunk.position.y = 1.55;
    [[-0.7, 3.45, 0.05, 0.9], [0.65, 3.52, 0.08, 0.86], [0, 4.08, 0, 1.04], [-0.2, 3.75, 0.52, 0.72], [0.28, 3.72, -0.5, 0.72]].forEach(([cx, cy, cz, r], i) => {
      const crown = sphere(r, cx, cy, cz, pinks[i % 3], group);
      crown.scale.set(1.08, 0.86, 1);
    });
    for (let i = 0; i < 30; i++) {
      const a = i * 2.399;
      const radius = 0.35 + ((i * 17) % 11) * 0.055;
      const bud = sphere(0.075 + (i % 3) * 0.012, Math.cos(a) * radius, 3.35 + ((i * 7) % 13) * 0.075, Math.sin(a) * radius, pinks[i % 3], group);
      bud.scale.set(1.1, 0.8, 1);
    }
    boxes.push({ x0: x - 0.48 * scale, x1: x + 0.48 * scale, z0: z - 0.48 * scale, z1: z + 0.48 * scale });
  };
  makeTree(-18, 13.5, 1.08);
  makeTree(18, 13.5, 1.08);

  // Thin stone inlays make the route to the entrance more intentional.
  const paving = mat(0xb9a98c, 0.88);
  for (let z = -0.6; z <= 18; z += 2.8) {
    box(0.075, 0.012, 1.72, -2.55, 0.09, z, paving);
    box(0.075, 0.012, 1.72, 2.55, 0.09, z, paving);
  }
  const entryLight = new THREE.PointLight(0xffe8c7, 0.55, 10, 2);
  entryLight.position.set(0, 3.1, -4.6);
  scene.add(entryLight);

  // Keyboard hint. This is intentionally a small in-world HUD tag and cleans itself up with the scene.
  const hint = document.createElement('div');
  hint.textContent = 'E  ·  Ouvrir / fermer la porte';
  hint.setAttribute('aria-live', 'polite');
  Object.assign(hint.style, {
    position: 'fixed', bottom: '92px', left: '50%', transform: 'translateX(-50%)',
    zIndex: '20', padding: '9px 15px', borderRadius: '6px',
    color: '#fff3d6', background: 'rgba(42,24,16,.88)', border: '1px solid rgba(255,243,214,.45)',
    boxShadow: '0 4px 18px rgba(0,0,0,.24)', font: '600 13px system-ui, sans-serif',
    letterSpacing: '.03em', pointerEvents: 'none', opacity: '0', transition: 'opacity 160ms ease',
  });
  document.body.appendChild(hint);
  const cleanup = scene.userData.cleanupCallbacks as Array<() => void> | undefined;
  const dispose = () => {
    window.removeEventListener('keydown', onKeyDown);
    hint.remove();
  };
  if (cleanup) cleanup.push(dispose);
  else scene.userData.cleanupCallbacks = [dispose];
}
