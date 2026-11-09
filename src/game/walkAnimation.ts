import * as THREE from 'three';
import {
  collectPose,
  applyRelaxedPose,
  sampleClip,
  addHandMotions,
  TAU,
  Motion,
  PoseSet,
} from './idleAnimation';

export const WALK_DURATION = 1.0;

/** The model's side axis (its left-right line). Rotating about it swings a limb forward or back. */
const SIDE_AXIS = new THREE.Vector3(1, 0, 0);

/** Orientation of a bone in the model's frame at rest, using the relaxed pose where it is known. */
function restQuaternion(bone: THREE.Object3D, root: THREE.Object3D, bases: PoseSet): THREE.Quaternion {
  const chain: THREE.Object3D[] = [];
  for (let node: THREE.Object3D | null = bone; node && node !== root; node = node.parent) chain.push(node);
  const q = new THREE.Quaternion();
  for (let i = chain.length - 1; i >= 0; i--) {
    q.multiply(bases[chain[i].name]?.quaternion ?? chain[i].quaternion);
  }
  return q;
}

/**
 * A motion that rotates a bone about the model's side axis, so it swings strictly forward and back
 * whatever the bone's own local axes are. `angle` is in radians, positive = limb swings backward.
 * (The clip composes offsets as `base * euler`, so the offset is the side axis expressed in the bone's frame.)
 */
function sagittalMotion(
  bases: PoseSet,
  root: THREE.Object3D,
  boneName: string,
  angle: (t: number) => number
): Motion {
  const base = bases[boneName];
  if (!base) return {};
  const axis = SIDE_AXIS.clone().applyQuaternion(restQuaternion(base.bone, root, bases).invert());
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  let lastT = NaN;
  const at = (t: number) => {
    if (t !== lastT) {
      quat.setFromAxisAngle(axis, angle(t));
      euler.setFromQuaternion(quat, 'XYZ');
      lastT = t;
    }
    return euler;
  };
  return { rx: (t) => at(t).x, ry: (t) => at(t).y, rz: (t) => at(t).z };
}

/**
 * Procedural anime walk cycle for Florie:
 * - Fluid, elegant, gentle gait with soft knee flexion and ankle roll
 * - Graceful hip sway and subtle pelvic bounce (inverted pendulum dynamics)
 * - Upright torso with delicate counter-rotation for poise
 * - Relaxed anime arm swing with soft elbow flex and wrist follow-through
 * - Trailing secondary motion for hair, skirt, and sleeve cuffs
 */
