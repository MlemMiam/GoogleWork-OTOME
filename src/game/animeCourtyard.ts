/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';
import { BoundingBox } from './physics';

/** Adds architectural detail and a more restrained, anime-inspired courtyard finish. */
export function buildAnimeCourtyard(
  scene: THREE.Scene,
  boxes: BoundingBox[],
  isSoftwareGl: boolean
) {
  const material = (color: number, roughness = 0.8, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, ...extra });

  const limestone = material(0xd8c8a9, 0.82);
  const limestoneLight = material(0xf0e4ca, 0.78);
  const bronze = material(0x443832, 0.42, { metalness: 0.42 });
  const glass = material(0x91b6c4, 0.16, { metalness: 0.18, transparent: true, opacity: 0.72 });
  const glassShade = material(0x527483, 0.22, { metalness: 0.2 });
  const wood = material(0x74503c, 0.78);
  const woodLight = material(0xa9825d, 0.78);
  const leafGreen = material(0x567d4d, 0.94);
  const leafLight = material(0x789b60, 0.94);
  const blossom = material(0xe9b7c0, 0.88);
  const blossomLight = material(0xf4d9d4, 0.88);
  const petalPink = material(0xc8788e, 0.88);
  const soil = material(0x514638, 1);
  const flowerColors = [petalPink, blossom, blossomLight];

  const addMesh = (geometry: THREE.BufferGeometry, mat: THREE.Material, parent = scene) => {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.castShadow = !isSoftwareGl;
    mesh.receiveShadow = !isSoftwareGl;
    parent.add(mesh);
    return mesh;
  };
  const box = (
    width: number, height: number, depth: number,
    x: number, y: number, z: number,
    mat: THREE.Material, parent = scene
  ) => {
    const mesh = addMesh(new THREE.BoxGeometry(width, height, depth), mat, parent);
    mesh.position.set(x, y, z);
    return mesh;
  };
  const cylinder = (
    top: number, bottom: number, height: number,
    x: number, y: number, z: number,
    mat: THREE.Material, parent = scene, radialSegments = 16
  ) => {
    const mesh = addMesh(new THREE.CylinderGeometry(top, bottom, height, radialSegments), mat, parent);
    mesh.position.set(x, y, z);
    return mesh;
  };

  // A stone portal frames the existing entrance arch and breaks up the large brick plane.
  // The added trim is decorative only; the established walkable doorway stays clear.
  [-3.35, 3.35].forEach((x) => {
    box(0.3, 7.3, 0.42, x, 3.65, -7.52, limestone);
    box(0.46, 0.34, 0.58, x, 0.18, -7.52, limestoneLight);
    box(0.46, 0.34, 0.58, x, 7.16, -7.52, limestoneLight);
    for (let y = 1.1; y < 6.7; y += 1.25) {
      box(0.35, 0.035, 0.46, x, y, -7.28, limestoneLight);
    }
  });
  box(7.25, 0.3, 0.48, 0, 7.32, -7.5, limestone);
  box(8.05, 0.17, 0.62, 0, 7.56, -7.5, limestoneLight);
  box(9.4, 0.17, 0.56, 0, 9.02, -7.7, limestone);
  box(9.55, 0.07, 0.58, 0, 8.88, -7.7, limestoneLight);

  // Double-leaf glazed school entrance. Each panel has its own frame, glazing,
  // transom, and handle, with a tiny open angle so the pair reads as two doors.
  const doors = new THREE.Group();
  doors.position.set(0, 0, -5.76);
  scene.add(doors);
  const doorWidth = 1.44;
  const doorHeight = 3.12;
  [-1, 1].forEach((side) => {
    const leaf = new THREE.Group();
    leaf.position.x = side * doorWidth;
    leaf.rotation.y = side * 0.025;
    doors.add(leaf);
    box(doorWidth - 0.06, doorHeight, 0.13, -side * (doorWidth / 2), doorHeight / 2, 0, bronze, leaf);
    box(doorWidth - 0.23, doorHeight - 0.2, 0.045, -side * (doorWidth / 2), doorHeight / 2 + 0.01, 0.083, glass, leaf);
    box(doorWidth - 0.22, 0.12, 0.08, -side * (doorWidth / 2), 1.08, 0.11, bronze, leaf);
    box(0.075, doorHeight - 0.18, 0.09, -side * (doorWidth / 2), doorHeight / 2, 0.11, bronze, leaf);
    box(0.055, 0.46, 0.08, -side * 0.17, 1.27, 0.16, limestoneLight, leaf);
    cylinder(0.035, 0.035, 0.055, -side * 0.17, 1.52, 0.17, bronze, leaf, 12).rotation.x = Math.PI / 2;
    box(0.22, 0.18, 0.1, -side * (doorWidth / 2), doorHeight - 0.31, 0.13, glassShade, leaf);
    box(0.22, 0.18, 0.1, -side * (doorWidth / 2), 0.31, 0.13, glassShade, leaf);
  });
  // Door lintel and side lights complete the glazed entry vestibule.
  box(3.08, 0.12, 0.18, 0, 3.2, -5.66, limestoneLight);
  [-1.63, 1.63].forEach((x) => {
    box(0.12, 3.1, 0.13, x, 1.58, -5.68, bronze);
    box(0.96, 2.92, 0.055, x, 1.58, -5.59, glass);
    box(1.02, 0.12, 0.14, x, 3.11, -5.62, limestoneLight);
    box(1.02, 0.12, 0.14, x, 0.07, -5.62, limestoneLight);
  });

  // Fine window trim: stone sills and headers add depth to the existing façade.
  [-1, 1].forEach((side) => {
    [9.5, 14, 18.5, 23, 27.5].forEach((offset) => {
      [1.25, 5.4].forEach((y, row) => {
        const x = side * offset;
        box(2.94, 0.12, 0.36, x, y - 1.12, -9.48, limestone);
        box(2.84, 0.08, 0.28, x, y + 1.2, -9.49, limestoneLight);
        box(0.07, 2.14, 0.1, x, y, -9.53, bronze);
        if (row === 0) box(2.68, 0.035, 0.08, x, y + 0.14, -9.55, limestoneLight);
      });
      // Subtle brick pilaster at intervals, visually tying the two window rows together.
      box(0.14, 4.7, 0.18, side * (offset + 1.72), 3.35, -9.48, limestone);
    });
  });

  // Warm, understated wall lamps around the doors; emissive material keeps them readable
  // without adding expensive dynamic point lights.
  const lampGlass = new THREE.MeshStandardMaterial({
    color: 0xffe6a8,
    emissive: 0xffc968,
    emissiveIntensity: 0.65,
    roughness: 0.36,
  });
  [-2.55, 2.55].forEach((x) => {
    box(0.28, 0.38, 0.14, x, 4.05, -7.32, bronze);
    box(0.19, 0.25, 0.1, x, 4.05, -7.22, lampGlass);
    box(0.36, 0.06, 0.18, x, 4.26, -7.32, bronze);
  });

  // Painted campus crest above the entry doors (canvas artwork, no external asset required).
  const emblemCanvas = document.createElement('canvas');
  emblemCanvas.width = 256;
  emblemCanvas.height = 256;
  const ctx = emblemCanvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = '#d7bd82';
    ctx.strokeStyle = '#624333';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(128, 18);
    ctx.lineTo(220, 48);
    ctx.lineTo(208, 158);
    ctx.quadraticCurveTo(180, 218, 128, 238);
    ctx.quadraticCurveTo(76, 218, 48, 158);
    ctx.lineTo(36, 48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#536b54';
    ctx.font = 'bold 112px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('E', 128, 123);
    ctx.strokeStyle = '#f5e8c9';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(75, 186);
    ctx.quadraticCurveTo(128, 158, 181, 186);
    ctx.stroke();
  }
  const crestTexture = new THREE.CanvasTexture(emblemCanvas);
  crestTexture.colorSpace = THREE.SRGBColorSpace;
  const crest = addMesh(
    new THREE.PlaneGeometry(0.92, 0.92),
    new THREE.MeshBasicMaterial({ map: crestTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  );
  crest.position.set(0, 10.02, -5.72);

  // Symmetrical raised flower beds at the edges of the main approach, leaving the spawn
  // point and the route into the doors open. Soft colors keep the scene anime-inspired,
  // while denser rounded forms avoid the faceted low-poly look.
  const makeFlowerBed = (x: number, z: number, side: number) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    scene.add(group);
    box(5.3, 0.24, 1.42, 0, 0.12, 0, limestone, group);
    box(4.96, 0.1, 1.12, 0, 0.28, 0, soil, group);
    [-2.34, 2.34].forEach((edge) => box(0.12, 0.34, 1.34, edge, 0.22, 0, limestoneLight, group));
    for (let i = 0; i < 7; i++) {
      const px = -2.05 + i * 0.68;
      const plant = addMesh(new THREE.SphereGeometry(0.34, 24, 18), i % 2 ? leafLight : leafGreen, group);
      plant.position.set(px, 0.58 + (i % 3) * 0.04, (i % 2 ? 0.2 : -0.18));
      plant.scale.set(1.12, 0.85, 0.88);
      if (i % 2 === 0) {
        const flower = addMesh(new THREE.SphereGeometry(0.12, 16, 12), flowerColors[(i + side + 3) % flowerColors.length], group);
        flower.position.set(px, 0.86, 0.05);
        flower.scale.set(1, 0.74, 1);
      }
    }
  };
  makeFlowerBed(-10.2, 10.2, -1);
  makeFlowerBed(10.2, 10.2, 1);
  makeFlowerBed(-18.2, 20.5, 1);
  makeFlowerBed(18.2, 20.5, -1);

  // More natural-looking benches with separate seat slats and iron side supports.
  const makeBench = (x: number, z: number, rotation: number) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    scene.add(group);
    for (let i = 0; i < 4; i++) {
      box(2.25, 0.085, 0.15, 0, 0.52, -0.23 + i * 0.15, i % 2 ? woodLight : wood, group);
      box(2.25, 0.08, 0.15, 0, 1.03, -0.57 + i * 0.15, i % 2 ? wood : woodLight, group);
    }
    [-0.86, 0.86].forEach((xSide) => {
      box(0.11, 0.52, 0.12, xSide, 0.27, 0, bronze, group);
      box(0.11, 0.11, 0.88, xSide, 0.5, 0.02, bronze, group);
      box(0.11, 0.72, 0.12, xSide, 0.84, -0.48, bronze, group);
      box(0.12, 0.1, 0.76, xSide, 0.72, -0.24, bronze, group);
    });
    if (rotation === 0) boxes.push({ x0: x - 1.3, x1: x + 1.3, z0: z - 0.85, z1: z + 0.85 });
  };
  makeBench(-7.3, 18.4, 0.04);
  makeBench(7.3, 18.4, -0.04);

  // Cherry trees with smooth, layered canopies give the entry a recognizable seasonal
  // school-garden silhouette. Branches and leaf clumps are deliberately restrained.
  const makeCherryTree = (x: number, z: number, scale: number) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    scene.add(group);
    cylinder(0.19, 0.27, 3.0, 0, 1.5, 0, wood, group, 20);
    const branch = cylinder(0.08, 0.13, 1.65, -0.45, 2.5, 0, woodLight, group, 14);
    branch.rotation.z = Math.PI / 3.2;
    const branch2 = cylinder(0.08, 0.13, 1.55, 0.48, 2.55, 0.08, woodLight, group, 14);
    branch2.rotation.z = -Math.PI / 3.1;
    const clumps = [
      [-0.72, 3.52, 0.02, 0.92],
      [0.66, 3.58, 0.1, 0.88],
      [0.02, 4.13, 0, 1.02],
      [-0.18, 3.76, 0.56, 0.72],
      [0.31, 3.72, -0.54, 0.72],
    ];
    clumps.forEach(([cx, cy, cz, r], i) => {
      const crown = addMesh(new THREE.SphereGeometry(r, 32, 24), i % 2 ? blossomLight : blossom, group);
      crown.position.set(cx, cy, cz);
      crown.scale.set(1.06, 0.84, 1);
    });
    for (let i = 0; i < 22; i++) {
      const angle = i * 2.399;
      const radius = 0.35 + ((i * 17) % 11) * 0.055;
      const bud = addMesh(new THREE.SphereGeometry(0.1 + (i % 3) * 0.018, 12, 10), i % 3 ? petalPink : blossomLight, group);
      bud.position.set(Math.cos(angle) * radius, 3.35 + ((i * 7) % 13) * 0.075, Math.sin(angle) * radius);
    }
    const shadowCanopy = addMesh(new THREE.SphereGeometry(1.35, 24, 16), leafGreen, group);
    shadowCanopy.position.set(0, 3.4, 0);
    shadowCanopy.scale.set(1.2, 0.74, 1.08);
    boxes.push({ x0: x - 0.42 * scale, x1: x + 0.42 * scale, z0: z - 0.42 * scale, z1: z + 0.42 * scale });
  };
  makeCherryTree(-18, 13.5, 1.08);
  makeCherryTree(18, 13.5, 1.08);

  // Restrained pastel paving marks guide the eye toward the double doors without a glowing
  // waypoint effect. Thin strips sit flush with the existing central approach.
  const pavingAccent = material(0xb9a98c, 0.88);
  for (let z = -0.6; z <= 18; z += 2.8) {
    box(0.075, 0.012, 1.72, -2.55, 0.09, z, pavingAccent);
    box(0.075, 0.012, 1.72, 2.55, 0.09, z, pavingAccent);
  }

  // A soft key light at the entrance; modest range prevents the whole scene from flattening.
  const entryLight = new THREE.PointLight(0xffe8c7, 0.55, 10, 2);
  entryLight.position.set(0, 3.1, -4.6);
  scene.add(entryLight);
}
