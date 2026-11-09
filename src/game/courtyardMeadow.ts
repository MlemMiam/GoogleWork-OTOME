/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';

/** Adds an illustrated sky, soft light, natural lawn tufts and delicate flowers. */
export function addCourtyardMeadow(scene: THREE.Scene, isSoftwareGl: boolean): void {
  let seed = 90731;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Hand-painted gradient sky with warm haze and fine, sweeping cloud strokes.
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

  scene.add(new THREE.HemisphereLight(0xfff1de, 0x71885f, 0.22));
  const rimLight = new THREE.DirectionalLight(0xffe6ca, 0.2);
  rimLight.position.set(-14, 18, 12);
  scene.add(rimLight);

  // Let soft light show through the existing rounded tree crowns.
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
  const onLawn = (x: number, z: number) =>
    x >= -29 && x <= 29 && z >= 0.2 && z <= 22.2 && !onPath(x, z) && !nearGardenObject(x, z);

  // Each instance is a soft, curved tuft of three slender blades, splayed in different directions.
  const tuftGeometry = (() => {
    const positions: number[] = [];
    const indices: number[] = [];
    const bladeCount = 3;
    const rows = 6;
    for (let blade = 0; blade < bladeCount; blade++) {
      const angle = (blade / bladeCount) * Math.PI * 2 + blade * 0.73;
      const spread = 0.014 + blade * 0.003;
      const base = positions.length / 3;
      for (let row = 0; row <= rows; row++) {
        const t = row / rows;
        const halfWidth = 0.009 * Math.pow(1 - t, 1.1) + 0.0004;
        const reach = spread * t;
        const bend = 0.07 * t * t;
        const centerX = Math.cos(angle) * reach + Math.sin(angle) * bend;
        const centerZ = Math.sin(angle) * reach - Math.cos(angle) * bend;
        const sideX = -Math.sin(angle) * halfWidth;
        const sideZ = Math.cos(angle) * halfWidth;
        positions.push(centerX - sideX, t, centerZ - sideZ, centerX + sideX, t, centerZ + sideZ);
        if (row < rows) {
          const a = base + row * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
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
    roughness: 1,
    side: THREE.DoubleSide,
    vertexColors: true,
    // Soft green bounce prevents thin, back-facing blades from reading as black.
    emissive: 0x91aa78,
    emissiveIntensity: 0.3,
  });
  const grassPalette = [0xc5dfa4, 0xd4e8b6, 0xb9d897, 0xdcecc2, 0xcbe3ad, 0xb8d79a];
  const gridStep = isSoftwareGl ? 0.15 : 0.095;
  const columns = Math.ceil(58 / gridStep);
  const rows = Math.ceil(22 / gridStep);
  const grass = new THREE.InstancedMesh(tuftGeometry, grassMaterial, columns * rows);
  grass.name = 'Soft dense light-green courtyard grass';
  grass.castShadow = false;
  grass.receiveShadow = false;
  grass.frustumCulled = false;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const color = new THREE.Color();
  let tuftIndex = 0;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = -29 + (column + 0.5) * gridStep + (random() - 0.5) * gridStep * 1.15;
      const z = 0.2 + (row + 0.5) * gridStep + (random() - 0.5) * gridStep * 1.15;
      if (!onLawn(x, z)) continue;

      // Soft density waves form loose clumps, with only small gaps between them.
      const wave = 0.5 + 0.25 * Math.sin(x * 0.72 + Math.sin(z * 0.43)) + 0.25 * Math.cos(z * 0.64 - x * 0.19);
      const density = THREE.MathUtils.clamp(0.82 + wave * 0.15, 0.8, 0.96);
      if (random() > density) continue;

      position.set(x, 0.01 + random() * 0.003, z);
      const yaw = random() * Math.PI * 2;
      const lean = (random() - 0.5) * 0.34;
      euler.set(lean * 0.3, yaw, lean);
      quaternion.setFromEuler(euler);
      // Mostly short grass with a few slightly taller blades for a natural uneven edge.
      const heightRoll = random();
      const height = heightRoll < 0.78 ? 0.24 + random() * 0.24 : 0.42 + random() * 0.25;
      const widthScale = 0.72 + random() * 0.8;
      scale.set(widthScale, height, widthScale);
      matrix.compose(position, quaternion, scale);
      grass.setMatrixAt(tuftIndex, matrix);
      color.setHex(grassPalette[Math.floor(random() * grassPalette.length)]);
      color.multiplyScalar(0.98 + random() * 0.08);
      grass.setColorAt(tuftIndex, color);
      tuftIndex++;
    }
  }
  grass.count = tuftIndex;
  grass.instanceMatrix.needsUpdate = true;
  if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
  scene.add(grass);

  // Fine little wildflowers in scattered mini-clusters across the flat lawn.
  const flowerPositions: Array<[number, number, number]> = [];
  const flowerGrid = 0.48;
  for (let z = 0.45; z < 22; z += flowerGrid) {
    for (let x = -28; x < 28; x += flowerGrid) {
      const flowerX = x + (random() - 0.5) * flowerGrid;
      const flowerZ = z + (random() - 0.5) * flowerGrid;
      const clusterChance = random() < 0.18 ? 0.42 : 0.09;
      if (onLawn(flowerX, flowerZ) && random() < clusterChance) {
        flowerPositions.push([flowerX, flowerZ, 0.12 + random() * 0.1]);
      }
    }
  }

  const stems = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.0025, 0.0045, 1, 5, 3),
    new THREE.MeshStandardMaterial({ color: 0x849b68, roughness: 0.96 }),
    flowerPositions.length
  );
  stems.castShadow = false;
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
  petals.castShadow = false;
  petals.receiveShadow = false;
  const blossomColors = [0xf3e7d4, 0xf1bfd0, 0xe9aebf, 0xf5d98d, 0xcbd6ef, 0xffffff];
  const centers = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.01, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xf3d07a, roughness: 0.82 }),
    flowerPositions.length
  );
  centers.castShadow = false;
  centers.receiveShadow = false;

  let petalIndex = 0;
  flowerPositions.forEach(([x, z, height], index) => {
    position.set(x, height / 2 + 0.012, z);
    euler.set(0, random() * Math.PI * 2, (random() - 0.5) * 0.08);
    quaternion.setFromEuler(euler);
    scale.set(1, height, 1);
    matrix.compose(position, quaternion, scale);
    stems.setMatrixAt(index, matrix);

    const flowerY = height + 0.012;
    const petalColor = new THREE.Color(blossomColors[Math.floor(random() * blossomColors.length)]);
    for (let p = 0; p < petalsPerFlower; p++) {
      const angle = (p / petalsPerFlower) * Math.PI * 2 + random() * 0.08;
      position.set(x + Math.cos(angle) * 0.009, flowerY, z + Math.sin(angle) * 0.009);
      euler.set(-Math.PI / 2 + (random() - 0.5) * 0.1, angle, (random() - 0.5) * 0.06);
      quaternion.setFromEuler(euler);
      scale.set(0.014 + random() * 0.005, 0.023 + random() * 0.008, 1);
      matrix.compose(position, quaternion, scale);
      petals.setMatrixAt(petalIndex, matrix);
      petals.setColorAt(petalIndex, petalColor);
      petalIndex++;
    }
    position.set(x, flowerY + 0.002, z);
    scale.setScalar(1);
    matrix.compose(position, new THREE.Quaternion(), scale);
    centers.setMatrixAt(index, matrix);
  });
  stems.instanceMatrix.needsUpdate = true;
  petals.instanceMatrix.needsUpdate = true;
  if (petals.instanceColor) petals.instanceColor.needsUpdate = true;
  centers.instanceMatrix.needsUpdate = true;
  scene.add(stems, petals, centers);
}
