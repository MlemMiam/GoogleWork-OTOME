/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { collide, getPlaceInfo, calculateSpeed, WORLD, BoundingBox } from './physics';

test('world boundaries clamp position', () => {
  const [x, z] = collide(100, -100, 0.38, []);
  assert.equal(x, WORLD.x1);
  assert.equal(z, WORLD.z0);
});

test('collision pushes entity out of bounding box', () => {
  const box: BoundingBox = { x0: -5, x1: 5, z0: -5, z1: 5 };
  // Entity at (0, 4.8) with radius 0.38 is overlapping with z1=5
  const [x, z] = collide(0, 4.8, 0.38, [box]);
  // Should be pushed outside to >= 5 + 0.38
  assert.ok(z >= 5.38 - 0.001);
});

test('getPlaceInfo returns accurate zone titles', () => {
  assert.deepEqual(getPlaceInfo(0, 16), {
    title: "Cour d'entrée",
    subtitle: 'East High',
  });

  assert.deepEqual(getPlaceInfo(0, 30), {
    title: 'Rue',
    subtitle: 'Devant le lycée',
  });

  assert.deepEqual(getPlaceInfo(0, -15), {
    title: 'Hall principal',
    subtitle: 'East High · rez-de-chaussée',
  });

  assert.deepEqual(getPlaceInfo(-20, -25), {
    title: 'Salle 101',
    subtitle: 'East High · rez-de-chaussée',
  });

  assert.deepEqual(getPlaceInfo(-7, -25), {
    title: 'Salle 102',
    subtitle: 'East High · rez-de-chaussée',
  });

  assert.deepEqual(getPlaceInfo(7, -25), {
    title: 'Salle 103',
    subtitle: 'East High · rez-de-chaussée',
  });

  assert.deepEqual(getPlaceInfo(20, -25), {
    title: 'Salle 104',
    subtitle: 'East High · rez-de-chaussée',
  });
});

test('calculateSpeed computes walking and running speeds', () => {
  assert.equal(calculateSpeed(false, false), 0);
  assert.equal(calculateSpeed(false, true), 0);
  assert.equal(calculateSpeed(true, false), 3.1);
  assert.equal(calculateSpeed(true, true), 5.8);
});
