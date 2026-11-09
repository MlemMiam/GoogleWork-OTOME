import * as THREE from 'three';
import {
  collectPose,
  applyRelaxedPose,
  sampleClip,
  addHandMotions,
  TAU,
  Motion,
} from './idleAnimation';

export const WALK_DURATION = 1.0;

/**
 * Procedural anime walk cycle for Florie:
 * - Fluid, elegant, gentle gait with soft knee flexion and ankle roll
 * - Graceful hip sway and subtle pelvic bounce (inverted pendulum dynamics)
 * - Upright torso with delicate counter-rotation for poise
 * - Relaxed anime arm swing with soft elbow flex and wrist follow-through
 * - Trailing secondary motion for hair, skirt, and sleeve cuffs
 */
function buildWalkMotions(secondary: THREE.Bone[]): Record<string, Motion> {
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

    // --- Arms (pure front-and-back sagittal swing, zero left-to-right drift) ---
    J_Bip_L_UpperArm: {
      rx: (t) => 0.976 * armPitchL(t),
      ry: (t) => 0.010 * armPitchL(t),
      rz: (t) => -0.04 + 0.219 * armPitchL(t),
    },
    J_Bip_R_UpperArm: {
      rx: (t) => 0.976 * armPitchR(t),
      ry: (t) => -0.010 * armPitchR(t),
      rz: (t) => 0.04 - 0.219 * armPitchR(t),
    },

    // --- Elbows / Forearms (pure sagittal hinge flexion, zero sideways wobble) ---
    J_Bip_L_LowerArm: {
      rx: (t) => 0.970 * elbowPitchL(t),
      ry: (t) => -0.110 * elbowPitchL(t),
      rz: (t) => 0.219 * elbowPitchL(t),
    },
    J_Bip_R_LowerArm: {
      rx: (t) => 0.970 * elbowPitchR(t),
      ry: (t) => 0.110 * elbowPitchR(t),
      rz: (t) => -0.219 * elbowPitchR(t),
    },

    // --- Wrists / Hands (pure sagittal trailing wave, zero sideways flutter) ---
    J_Bip_L_Hand: {
      rx: (t) => 0.964 * wristPitchL(t),
      ry: (t) => -0.148 * wristPitchL(t),
      rz: (t) => 0.219 * wristPitchL(t),
    },
    J_Bip_R_Hand: {
      rx: (t) => 0.964 * wristPitchR(t),
      ry: (t) => 0.148 * wristPitchR(t),
      rz: (t) => -0.219 * wristPitchR(t),
    },

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
  return sampleClip(bases, buildWalkMotions(secondary), 'florie_anime_walk', WALK_DURATION);
}
