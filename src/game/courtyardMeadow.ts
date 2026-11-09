/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';

/** Adds a painted anime sky, soft light, finer grass, and delicate flowers to the courtyard. */
export function addCourtyardMeadow(scene: THREE.Scene, isSoftwareGl: boolean): void {
  let seed = 90731;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Hand-painted gradient sky with warm haze and thin, sweeping cloud strokes.
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 1536;
  skyCanvas.height = 768;
  const skyContext = skyCanvas.getContext('2d');
  if (skyContext) {
    const gradient = skyContext.createLinearGradient(0, 0, 0, skyCanvas.height);
    gradient.addColorStop(0, '#4d8ec8');
    gradient.addColorStop(0.42, '#83b9e2');
    gradient.addColorStop(0.76, '#c2dced');
    gradient.addColorStop(1, '#f4dfd0');
    skyContext.fillStyle = gradient;
    skyContext.fillRect(0, 0, skyCanvas.width, skyCanvas.height);

    const glow = skyContext.createRadialGradient(1130, 340, 12, 1130, 340, 330);
    glow.addColorStop(0, 'rgba(255,244,218,0.82)');
    glow.addColorStop(0.18, 'rgba(255,229,199,0.36)');
    glow.addColorStop(1, 'rgba(255,232,210,0)');
    skyContext.fillStyle = glow;
    skyContext.fillRect(760, 0, 720, 680);

    for (let i = 0; i < 13; i++) {
      const x = random() * skyCanvas.width;
      const y = 190 + random() * 310;
      const radius = 90 + random() * 230;
      const cloud = skyContext.createRadialGradient(x, y, 2, x, y, radius);
      cloud.addColorStop(0, `rgba(255,255,255,${0.13 + random() * 0.14})`);
      cloud.addColorStop(1, 'rgba(255,255,255,0)');
      skyContext.fillStyle = cloud;
      skyContext.save();
      skyContext.translate(x, y);
      skyContext.scale(1, 0.2);
      skyContext.fillRect(-radius, -radius, radius * 2, radius * 2);
      skyContext.restore();
    }
    for (let i = 0; i < 24; i++) {
      const x = random() * skyCanvas.width;
      const y = 225 + random() * 290;
      const length = 90 + random() * 250;
      skyContext.beginPath();
      skyContext.moveTo(x, y);
      skyContext.bezierCurveTo(x + length * 0.24, y - 15, x + length * 0.72, y + 13, x + length, y - 3);
      skyContext.strokeStyle = `rgba(255,255,255,${0.07 + random() * 0.1})`;
      skyContext.lineWidth = 2 + random() * 5;
      skyContext.lineCap = 'round';
      skyContext.stroke();
    }
  }
  const skyTexture = new THREE.CanvasTexture(skyCanvas);
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(460, 48, 32),
    new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, depthWrite: false, fog: false })
  );
  skyDome.name = 'Anime painted sky dome';
  skyDome.renderOrder = -1000;
  skyDome.frustumCulled = false;
  scene.add(skyDome);

  // Subtle warm bounce and rim lighting soften the courtyard without flattening it.
  scene.add(new THREE.HemisphereLight(0xfff1de, 0x71885f, 0.22));
  const rimLight = new THREE.DirectionalLight(0xffe6ca, 0.2);
  rimLight.position.set(-14, 18, 12);
  scene.add(rimLight);

  // Soft light transmission through the existing rounded tree crowns.
  const translucentMaterials = new Map<THREE.Material, THREE.Material>();
  const crownWorldPosition = new THREE.Vector3();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object.geometry.type !== 'SphereGeometry') return;
    object.getWorldPosition(crownWorldPosition);
    if (crownWorldPosition.y < 2.35) return;

    const makeLeafMaterial = (source: THREE.Material): THREE.Material => {
      const cached = translucentMaterials.get(source);
      if (cached) return cached;
      if (!(source instanceof THREE.MeshStandardMaterial)) return source;
      const leaf = source.clone();
      leaf.transparent = true;
      leaf.opacity = 0.92;
      leaf.depthWrite = false;
      leaf.side = THREE.DoubleSide;
      leaf.emissive.copy(leaf.color).multiplyScalar(0.1);
      leaf.emissiveIntensity = 0.5;
      translucentMaterials.set(source, leaf);
      return leaf;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(makeLeafMaterial)
      : makeLeafMaterial(object.material);
  });

  // Narrow, curved grass ribbons: shorter, lighter and denser so they blend into the lawn.
  const bladeGeometry = (() => {
    const positions: number[] = [];
    const indices: number[] = [];
    const rows = 6;
    for (let row = 0; row <= rows; row++) {
      const t = row / rows;
      const width = 0.012 * Math.pow(1 - t, 1.15) + 0.00055;
      const bend = 0.075 * t * t;
      positions.push(-width / 2, t, bend, width / 2, t, bend);
      if (row < rows) {
        const a = row * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  })();
  const grassMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.98,
    side: THREE.DoubleSide,
    vertexColors: true,
  });
  const grassPalette = [0x82a66a, 0x91ad73, 0x74985f, 0xa2b780, 0x87a86c, 0x9caf78];
  const bladeCount = 10500;
  const grass = new THREE.InstancedMesh(bladeGeometry, grassMaterial, bladeCount);
  grass.name = 'Short fine natural courtyard grass';
  grass.castShadow = false;
  grass.receiveShadow = false;
  grass.frustumCulled = false;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const color = new THREE.Color();

  const distanceToSegment = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
    const dx = bx - ax;
    const dz = bz - az;
    const lengthSq = dx * dx + dz * dz;
    const t = THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / lengthSq, 0, 1);
    return Math.hypot(x - (ax + t * dx), z - (az + t * dz));
  };
  const onPath = (x: number, z: number) => {
    if (Math.abs(x) < 3.55 && z > -3.2 && z < 23.5) return true;
    if (Math.abs(x) < 7.8 && z > -6 && z < -1.2) return true;
    return distanceToSegment(x, z, 5, 0, 25, 22.5) < 2.2 ||
      distanceToSegment(x, z, -5, 0, -25, 22.5) < 2.2;
  };
  const nearGardenObject = (x: number, z: number) => {
    const features: Array<[number, number, number]> = [
      [-10.2, 10.2, 3.8], [10.2, 10.2, 3.8], [-18.2, 20.5, 3.8], [18.2, 20.5, 3.8],
      [-18, 13.5, 3.4], [18, 13.5, 3.4], [-7.3, 18.4, 2.2], [7.3, 18.4, 2.2],
      [-8, 2, 1.5], [8, 2, 1.5], [-16, 9, 1.5], [16, 9, 1.5], [-22, 2, 1.5], [22, 2, 1.5],
    ];
    return features.some(([cx, cz, radius]) => Math.hypot(x - cx, z - cz) < radius);
  };

  let placed = 0;
  let attempts = 0;
  while (placed < bladeCount && attempts < bladeCount * 8) {
    attempts++;
    const x = -29 + random() * 58;
    const z = 0.2 + random() * 22.2;
    if (onPath(x, z) || nearGardenObject(x, z)) continue;

    position.set(x + (random() - 0.5) * 0.18, 0.02 + random() * 0.008, z + (random() - 0.5) * 0.18);
    euler.set((random() - 0.5) * 0.1, random() * Math.PI * 2, (random() - 0.5) * 0.12);
    quaternion.setFromEuler(euler);
    const height = 0.09 + random() * 0.15;
    scale.set(0.75 + random() * 0.55, height, 0.75 + random() * 0.55);
    matrix.compose(position, quaternion, scale);
    grass.setMatrixAt(placed, matrix);
    color.setHex(grassPalette[Math.floor(random() * grassPalette.length)]);
    color.multiplyScalar(0.92 + random() * 0.18);
    grass.setColorAt(placed, color);
    placed++;
  }
  grass.count = placed;
  grass.instanceMatrix.needsUpdate = true;
  if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
  scene.add(grass);

  // A larger field of tiny wildflowers, each with eight fine, separate petals.
  const flowerPositions: Array<[number, number, number]> = [];
  attempts = 0;
  while (flowerPositions.length < 120 && attempts < 2400) {
    attempts++;
    const x = -28 + random() * 56;
    const z = 0.3 + random() * 21.7;
    if (onPath(x, z) || nearGardenObject(x, z)) continue;
    flowerPositions.push([x, z, 0.2 + random() * 0.16]);
  }

  const stems = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.0045, 0.008, 1, 6, 3),
    new THREE.MeshStandardMaterial({ color: 0x668354, roughness: 0.96 }),
    flowerPositions.length
  );
  stems.castShadow = !isSoftwareGl;
  stems.receiveShadow = false;

  const petalShape = new THREE.Shape();
  petalShape.moveTo(0, 0);
  petalShape.bezierCurveTo(-0.55, 0.22, -0.5, 0.88, 0, 1);
  petalShape.bezierCurveTo(0.5, 0.88, 0.55, 0.22, 0, 0);
  const petalGeometry = new THREE.ShapeGeometry(petalShape, 8);
  const petalsPerFlower = 8;
  const petals = new THREE.InstancedMesh(
    petalGeometry,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, side: THREE.DoubleSide }),
    flowerPositions.length * petalsPerFlower
  );
  petals.castShadow = !isSoftwareGl;
  petals.receiveShadow = false;
  const blossomColors = [0xf3e7d4, 0xf1bfd0, 0xe9aebf, 0xf5d98d, 0xcbd6ef];
  const centers = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.016, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0xf3d07a, roughness: 0.82 }),
    flowerPositions.length
  );
  centers.castShadow = false;
  centers.receiveShadow = false;

  let petalIndex = 0;
  flowerPositions.forEach(([x, z, height], index) => {
    position.set(x, height / 2 + 0.02, z);
    euler.set(0, random() * Math.PI * 2, (random() - 0.5) * 0.1);
    quaternion.setFromEuler(euler);
    scale.set(1, height, 1);
    matrix.compose(position, quaternion, scale);
    stems.setMatrixAt(index, matrix);

    const flowerY = height + 0.02;
    const petalColor = new THREE.Color(blossomColors[Math.floor(random() * blossomColors.length)]);
    for (let p = 0; p < petalsPerFlower; p++) {
      const angle = (p / petalsPerFlower) * Math.PI * 2 + random() * 0.08;
      position.set(x + Math.cos(angle) * 0.015, flowerY, z + Math.sin(angle) * 0.015);
      euler.set(-Math.PI / 2 + (random() - 0.5) * 0.1, angle, (random() - 0.5) * 0.06);
      quaternion.setFromEuler(euler);
      scale.set(0.022 + random() * 0.006, 0.034 + random() * 0.012, 1);
      matrix.compose(position, quaternion, scale);
      petals.setMatrixAt(petalIndex, matrix);
      petals.setColorAt(petalIndex, petalColor);
      petalIndex++;
    }
    position.set(x, flowerY + 0.004, z);
    scale.setScalar(1);
    matrix.compose(position, new THREE.Quaternion(), scale);
    centers.setMatrixAt(index, matrix);
  });
  stems.instanceMatrix.needsUpdate = true;
  petals.instanceMatrix.needsUpdate = true;
  if (petals.instanceColor) petals.instanceColor.needsUpdate = true;
  centers.instanceMatrix.needsUpdate = true;
  scene.add(stems, petals, centers);

  // Fine fallen petals scattered beneath the flowering cherry trees.
  const fallenCount = 220;
  const fallen = new THREE.InstancedMesh(
    petalGeometry,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide }),
    fallenCount
  );
  fallen.receiveShadow = !isSoftwareGl;
  const fallenPalette = [0xf3e7d4, 0xf1bfd0, 0xe9aebf, 0xf7d7d1];
  for (let i = 0; i < fallenCount; i++) {
    const side = i % 2 ? 1 : -1;
    position.set(side * (14.2 + random() * 7.5), 0.022 + random() * 0.009, 8.5 + random() * 9.5);
    euler.set(-Math.PI / 2, random() * Math.PI * 2, (random() - 0.5) * 0.25);
    quaternion.setFromEuler(euler);
    scale.set(0.018 + random() * 0.015, 0.028 + random() * 0.02, 1);
    matrix.compose(position, quaternion, scale);
    fallen.setMatrixAt(i, matrix);
    color.setHex(fallenPalette[Math.floor(random() * fallenPalette.length)]);
    fallen.setColorAt(i, color);
  }
  fallen.instanceMatrix.needsUpdate = true;
  if (fallen.instanceColor) fallen.instanceColor.needsUpdate = true;
  scene.add(fallen);

  // Soft translucent sun dapples beneath the cherry canopies.
  const dappleCanvas = document.createElement('canvas');
  dappleCanvas.width = dappleCanvas.height = 128;
  const dappleContext = dappleCanvas.getContext('2d');
  if (dappleContext) {
    const gradient = dappleContext.createRadialGradient(64, 64, 4, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(255,238,188,0.2)');
    gradient.addColorStop(0.55, 'rgba(255,231,184,0.09)');
    gradient.addColorStop(1, 'rgba(255,231,184,0)');
    dappleContext.fillStyle = gradient;
    dappleContext.fillRect(0, 0, 128, 128);
  }
  const dappleTexture = new THREE.CanvasTexture(dappleCanvas);
  dappleTexture.colorSpace = THREE.SRGBColorSpace;
  const dappleMaterial = new THREE.MeshBasicMaterial({
    map: dappleTexture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1;
    const dapple = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2 + random() * 2, 0.8 + random() * 1.5),
      dappleMaterial
    );
    dapple.rotation.x = -Math.PI / 2;
    dapple.rotation.z = random() * Math.PI;
    dapple.position.set(side * (14.8 + random() * 5.2), 0.027, 9 + random() * 8);
    dapple.renderOrder = 1;
    dapple.receiveShadow = false;
    scene.add(dapple);
  }
}
