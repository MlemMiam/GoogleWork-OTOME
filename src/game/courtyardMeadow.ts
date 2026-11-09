/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';

/** Adds fine, hand-shaped grass blades and small meadow flowers without external assets. */
export function addCourtyardMeadow(scene: THREE.Scene, isSoftwareGl: boolean): void {
  // Use a private deterministic random stream: garden details stay stable between launches.
  let seed = 90731;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const bladeGeometry = (() => {
    // A slender curved leaf made from a tapered ribbon with several bend segments.
    const positions: number[] = [];
    const indices: number[] = [];
    const rows = 5;
    for (let row = 0; row <= rows; row++) {
      const t = row / rows;
      const width = 0.045 * (1 - t) + 0.0015;
      const bend = 0.12 * t * t;
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

  const bladeMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.96,
    side: THREE.DoubleSide,
    vertexColors: true,
  });
  const count = 1450;
  const grass = new THREE.InstancedMesh(bladeGeometry, bladeMaterial, count);
  grass.name = 'Courtyard fine grass';
  grass.castShadow = false;
  grass.receiveShadow = false;
  grass.frustumCulled = false;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const color = new THREE.Color();
  const grassPalette = [0x6f9856, 0x86a867, 0x547b4c, 0xa2ad67, 0x789354];

  // Keep the flagstones, spawn point, entrance route, planters and trees clear.
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
  while (placed < count && attempts < count * 5) {
    attempts++;
    const x = -29 + random() * 58;
    const z = 0.2 + random() * 22.2;
    if (onPath(x, z) || nearGardenObject(x, z)) continue;

    position.set(x, 0.025 + random() * 0.012, z);
    euler.set(0, random() * Math.PI * 2, (random() - 0.5) * 0.16);
    quaternion.setFromEuler(euler);
    const height = 0.18 + random() * 0.26;
    scale.set(0.7 + random() * 0.8, height, 0.7 + random() * 0.8);
    matrix.compose(position, quaternion, scale);
    grass.setMatrixAt(placed, matrix);
    color.setHex(grassPalette[Math.floor(random() * grassPalette.length)]);
    color.multiplyScalar(0.86 + random() * 0.28);
    grass.setColorAt(placed, color);
    placed++;
  }
  grass.count = placed;
  grass.instanceMatrix.needsUpdate = true;
  if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
  scene.add(grass);

  // Tiny wildflowers: fine curved stems, paired leaves, five soft petals and a warm center.
  const flowerPositions: Array<[number, number, number]> = [];
  attempts = 0;
  while (flowerPositions.length < 48 && attempts < 1200) {
    attempts++;
    const x = -28 + random() * 56;
    const z = 0.3 + random() * 21.7;
    if (onPath(x, z) || nearGardenObject(x, z)) continue;
    flowerPositions.push([x, z, 0.27 + random() * 0.19]);
  }

  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x537448, roughness: 0.95 });
  const stemGeometry = new THREE.CylinderGeometry(0.008, 0.014, 1, 6, 3);
  const stems = new THREE.InstancedMesh(stemGeometry, stemMaterial, flowerPositions.length);
  stems.castShadow = !isSoftwareGl;
  stems.receiveShadow = false;
  const petalGeometry = new THREE.SphereGeometry(1, 12, 8);
  const petalMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 });
  const petals = new THREE.InstancedMesh(petalGeometry, petalMaterial, flowerPositions.length * 5);
  petals.castShadow = !isSoftwareGl;
  petals.receiveShadow = false;
  const centerMaterial = new THREE.MeshStandardMaterial({ color: 0xf3d07a, roughness: 0.82 });
  const centers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.027, 12, 8), centerMaterial, flowerPositions.length);
  centers.castShadow = false;
  centers.receiveShadow = false;

  const blossomColors = [0xf3e7d4, 0xf1bfd0, 0xe9aebf, 0xf5d98d, 0xcbd6ef];
  let petalIndex = 0;
  flowerPositions.forEach(([x, z, height], index) => {
    const tilt = (random() - 0.5) * 0.18;
    position.set(x, height / 2 + 0.025, z);
    euler.set(0, random() * Math.PI * 2, tilt);
    quaternion.setFromEuler(euler);
    scale.set(1, height, 1);
    matrix.compose(position, quaternion, scale);
    stems.setMatrixAt(index, matrix);

    const blossomY = height + 0.025;
    const flowerColor = new THREE.Color(blossomColors[Math.floor(random() * blossomColors.length)]);
    for (let petal = 0; petal < 5; petal++) {
      const angle = (petal / 5) * Math.PI * 2 + random() * 0.12;
      position.set(x + Math.cos(angle) * 0.042, blossomY, z + Math.sin(angle) * 0.042);
      euler.set(0, -angle, (random() - 0.5) * 0.16);
      quaternion.setFromEuler(euler);
      scale.set(0.044, 0.022, 0.027);
      matrix.compose(position, quaternion, scale);
      petals.setMatrixAt(petalIndex, matrix);
      petals.setColorAt(petalIndex, flowerColor);
      petalIndex++;
    }
    position.set(x, blossomY + 0.005, z);
    scale.setScalar(1);
    matrix.compose(position, new THREE.Quaternion(), scale);
    centers.setMatrixAt(index, matrix);
  });
  stems.instanceMatrix.needsUpdate = true;
  petals.instanceMatrix.needsUpdate = true;
  if (petals.instanceColor) petals.instanceColor.needsUpdate = true;
  centers.instanceMatrix.needsUpdate = true;
  scene.add(stems, petals, centers);

  // A few fallen petals make the cherry trees feel integrated with the ground.
  const fallenGeometry = new THREE.CircleGeometry(1, 10);
  const fallenMaterial = new THREE.MeshStandardMaterial({
    color: 0xe9b7c0,
    roughness: 0.88,
    side: THREE.DoubleSide,
  });
  const fallenCount = 110;
  const fallen = new THREE.InstancedMesh(fallenGeometry, fallenMaterial, fallenCount);
  fallen.receiveShadow = !isSoftwareGl;
  for (let i = 0; i < fallenCount; i++) {
    const side = i % 2 ? 1 : -1;
    position.set(side * (14.2 + random() * 7.5), 0.018 + random() * 0.008, 8.5 + random() * 9.5);
    euler.set(-Math.PI / 2, random() * Math.PI * 2, (random() - 0.5) * 0.3);
    quaternion.setFromEuler(euler);
    scale.set(0.025 + random() * 0.045, 0.012 + random() * 0.025, 1);
    matrix.compose(position, quaternion, scale);
    fallen.setMatrixAt(i, matrix);
    color.setHex(blossomColors[Math.floor(random() * blossomColors.length)]);
    fallen.setColorAt(i, color);
  }
  fallen.instanceMatrix.needsUpdate = true;
  if (fallen.instanceColor) fallen.instanceColor.needsUpdate = true;
  scene.add(fallen);
}