function buildWalkMotions(
  secondary: THREE.Bone[],
  bases: PoseSet,
  root: THREE.Object3D
): Record<string, Motion> {
  const phi = (t: number) => (TAU * t) / WALK_DURATION;

  // Asymmetric smooth knee flex curve:
  // Peaks during the swing/recovery phase (mid-swing ~ 0.40 rad) and cushions down to soft plant (~ 0.05 rad)
  const kneeCurve = (phaseOffset: number) => (t: number) => {
    const p = phi(t) + phaseOffset;
    const h1 = Math.sin(p - 0.7);
    const h2 = Math.sin(2 * (p - 0.7));
    const curve = 0.5 + 0.5 * (0.75 * h1 - 0.25 * h2);
    return 0.05 + 0.38 * Math.pow(curve, 2);
  };

  // Ankle roll curve: plantarflexion at toe push-off, gentle dorsiflexion at heel contact
  const footCurve = (phaseOffset: number) => (t: number) => {
    const p = phi(t) + phaseOffset;
    return 0.14 * Math.sin(p - 1.6) - 0.05 * Math.sin(2 * (p - 1.6));
  };

  // Arm swing pitch: generous front-to-back swing, zero sideways waggle
  const armPitchL = (t: number) => -0.32 * Math.sin(phi(t) - 0.12);
  const armPitchR = (t: number) => 0.32 * Math.sin(phi(t) - 0.12);

  // Elbow hinge flex: supple double-pendulum lag, flexes forward on swing, eases back
  const elbowPitchL = (t: number) => 0.16 - 0.14 * Math.sin(phi(t) - 0.38);
  const elbowPitchR = (t: number) => 0.16 + 0.14 * Math.sin(phi(t) - 0.38);

  // Wrist trailing wave: soft fluid wave following the forearm
  const wristPitchL = (t: number) => -0.12 * Math.sin(phi(t) - 0.65);
  const wristPitchR = (t: number) => 0.12 * Math.sin(phi(t) - 0.65);

  const motions: Record<string, Motion> = {
    // --- Pelvis / Hips ---
    J_Bip_C_Hips: {
      // Inverted pendulum vertical bounce (dips on step plant, rises at mid-stride)
      py: (t) => -0.010 * (1 - Math.cos(2 * phi(t))),
      // Graceful lateral weight shift
      px: (t) => 0.010 * Math.sin(phi(t)),
      // Feminine hip sway / pelvic roll
      rz: (t) => 0.032 * Math.sin(phi(t)),
      // Pelvic yaw following the advancing leg
      ry: (t) => -0.040 * Math.sin(phi(t)),
      // Upright posture with gentle cyclic breathing
      rx: (t) => 0.024 + 0.008 * Math.cos(2 * phi(t)),
    },

    // --- Torso (smooth poise, keeping shoulders level and stable) ---
    J_Bip_C_Spine: {
      rx: (t) => -0.014 - 0.005 * Math.cos(2 * phi(t)),
      ry: (t) => 0.018 * Math.sin(phi(t)),
      rz: (t) => -0.010 * Math.sin(phi(t)),
    },
    J_Bip_C_Chest: {
      rx: (t) => -0.010 - 0.004 * Math.cos(2 * phi(t)),
      ry: (t) => 0.012 * Math.sin(phi(t)),
      rz: (t) => -0.006 * Math.sin(phi(t)),
    },
    J_Bip_C_UpperChest: {
      rx: () => -0.005,
      ry: (t) => 0.006 * Math.sin(phi(t)),
    },

    // --- Neck & Head (serene, forward gaze with cute delicate rhythmic nod) ---
    J_Bip_C_Neck: {
      rx: (t) => 0.008 * Math.cos(2 * phi(t)),
      ry: (t) => -0.008 * Math.sin(phi(t)),
    },
    J_Bip_C_Head: {
      rx: (t) => 0.012 * Math.cos(2 * phi(t) + 0.3),
      ry: (t) => -0.006 * Math.sin(phi(t)),
      rz: (t) => 0.008 * Math.sin(phi(t) + 0.35),
    },

    // --- Shoulders (steady clavicles, zero lateral wagging) ---
    J_Bip_L_Shoulder: {
      rx: (t) => -0.015 * Math.sin(phi(t) - 0.05),
    },
    J_Bip_R_Shoulder: {
      rx: (t) => 0.015 * Math.sin(phi(t) - 0.05),
    },

    // --- Arms: pure front-and-back swing about the model's side axis (no left-right drift) ---
    J_Bip_L_UpperArm: sagittalMotion(bases, root, 'J_Bip_L_UpperArm', armPitchL),
    J_Bip_R_UpperArm: sagittalMotion(bases, root, 'J_Bip_R_UpperArm', armPitchR),

    // --- Elbows: soft forward hinge flex (same curve as before, flexing the hand forward) ---
    J_Bip_L_LowerArm: sagittalMotion(bases, root, 'J_Bip_L_LowerArm', (t) => -elbowPitchL(t)),
    J_Bip_R_LowerArm: sagittalMotion(bases, root, 'J_Bip_R_LowerArm', (t) => -elbowPitchR(t)),

    // --- Wrists: soft trailing wave following the forearm ---
    J_Bip_L_Hand: sagittalMotion(bases, root, 'J_Bip_L_Hand', wristPitchL),
    J_Bip_R_Hand: sagittalMotion(bases, root, 'J_Bip_R_Hand', wristPitchR),

    // --- Legs (Thighs, Knees, Feet) ---
    J_Bip_L_UpperLeg: {
      rx: (t) => 0.22 * Math.sin(phi(t)) + 0.035 * Math.sin(2 * phi(t) - 1.57),
      ry: () => -0.010,
      rz: () => 0.016,
    },
    J_Bip_R_UpperLeg: {
      rx: (t) => -0.22 * Math.sin(phi(t)) - 0.035 * Math.sin(2 * phi(t) - 1.57),
      ry: () => 0.010,
      rz: () => -0.016,
    },
    J_Bip_L_LowerLeg: {
      rx: kneeCurve(0),
    },
    J_Bip_R_LowerLeg: {
      rx: kneeCurve(Math.PI),
    },
    J_Bip_L_Foot: {
      rx: footCurve(0),
      rz: (t) => -0.022 * Math.sin(phi(t)),
    },
    J_Bip_R_Foot: {
      rx: footCurve(Math.PI),
      rz: (t) => -0.022 * Math.sin(phi(t)),
    },
  };

  // Add hand/finger neutral tracks so fingers remain relaxed throughout
  addHandMotions(motions);

  // Add secondary follow-through for hair, skirt, and sleeves
  addWalkSecondaryMotions(motions, secondary);

  return motions;
}

