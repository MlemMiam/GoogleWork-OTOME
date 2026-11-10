/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { BoundingBox } from './physics';

/**
 * High-fidelity anime courtyard assets:
 * - Central plaza tiered stone fountain with animated shimmering water
 * - Iconic Japanese high school bicycle pavilion with 5 detailed student bikes
 * - Campus bulletin board with authentic club recruitment flyers
 * - Illuminated Japanese drink vending machine station with matching recycling bin
 * - Classical facade clock with ornate hands and dial
 * - Raised chamfered stone curbstones lining the central and diagonal walkways
 * - Terracotta planters with blooming petunias and hydrangeas
 * - Student outdoor drinking fountain with chrome bubbler
 */
export function buildDetailedCourtyard(
  scene: THREE.Scene,
  boxes: BoundingBox[],
  isSoftwareGl: boolean
): void {
  const cleanupCallbacks = (scene.userData.cleanupCallbacks ??= []) as Array<() => void>;
  const updateCallbacks = (scene.userData.updateCallbacks ??= []) as Array<(dt: number, time: number) => void>;

  // --- Shared PBR & Anime Materials ---
  const mat = (
    color: number,
    roughness = 0.75,
    metalness = 0.05,
    extra: THREE.MeshStandardMaterialParameters = {}
  ) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      ...extra,
    });

  const stoneWarm = mat(0xded0b7, 0.72);
  const stoneLight = mat(0xf3ebd9, 0.68);
  const stoneDark = mat(0xb5a78f, 0.82);
  const bronze = mat(0x3e322a, 0.42, 0.45);
  const bronzeGold = mat(0xcbb06d, 0.32, 0.65);
  const glass = mat(0xa7d8e8, 0.15, 0.25, { transparent: true, opacity: 0.65 });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x3fa9c4,
    roughness: 0.12,
    metalness: 0.18,
    transparent: true,
    opacity: 0.82,
    envMapIntensity: 1.2,
  });

  const woodOak = mat(0x73513b, 0.82);
  const woodDark = mat(0x4a3224, 0.86);
  const terracotta = mat(0xb86343, 0.88);
  const soilMat = mat(0x46372b, 0.98);
  const chrome = mat(0xeef2f7, 0.18, 0.88);
  const steelGreen = mat(0x2d5248, 0.45, 0.2);
  const tireBlack = mat(0x232426, 0.88);
  const petalPinks = [mat(0xee8ca2), mat(0xf8b7c7), mat(0xffdbe3)];
  const petalBlues = [mat(0x6faee6), mat(0x9fcbf5), mat(0xd7e9fb)];
  const petalPurples = [mat(0x9d78cc), mat(0xc09eed), mat(0xe8d6fc)];
  const leafLush = [mat(0x44773b, 0.9), mat(0x5ca34d, 0.88), mat(0x356330, 0.92)];

  // --- Mesh Helpers ---
  const addMesh = (geo: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = scene) => {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = !isSoftwareGl;
    m.receiveShadow = !isSoftwareGl;
    parent.add(m);
    return m;
  };

  const box = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    parent: THREE.Object3D = scene
  ) => {
    const m = addMesh(new THREE.BoxGeometry(w, h, d), material, parent);
    m.position.set(x, y + h / 2, z);
    return m;
  };

  const cyl = (
    rt: number,
    rb: number,
    h: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    seg = 24,
    parent: THREE.Object3D = scene
  ) => {
    const m = addMesh(new THREE.CylinderGeometry(rt, rb, h, seg), material, parent);
    m.position.set(x, y + h / 2, z);
    return m;
  };

  const sphere = (
    r: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    sx = 1,
    sy = 1,
    sz = 1,
    seg = 24,
    parent: THREE.Object3D = scene
  ) => {
    const m = addMesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), material, parent);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  };

  // =========================================================================
  // 1. CLASSICAL CAMPUS FACADE CLOCK
  // =========================================================================
  (() => {
    const clockGroup = new THREE.Group();
    clockGroup.position.set(0, 10.4, -5.72);
    scene.add(clockGroup);

    // Beveled stone rosette mount
    const mount = addMesh(new THREE.CylinderGeometry(1.22, 1.28, 0.18, 36), stoneWarm, clockGroup);
    mount.rotation.x = Math.PI / 2;

    // Ornate bronze fluted bezel
    const bezel = addMesh(new THREE.TorusGeometry(1.08, 0.08, 16, 48), bronzeGold, clockGroup);

    // Clock face canvas (crisp roman numerals, minute ticks, gilded East High emblem)
    const dialCanvas = document.createElement('canvas');
    dialCanvas.width = 512;
    dialCanvas.height = 512;
    const ctx = dialCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 512, 512);
      ctx.fillStyle = '#f9f6ef';
      ctx.beginPath();
      ctx.arc(256, 256, 240, 0, Math.PI * 2);
      ctx.fill();

      // Outer gold ring
      ctx.strokeStyle = '#cbb06d';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(256, 256, 230, 0, Math.PI * 2);
      ctx.stroke();

      // Inner decorative ring
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(256, 256, 175, 0, Math.PI * 2);
      ctx.stroke();

      // Hour numerals
      ctx.fillStyle = '#261b14';
      ctx.font = 'bold 44px Georgia, "Times New Roman", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      numerals.forEach((num, i) => {
        const ang = (i * Math.PI) / 6;
        const r = 200;
        ctx.fillText(num, 256 + Math.sin(ang) * r, 256 - Math.cos(ang) * r);
      });

      // Minute ticks
      ctx.strokeStyle = '#5c4838';
      for (let i = 0; i < 60; i++) {
        const ang = (i * Math.PI) / 30;
        const r1 = i % 5 === 0 ? 222 : 228;
        const r2 = 234;
        ctx.lineWidth = i % 5 === 0 ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(256 + Math.sin(ang) * r1, 256 - Math.cos(ang) * r1);
        ctx.lineTo(256 + Math.sin(ang) * r2, 256 - Math.cos(ang) * r2);
        ctx.stroke();
      }

      // East High script emblem under 12
      ctx.fillStyle = '#8f6f4c';
      ctx.font = 'italic 600 24px Georgia, serif';
      ctx.fillText('East High', 256, 140);
    }

    const dialTex = new THREE.CanvasTexture(dialCanvas);
    dialTex.colorSpace = THREE.SRGBColorSpace;
    const dial = addMesh(
      new THREE.CircleGeometry(1.02, 36),
      new THREE.MeshStandardMaterial({ map: dialTex, roughness: 0.6 }),
      clockGroup
    );
    dial.position.z = 0.105;

    // Bronze clock hands (pointing at 8:20 AM - school bell time!)
    const handMat = bronze;
    const hourHand = addMesh(new THREE.BoxGeometry(0.065, 0.58, 0.02), handMat, clockGroup);
    hourHand.position.set(0.18, 0.12, 0.125);
    hourHand.rotation.z = -Math.PI * 0.42;

    const minHand = addMesh(new THREE.BoxGeometry(0.045, 0.82, 0.02), handMat, clockGroup);
    minHand.position.set(0.24, -0.22, 0.13);
    minHand.rotation.z = -Math.PI * 0.72;

    const centerCap = cyl(0.075, 0.075, 0.04, 0, 0, 0.12, bronzeGold, 16, clockGroup);
    centerCap.rotation.x = Math.PI / 2;
  })();

  // =========================================================================
  // 2. CENTRAL PLAZA TIERED FOUNTAIN WITH ANIMATED WATER
  // =========================================================================
  (() => {
    const fx = 0;
    const fz = 8.5;
    const fountainGroup = new THREE.Group();
    fountainGroup.position.set(fx, 0, fz);
    scene.add(fountainGroup);

    // Decorative octagonal sunburst stone paving around fountain
    const starSteps = 16;
    for (let i = 0; i < starSteps; i++) {
      const ang = (i * Math.PI * 2) / starSteps;
      const wedge = addMesh(
        new THREE.RingGeometry(2.4, 4.4, 4, 1, ang, (Math.PI * 2) / starSteps - 0.02),
        i % 2 === 0 ? stoneLight : stoneWarm,
        fountainGroup
      );
      wedge.rotation.x = -Math.PI / 2;
      wedge.position.y = 0.025;
    }

    // Outer octagonal basin wall (32 segments for soft curved corners)
    const basinOuterR = 2.45;
    const basinInnerR = 2.05;
    const basinH = 0.52;

    // Base ring
    cyl(basinOuterR + 0.14, basinOuterR + 0.22, 0.12, 0, 0, 0, stoneDark, 32, fountainGroup);
    // Basin exterior wall
    cyl(basinOuterR, basinOuterR, basinH, 0, 0.10, 0, stoneWarm, 32, fountainGroup);
    // Beveled top coping rim
    const rim = addMesh(new THREE.TorusGeometry(basinOuterR - 0.06, 0.14, 16, 36), stoneLight, fountainGroup);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = basinH + 0.08;

    // Fountain water surface (subdivided for ripple vertex animation)
    const waterGeo = new THREE.CircleGeometry(basinInnerR + 0.05, 32);
    const waterMesh = addMesh(waterGeo, waterMat, fountainGroup);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 0.42;

    // Center ornate pedestal
    cyl(0.55, 0.72, 0.65, 0, 0.1, 0, stoneDark, 24, fountainGroup);
    cyl(0.38, 0.45, 0.75, 0, 0.75, 0, stoneWarm, 24, fountainGroup);

    // Upper tiered bowl
    const upperBowlR = 0.98;
    const upperBowlH = 0.32;
    const upperBowl = addMesh(
      new THREE.CylinderGeometry(upperBowlR, 0.42, upperBowlH, 24),
      stoneLight,
      fountainGroup
    );
    upperBowl.position.y = 1.62;

    // Upper bowl water
    const upperWater = addMesh(new THREE.CircleGeometry(upperBowlR - 0.06, 24), waterMat, fountainGroup);
    upperWater.rotation.x = -Math.PI / 2;
    upperWater.position.y = 1.76;

    // Bronze finial spout
    cyl(0.08, 0.16, 0.45, 0, 1.76, 0, bronzeGold, 16, fountainGroup);
    sphere(0.12, 0, 2.26, 0, bronzeGold, 1, 1.3, 1, 16, fountainGroup);

    // Water jets & droplets (delicate translucent spheres cascading into lower basin)
    const droplets: THREE.Mesh[] = [];
    for (let i = 0; i < 16; i++) {
      const drop = addMesh(
        new THREE.SphereGeometry(0.032, 10, 8),
        new THREE.MeshStandardMaterial({
          color: 0xcbeef7,
          roughness: 0.1,
          transparent: true,
          opacity: 0.75,
        }),
        fountainGroup
      );
      drop.userData = {
        angle: (i * Math.PI * 2) / 16,
        phase: i * 0.4,
        speed: 1.8 + (i % 3) * 0.4,
      };
      droplets.push(drop);
    }

    // Dynamic wave ripple & droplet cascade in update loop
    const waterPos = waterGeo.attributes.position;
    const baseWaterZ = new Float32Array(waterPos.count);
    for (let i = 0; i < waterPos.count; i++) baseWaterZ[i] = waterPos.getZ(i);

    updateCallbacks.push((dt, time) => {
      // Shimmering ripple waves on lower basin water
      for (let i = 1; i < waterPos.count; i++) {
        const u = waterPos.getX(i);
        const v = waterPos.getY(i);
        const dist = Math.hypot(u, v);
        const wave = Math.sin(dist * 6 - time * 3.5) * 0.018 * Math.max(0, 1 - dist / basinInnerR);
        waterPos.setZ(i, baseWaterZ[i] + wave);
      }
      waterPos.needsUpdate = true;

      // Cascading water droplets falling from upper bowl
      droplets.forEach((drop) => {
        const d = drop.userData;
        const progress = ((time * d.speed + d.phase) % 1);
        const radius = 0.25 + progress * (basinInnerR * 0.75);
        const y = 2.22 - Math.pow(progress, 1.8) * 1.78;
        drop.position.set(Math.cos(d.angle) * radius, y, Math.sin(d.angle) * radius);
      });
    });

    // Collision box for fountain
    boxes.push({ x0: fx - 2.5, x1: fx + 2.5, z0: fz - 2.5, z1: fz + 2.5 });
  })();

  // =========================================================================
  // 3. COVERED ANIME BICYCLE PAVILION WITH 5 STYLIZED STUDENT BIKES
  // =========================================================================
  (() => {
    const px = -25;
    const pz = 6;
    const pavGroup = new THREE.Group();
    pavGroup.position.set(px, 0, pz);
    scene.add(pavGroup);

    const pavW = 7.4;
    const pavD = 3.6;
    const pavH = 2.75;

    // Concrete base slab with beveled edges
    box(pavW, 0.12, pavD, 0, 0, 0, stoneWarm, pavGroup);
    box(pavW + 0.25, 0.05, pavD + 0.25, 0, 0, 0, stoneDark, pavGroup);

    // Stenciled white bicycle icon on concrete floor
    const bikeIconCanvas = document.createElement('canvas');
    bikeIconCanvas.width = 128;
    bikeIconCanvas.height = 128;
    const bctx = bikeIconCanvas.getContext('2d');
    if (bctx) {
      bctx.clearRect(0, 0, 128, 128);
      bctx.strokeStyle = 'rgba(255,255,255,0.65)';
      bctx.lineWidth = 6;
      bctx.beginPath();
      bctx.arc(36, 80, 20, 0, Math.PI * 2);
      bctx.arc(92, 80, 20, 0, Math.PI * 2);
      bctx.moveTo(36, 80);
      bctx.lineTo(60, 52);
      bctx.lineTo(84, 80);
      bctx.lineTo(60, 80);
      bctx.closePath();
      bctx.moveTo(60, 52);
      bctx.lineTo(54, 38);
      bctx.lineTo(44, 38);
      bctx.stroke();
    }
    const bikeIconTex = new THREE.CanvasTexture(bikeIconCanvas);
    const bikeIconMesh = addMesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: bikeIconTex, transparent: true }), pavGroup);
    bikeIconMesh.rotation.x = -Math.PI / 2;
    bikeIconMesh.position.set(0, 0.13, 1.2);

    // Steel support pillars (4 rounded tubular pillars)
    const pillarPositions = [
      [-pavW / 2 + 0.35, -pavD / 2 + 0.35],
      [pavW / 2 - 0.35, -pavD / 2 + 0.35],
      [-pavW / 2 + 0.35, pavD / 2 - 0.35],
      [pavW / 2 - 0.35, pavD / 2 - 0.35],
    ];

    pillarPositions.forEach(([colX, colZ]) => {
      // Cast iron pillar base
      cyl(0.12, 0.16, 0.25, colX, 0.12, colZ, steelGreen, 16, pavGroup);
      // Tubular column
      cyl(0.065, 0.065, pavH, colX, 0.35, colZ, steelGreen, 16, pavGroup);
      // Top bracket
      box(0.24, 0.12, 0.24, colX, pavH + 0.32, colZ, steelGreen, pavGroup);
    });

    // Longitudinal beam rafters
    box(pavW - 0.4, 0.14, 0.14, 0, pavH + 0.36, -pavD / 2 + 0.35, steelGreen, pavGroup);
    box(pavW - 0.4, 0.14, 0.14, 0, pavH + 0.36, pavD / 2 - 0.35, steelGreen, pavGroup);

    // Curved arched corrugated translucent canopy
    const canopyR = 4.2;
    const canopyGeo = new THREE.CylinderGeometry(
      canopyR,
      canopyR,
      pavW + 0.2,
      32,
      1,
      true,
      -Math.PI * 0.24,
      Math.PI * 0.48
    );
    const canopyMat = mat(0x43867c, 0.25, 0.1, {
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    const canopy = addMesh(canopyGeo, canopyMat, pavGroup);
    canopy.rotation.z = Math.PI / 2;
    canopy.rotation.x = Math.PI;
    canopy.position.set(0, pavH - 0.65, 0);

    // Ground bike parking rack rails
    const rackRailMat = chrome;
    box(pavW - 1.2, 0.08, 0.08, 0, 0.14, -0.65, rackRailMat, pavGroup);
    box(pavW - 1.2, 0.08, 0.08, 0, 0.14, 0.45, rackRailMat, pavGroup);

    // 5 Detailed student bicycles with varied pastel colors
    const bikeColors = [0x3ca6a6, 0xd45d79, 0x487eb0, 0xf6b93b, 0x38ada9];
    const bikeXOffsets = [-2.4, -1.2, 0, 1.2, 2.4];

    bikeXOffsets.forEach((bx, idx) => {
      const bikeGroup = new THREE.Group();
      bikeGroup.position.set(bx, 0.12, -0.1);
      // Slight natural angle variation
      bikeGroup.rotation.y = (idx % 2 === 0 ? 0.05 : -0.04);
      pavGroup.add(bikeGroup);

      const frameMat = mat(bikeColors[idx], 0.4, 0.15);
      const wheelR = 0.32;

      // Front & rear wheels
      [-0.58, 0.58].forEach((wx) => {
        const tire = addMesh(new THREE.TorusGeometry(wheelR, 0.035, 12, 24), tireBlack, bikeGroup);
        tire.rotation.y = Math.PI / 2;
        tire.position.set(wx, wheelR + 0.02, 0);

        const rimMesh = addMesh(new THREE.TorusGeometry(wheelR - 0.02, 0.015, 8, 24), chrome, bikeGroup);
        rimMesh.rotation.y = Math.PI / 2;
        rimMesh.position.set(wx, wheelR + 0.02, 0);

        // Spokes (simplified 6-spoke cross)
        for (let s = 0; s < 3; s++) {
          const spoke = box(0.008, (wheelR - 0.04) * 2, 0.008, wx, wheelR + 0.02, 0, chrome, bikeGroup);
          spoke.rotation.x = (s * Math.PI) / 3;
        }
      });

      // Tubular frame geometry
      // Bottom bracket
      cyl(0.03, 0.03, 0.12, 0, wheelR + 0.05, 0, chrome, 12, bikeGroup);
      // Seat tube
      const seatTube = box(0.035, 0.52, 0.035, -0.05, wheelR + 0.28, 0, frameMat, bikeGroup);
      seatTube.rotation.z = -0.22;
      // Down tube
      const downTube = box(0.035, 0.65, 0.035, 0.24, wheelR + 0.28, 0, frameMat, bikeGroup);
      downTube.rotation.z = 0.72;
      // Top tube
      box(0.58, 0.035, 0.035, 0.22, wheelR + 0.52, 0, frameMat, bikeGroup);
      // Chainstay
      box(0.54, 0.025, 0.025, -0.28, wheelR + 0.05, 0, frameMat, bikeGroup);
      // Front fork
      const fork = box(0.025, 0.44, 0.025, 0.54, wheelR + 0.24, 0, chrome, bikeGroup);
      fork.rotation.z = -0.24;

      // Handlebars & front basket
      box(0.03, 0.18, 0.03, 0.51, wheelR + 0.54, 0, chrome, bikeGroup);
      const hbar = box(0.03, 0.03, 0.44, 0.51, wheelR + 0.64, 0, chrome, bikeGroup);
      // Rubber grips
      box(0.04, 0.04, 0.1, 0.51, wheelR + 0.64, 0.20, tireBlack, bikeGroup);
      box(0.04, 0.04, 0.1, 0.51, wheelR + 0.64, -0.20, tireBlack, bikeGroup);

      // Wire front basket
      const basket = box(0.24, 0.18, 0.32, 0.62, wheelR + 0.50, 0, mat(0xd4d8de, 0.6, 0.4), bikeGroup);
      // School bag inside basket
      box(0.18, 0.14, 0.26, 0.62, wheelR + 0.52, 0, mat(0x283344, 0.7), bikeGroup);

      // Faux-leather saddle
      box(0.24, 0.055, 0.16, -0.16, wheelR + 0.58, 0, mat(0x5a3422, 0.8), bikeGroup);

      // Kickstand & pedal crank
      const stand = box(0.02, 0.28, 0.02, -0.08, 0.14, 0.08, chrome, bikeGroup);
      stand.rotation.z = 0.35;
      stand.rotation.x = -0.32;
    });

    // Collision box for pavilion
    boxes.push({ x0: px - pavW / 2 - 0.2, x1: px + pavW / 2 + 0.2, z0: pz - pavD / 2 - 0.2, z1: pz + pavD / 2 + 0.2 });
  })();

  // =========================================================================
  // 4. JAPANESE DRINK VENDING MACHINES & RECYCLING STATION
  // =========================================================================
  (() => {
    const vx = 9.8;
    const vz = -4.6;
    const vmGroup = new THREE.Group();
    vmGroup.position.set(vx, 0, vz);
    scene.add(vmGroup);

    // Concrete pad
    box(2.8, 0.1, 1.4, 0, 0, 0, stoneDark, vmGroup);

    // --- Machine 1: Blue / White Soft Drinks Vending Machine ---
    const m1Group = new THREE.Group();
    m1Group.position.set(-0.65, 0.1, 0);
    vmGroup.add(m1Group);

    const mW = 0.98;
    const mH = 1.95;
    const mD = 0.82;

    // Main cabinet body
    box(mW, mH, mD, 0, 0, 0, mat(0x187bcd, 0.35), m1Group);
    // Front white bezel panel
    box(mW - 0.06, mH - 0.08, 0.08, 0, 0.04, mD / 2 + 0.01, mat(0xf0f4f8, 0.4), m1Group);

    // Illuminated drink display window
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xdaf2ff,
      emissiveIntensity: 0.65,
      roughness: 0.2,
    });
    box(mW - 0.14, 0.85, 0.06, 0, 0.85, mD / 2 + 0.03, winMat, m1Group);

    // 3 shelves of glowing colorful drink cans (15 cans total)
    const canColors = [0x2ecc71, 0xe74c3c, 0xf39c12, 0x3498db, 0x9b59b6];
    for (let row = 0; row < 3; row++) {
      const cy = 0.95 + row * 0.24;
      for (let col = 0; col < 5; col++) {
        const cx = -0.32 + col * 0.16;
        const canMat = mat(canColors[(row * 5 + col) % canColors.length], 0.2, 0.5);
        cyl(0.036, 0.036, 0.14, cx, cy, mD / 2 + 0.04, canMat, 12, m1Group);

        // Price & selection push-button below can
        box(0.045, 0.022, 0.025, cx, cy - 0.08, mD / 2 + 0.06, mat(0x34495e, 0.5), m1Group);
      }
    }

    // Coin slot, digital price LED, and change lever
    box(0.08, 0.18, 0.03, 0.32, 0.55, mD / 2 + 0.05, mat(0x2c3e50, 0.3), m1Group);
    box(0.04, 0.015, 0.02, 0.32, 0.61, mD / 2 + 0.065, chrome, m1Group);
    // Digital green 7-segment display
    box(0.06, 0.028, 0.015, 0.32, 0.55, mD / 2 + 0.065, new THREE.MeshBasicMaterial({ color: 0x2ecc71 }), m1Group);

    // Delivery flap door at bottom
    box(0.56, 0.26, 0.08, -0.08, 0.22, mD / 2 + 0.02, mat(0x2c3e50, 0.5), m1Group);
    box(0.50, 0.20, 0.04, -0.08, 0.25, mD / 2 + 0.05, mat(0x7f8c8d, 0.4), m1Group);

    // --- Machine 2: Black & Gold Coffee / Tea Vending Machine ---
    const m2Group = new THREE.Group();
    m2Group.position.set(0.48, 0.1, 0);
    vmGroup.add(m2Group);

    box(mW, mH, mD, 0, 0, 0, mat(0x221f1e, 0.4), m2Group);
    box(mW - 0.06, mH - 0.08, 0.08, 0, 0.04, mD / 2 + 0.01, mat(0x322d29, 0.45), m2Group);

    // Warm amber illuminated window
    const coffeeWinMat = new THREE.MeshStandardMaterial({
      color: 0xfff3db,
      emissive: 0xffd993,
      emissiveIntensity: 0.72,
      roughness: 0.2,
    });
    box(mW - 0.14, 0.85, 0.06, 0, 0.85, mD / 2 + 0.03, coffeeWinMat, m2Group);

    // Coffee cans (gold, dark roast brown, crimson)
    const coffeeColors = [0xcbb06d, 0x4a2c16, 0x8b1e22, 0x1f3c88, 0xd4a373];
    for (let row = 0; row < 3; row++) {
      const cy = 0.95 + row * 0.24;
      for (let col = 0; col < 5; col++) {
        const cx = -0.32 + col * 0.16;
        const canMat = mat(coffeeColors[(row * 5 + col) % coffeeColors.length], 0.2, 0.6);
        cyl(0.036, 0.036, 0.14, cx, cy, mD / 2 + 0.04, canMat, 12, m2Group);
        box(0.045, 0.022, 0.025, cx, cy - 0.08, mD / 2 + 0.06, mat(row === 0 ? 0x2980b9 : 0xc0392b, 0.5), m2Group);
      }
    }

    // Delivery flap
    box(0.56, 0.26, 0.08, -0.08, 0.22, mD / 2 + 0.02, mat(0x181514, 0.5), m2Group);

    // --- Dual Recycling Bin (Cans & Plastic Bottles) ---
    const binGroup = new THREE.Group();
    binGroup.position.set(1.22, 0.1, 0.15);
    vmGroup.add(binGroup);

    // Double plastic bin body
    box(0.68, 0.82, 0.48, 0, 0, 0, mat(0xe8ecef, 0.5), binGroup);
    // Blue lid for cans, yellow lid for plastic bottles
    box(0.32, 0.06, 0.50, -0.16, 0.82, 0, mat(0x2980b9, 0.4), binGroup);
    box(0.32, 0.06, 0.50, 0.16, 0.82, 0, mat(0xf1c40f, 0.4), binGroup);

    // Round disposal intake holes
    cyl(0.06, 0.06, 0.03, -0.16, 0.86, 0, mat(0x1c2833, 0.8), 16, binGroup);
    cyl(0.06, 0.06, 0.03, 0.16, 0.86, 0, mat(0x1c2833, 0.8), 16, binGroup);

    // Soft illumination for vending area
    const vmLight = new THREE.PointLight(0xfff1d6, 0.7, 8, 1.8);
    vmLight.position.set(0, 1.8, 1.1);
    vmGroup.add(vmLight);

    boxes.push({ x0: vx - 1.5, x1: vx + 1.6, z0: vz - 0.9, z1: vz + 0.9 });
  })();

  // =========================================================================
  // 5. CAMPUS NOTICE BOARD WITH AUTHENTIC ANIME SCHOOL POSTERS
  // =========================================================================
  (() => {
    const nbX = 7.6;
    const nbZ = 7.5;
    const nbGroup = new THREE.Group();
    nbGroup.position.set(nbX, 0, nbZ);
    // Tilted slightly toward the player walkway
    nbGroup.rotation.y = -Math.PI * 0.18;
    scene.add(nbGroup);

    // Carved wood posts with stone plinths
    [-1.25, 1.25].forEach((px) => {
      // Stone plinth
      cyl(0.12, 0.15, 0.28, px, 0, 0, stoneDark, 16, nbGroup);
      // Wood post
      cyl(0.075, 0.075, 2.7, px, 0.28, 0, woodDark, 16, nbGroup);
      // Diagonal support brace
      const brace = box(0.06, 0.55, 0.06, px * 0.82, 2.5, 0, woodOak, nbGroup);
      brace.rotation.z = px > 0 ? Math.PI * 0.25 : -Math.PI * 0.25;
    });

    // Pitch shingle roof on top
    const roofW = 3.1;
    const roofD = 1.1;
    const roofH = 0.42;

    const roofMat = mat(0x3a4048, 0.75);
    const roofLeft = box(roofW, 0.06, roofD / 2 + 0.1, 0, 2.85, -0.22, roofMat, nbGroup);
    roofLeft.rotation.x = Math.PI * 0.15;
    const roofRight = box(roofW, 0.06, roofD / 2 + 0.1, 0, 2.85, 0.22, roofMat, nbGroup);
    roofRight.rotation.x = -Math.PI * 0.15;
    // Copper ridge cap
    box(roofW + 0.1, 0.08, 0.12, 0, 3.02, 0, mat(0x9a6b4b, 0.5, 0.3), nbGroup);

    // Display frame backing
    box(2.4, 1.35, 0.14, 0, 1.35, 0, woodOak, nbGroup);
    // Brass casing border
    box(2.46, 1.41, 0.06, 0, 1.35, 0.05, bronzeGold, nbGroup);

    // Detailed hand-painted club flyers & campus bulletin board
    const posterCanvas = document.createElement('canvas');
    posterCanvas.width = 512;
    posterCanvas.height = 256;
    const pctx = posterCanvas.getContext('2d');
    if (pctx) {
      // Cork background
      pctx.fillStyle = '#b38b59';
      pctx.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 3000; i++) {
        pctx.fillStyle = Math.random() > 0.5 ? 'rgba(120,80,45,0.08)' : 'rgba(230,190,140,0.08)';
        pctx.fillRect(Math.random() * 512, Math.random() * 256, 2, 2);
      }

      // Flyer 1: Festival d'Automne (large left poster)
      pctx.fillStyle = '#fffdf5';
      pctx.shadowColor = 'rgba(0,0,0,0.3)';
      pctx.shadowBlur = 6;
      pctx.fillRect(16, 20, 140, 200);
      pctx.shadowBlur = 0;

      pctx.fillStyle = '#b83b5e';
      pctx.fillRect(16, 20, 140, 42);
      pctx.fillStyle = '#ffffff';
      pctx.font = 'bold 16px system-ui, sans-serif';
      pctx.fillText('EAST HIGH', 32, 44);
      pctx.font = '12px system-ui, sans-serif';
      pctx.fillText('FESTIVAL CULTUREL', 24, 58);

      pctx.fillStyle = '#2c3e50';
      pctx.font = '10px system-ui, sans-serif';
      pctx.fillText('• Théâtre & Concerts', 24, 90);
      pctx.fillText('• Stand de Crêpes', 24, 110);
      pctx.fillText('• Maison Hantée 102', 24, 130);
      pctx.fillText('15-16 Novembre', 24, 170);

      // Flyer 2: Club de Musique (center top)
      pctx.fillStyle = '#fef6e4';
      pctx.fillRect(174, 20, 150, 95);
      pctx.fillStyle = '#172a3a';
      pctx.font = 'bold 13px system-ui, sans-serif';
      pctx.fillText('CLUB DE MUSIQUE ♪', 184, 42);
      pctx.fillStyle = '#09bc8a';
      pctx.fillRect(184, 50, 130, 4);
      pctx.fillStyle = '#4a5568';
      pctx.font = '10px system-ui, sans-serif';
      pctx.fillText('Recrutement : Violon, Flûte', 184, 72);
      pctx.fillText('Répétitions salle 104', 184, 90);

      // Flyer 3: Club d'Astronomie (center bottom)
      pctx.fillStyle = '#14213d';
      pctx.fillRect(174, 125, 150, 95);
      pctx.fillStyle = '#fca311';
      pctx.font = 'bold 12px system-ui, sans-serif';
      pctx.fillText('CLUB D\'ASTRONOMIE ★', 184, 148);
      pctx.fillStyle = '#e5e5e5';
      pctx.font = '10px system-ui, sans-serif';
      pctx.fillText('Nuit des étoiles filantes', 184, 172);
      pctx.fillText('Vendredi 20h sur le toit', 184, 192);

      // Flyer 4: Tournoi Inter-Lycées (right)
      pctx.fillStyle = '#ffffff';
      pctx.fillRect(344, 20, 150, 200);
      pctx.fillStyle = '#e63946';
      pctx.font = 'bold 15px system-ui, sans-serif';
      pctx.fillText('TOURNOI SPORTIF', 356, 46);
      pctx.fillStyle = '#457b9d';
      pctx.font = '11px system-ui, sans-serif';
      pctx.fillText('Basketball & Course', 356, 70);
      pctx.fillStyle = '#1d3557';
      pctx.font = '10px system-ui, sans-serif';
      pctx.fillText('Encouragez nos équipes !', 356, 100);
      pctx.fillText('Finale samedi à 14h', 356, 120);

      // Colored pins on posters
      const pinColors = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#e67e22'];
      const pinCoords = [
        [86, 26], [249, 26], [249, 131], [419, 26]
      ];
      pinCoords.forEach(([px, py], i) => {
        pctx.fillStyle = pinColors[i % pinColors.length];
        pctx.beginPath();
        pctx.arc(px, py, 4, 0, Math.PI * 2);
        pctx.fill();
      });
    }

    const posterTex = new THREE.CanvasTexture(posterCanvas);
    posterTex.colorSpace = THREE.SRGBColorSpace;
    const boardPlane = addMesh(
      new THREE.PlaneGeometry(2.32, 1.25),
      new THREE.MeshStandardMaterial({ map: posterTex, roughness: 0.7 }),
      nbGroup
    );
    boardPlane.position.set(0, 1.35, 0.08);

    // Front protective glass cover
    const glassCover = addMesh(
      new THREE.PlaneGeometry(2.34, 1.27),
      glass,
      nbGroup
    );
    glassCover.position.set(0, 1.35, 0.11);

    boxes.push({ x0: nbX - 1.4, x1: nbX + 1.4, z0: nbZ - 0.7, z1: nbZ + 0.7 });
  })();

  // =========================================================================
  // 6. RAISED CHAMFERED STONE CURBSTONES LINING WALKWAYS
  // =========================================================================
  (() => {
    // Central walkway borders: runs from z = -5.4 to z = 22.8 at x = -3.05 and x = +3.05
    const curbW = 0.16;
    const curbH = 0.085;
    const curbLen = 28.2;
    const curbMat = stoneWarm;

    [-3.06, 3.06].forEach((cx) => {
      box(curbW, curbH, curbLen, cx, 0.02, 8.7, curbMat);
      // Beveled top chamfer
      box(curbW - 0.04, 0.02, curbLen, cx, 0.02 + curbH, 8.7, stoneLight);
    });

    // Curbs along the school facade walkway: z = -5.85, runs from x = -28 to x = 28
    box(56, curbH, curbW, 0, 0.02, -5.42, curbMat);

    // 8 Glazed Italianate Terracotta Planters along the main walkway
    const planterZs = [0.5, 5.5, 11.5, 17.5];
    planterZs.forEach((pz) => {
      [-3.38, 3.38].forEach((px, sIdx) => {
        const pGroup = new THREE.Group();
        pGroup.position.set(px, 0.04, pz);
        scene.add(pGroup);

        // Fluted terracotta urn
        cyl(0.38, 0.28, 0.44, 0, 0, 0, terracotta, 20, pGroup);
        // Beveled urn rim
        const potRim = addMesh(new THREE.TorusGeometry(0.38, 0.05, 12, 24), terracotta, pGroup);
        potRim.rotation.x = Math.PI / 2;
        potRim.position.y = 0.44;

        // Dark soil
        cyl(0.35, 0.35, 0.04, 0, 0.40, 0, soilMat, 16, pGroup);

        // Lush blooming flower bush dome (24 segments for smooth curvature)
        const flowerMatSet = (sIdx + pz) % 2 === 0 ? petalPinks : petalPurples;
        sphere(0.38, 0, 0.58, 0, leafLush[(sIdx + Math.round(pz)) % leafLush.length], 1.15, 0.85, 1.15, 24, pGroup);

        // Flower blooms
        for (let b = 0; b < 12; b++) {
          const ang = b * 1.95;
          const rad = 0.18 + (b % 4) * 0.05;
          const flw = sphere(
            0.065,
            Math.cos(ang) * rad,
            0.64 + (b % 3) * 0.05,
            Math.sin(ang) * rad,
            flowerMatSet[b % flowerMatSet.length],
            1,
            0.8,
            1,
            14,
            pGroup
          );
          // Yellow center stamen
          sphere(0.025, flw.position.x, flw.position.y + 0.02, flw.position.z, bronzeGold, 1, 1, 1, 8, pGroup);
        }
      });
    });
  })();

  // =========================================================================
  // 7. STUDENT OUTDOOR DRINKING FOUNTAIN
  // =========================================================================
  (() => {
    const dfX = -7.5;
    const dfZ = -3.8;
    const dfGroup = new THREE.Group();
    dfGroup.position.set(dfX, 0, dfZ);
    scene.add(dfGroup);

    // Stepped square stone base
    box(0.56, 0.12, 0.56, 0, 0, 0, stoneDark, dfGroup);
    // Terrazzo column body
    cyl(0.20, 0.24, 0.78, 0, 0.12, 0, stoneLight, 20, dfGroup);
    // Stainless steel basin
    const basin = addMesh(
      new THREE.CylinderGeometry(0.28, 0.22, 0.14, 24),
      chrome,
      dfGroup
    );
    basin.position.y = 0.94;

    // Inner bowl depression
    cyl(0.24, 0.18, 0.08, 0, 0.96, 0, mat(0x8faab8, 0.2, 0.5), 20, dfGroup);

    // Chrome arched bubbler tap
    const tap = addMesh(new THREE.TorusGeometry(0.045, 0.012, 8, 16, Math.PI), chrome, dfGroup);
    tap.position.set(0, 1.05, 0.10);
    tap.rotation.z = Math.PI / 2;

    // Push button
    cyl(0.022, 0.022, 0.035, 0, 0.88, 0.22, bronzeGold, 12, dfGroup);

    boxes.push({ x0: dfX - 0.4, x1: dfX + 0.4, z0: dfZ - 0.4, z1: dfZ + 0.4 });
  })();

  // =========================================================================
  // 8. LUXURIOUS HYDRANGEA & AZALEA FLOWERING HEDGES
  // =========================================================================
  (() => {
    // Symmetrical blooming shrub borders along the facade
    const hedgeSegments = [
      [-14.5, -7.2],
      [-10.8, -7.2],
      [-7.2, -7.2],
      [7.2, -7.2],
      [10.8, -7.2],
      [14.5, -7.2],
    ];

    hedgeSegments.forEach(([hx, hz], idx) => {
      const hGroup = new THREE.Group();
      hGroup.position.set(hx, 0, hz);
      scene.add(hGroup);

      // Multi-spherical lush bush with 24-28 segments for silky smooth anime volume
      const baseBush = sphere(0.68, 0, 0.45, 0, leafLush[idx % leafLush.length], 1.35, 0.82, 0.95, 24, hGroup);
      sphere(0.52, -0.42, 0.40, 0.08, leafLush[(idx + 1) % leafLush.length], 1.1, 0.88, 0.9, 20, hGroup);
      sphere(0.52, 0.42, 0.40, -0.06, leafLush[(idx + 2) % leafLush.length], 1.1, 0.88, 0.9, 20, hGroup);

      // Blooming hydrangea clusters (pastel azure, blush rose, lavender)
      const flowers = idx % 3 === 0 ? petalBlues : idx % 3 === 1 ? petalPinks : petalPurples;
      for (let f = 0; f < 9; f++) {
        const ang = f * 1.62;
        const rad = 0.32 + (f % 3) * 0.14;
        const fx = Math.cos(ang) * rad;
        const fz = Math.sin(ang) * (rad * 0.7);
        const fy = 0.58 + (f % 4) * 0.06;
        sphere(0.12, fx, fy, fz, flowers[f % flowers.length], 1, 0.82, 1, 14, hGroup);
      }
    });
  })();
}
