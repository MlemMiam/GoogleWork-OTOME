/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BoundingBox {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export const WORLD = {
  x0: -58,
  x1: 58,
  z0: -44,
  z1: 37,
};

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Circle-AABB collision resolution in the XZ plane with world clamping.
 */
export function collide(
  px: number,
  pz: number,
  radius: number,
  boxes: BoundingBox[]
): [number, number] {
  let cx = px;
  let cz = pz;

  for (let it = 0; it < 2; it++) {
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      const clx = clamp(cx, b.x0, b.x1);
      const clz = clamp(cz, b.z0, b.z1);
      const dx = cx - clx;
      const dz = cz - clz;
      const d2 = dx * dx + dz * dz;

      if (d2 < radius * radius) {
        if (d2 > 1e-9) {
          const d = Math.sqrt(d2);
          const k = (radius - d) / d;
          cx += dx * k;
          cz += dz * k;
        } else {
          // Inside the box, push out to nearest edge
          const left = cx - b.x0;
          const right = b.x1 - cx;
          const top = cz - b.z0;
          const bottom = b.z1 - cz;
          const m = Math.min(left, right, top, bottom);

          if (m === left) cx = b.x0 - radius;
          else if (m === right) cx = b.x1 + radius;
          else if (m === top) cz = b.z0 - radius;
          else cz = b.z1 + radius;
        }
      }
    }
  }

  return [clamp(cx, WORLD.x0, WORLD.x1), clamp(cz, WORLD.z0, WORLD.z1)];
}

/**
 * Identify zone and description based on coordinate XZ.
 */
export function getPlaceInfo(x: number, z: number): { title: string; subtitle: string } {
  if (x > -30 && x < 30 && z < -10) {
    if (z < -22) {
      const roomNum = x < -14 ? 1 : x < 0 ? 2 : x < 14 ? 3 : 4;
      return { title: `Salle 10${roomNum}`, subtitle: 'East High · rez-de-chaussée' };
    }
    return { title: 'Hall principal', subtitle: 'East High · rez-de-chaussée' };
  }
  if (Math.abs(x) < 3 && z < -5.6 && z >= -10) {
    return { title: 'Entrée vitrée', subtitle: 'East High' };
  }
  if (z > 25.5) {
    return { title: 'Rue', subtitle: 'Devant le lycée' };
  }
  return { title: "Cour d'entrée", subtitle: 'East High' };
}

/**
 * Calculate move speed given walk state, shift state, and input magnitude
 */
export function calculateSpeed(isMoving: boolean, isRunning: boolean): number {
  if (!isMoving) return 0;
  return isRunning ? 5.8 : 3.1;
}