function addWalkSecondaryMotions(
  motions: Record<string, Motion>,
  secondary: THREE.Bone[]
) {
  const phi = (t: number) => (TAU * t) / WALK_DURATION;

  secondary.forEach((bone, index) => {
    const isHair = /Hair/.test(bone.name);
    const isSkirt = /Skirt/.test(bone.name);
    const isLeftSkirt = /L_Skirt/.test(bone.name);
    const isRightSkirt = /R_Skirt/.test(bone.name);
    const isSleeve = /Sleeve/.test(bone.name);
    const isLeftSleeve = /L_.*Sleeve/.test(bone.name);

    const stagger = (index % 5) * 0.08;

    if (isHair) {
      // Hair bobs vertically with step impacts and sways softly with the hips
      motions[bone.name] = {
        rx: (t) => 0.040 * Math.cos(2 * phi(t) - 0.45 - stagger),
        rz: (t) => 0.028 * Math.sin(phi(t) - 0.40 - stagger),
      };
    } else if (isSkirt) {
      // Skirt responds to leg stride and pelvic bounce
      if (isLeftSkirt) {
        motions[bone.name] = {
          rx: (t) => 0.075 * Math.sin(phi(t) - stagger) + 0.035 * Math.cos(2 * phi(t)),
          rz: (t) => 0.045 * Math.sin(phi(t) - stagger),
        };
      } else if (isRightSkirt) {
        motions[bone.name] = {
          rx: (t) => -0.075 * Math.sin(phi(t) - stagger) + 0.035 * Math.cos(2 * phi(t)),
          rz: (t) => -0.045 * Math.sin(phi(t) - stagger),
        };
      } else {
        motions[bone.name] = {
          rx: (t) => 0.035 * Math.cos(2 * phi(t) - stagger),
          rz: (t) => 0.025 * Math.sin(phi(t) - stagger),
        };
      }
    } else if (isSleeve) {
      // Sleeves trail the dynamic front-and-back arm swing with fluid inertia
      const sign = isLeftSleeve ? -1 : 1;
      motions[bone.name] = {
        rx: (t) => sign * 0.08 * Math.sin(phi(t) - 0.55 - stagger),
        rz: (t) => sign * 0.03 * Math.cos(phi(t) - 0.35),
      };
    }
  });
}

/**
 * Creates the fluid, gentle anime walk animation clip for Florie.
 */
export function createWalkAnimationClip(root: THREE.Object3D): THREE.AnimationClip {
  const { bases, secondary } = collectPose(root);
  applyRelaxedPose(bases);
  return sampleClip(bases, buildWalkMotions(secondary, bases, root), 'florie_anime_walk', WALK_DURATION);
}
