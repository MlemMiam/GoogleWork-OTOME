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

// Local bone pitch axes calculated directly from the VRoid skeleton in restored relaxed pose.
// By keeping the bone longitudinal component y = 0, these axes are strictly perpendicular
// to the bone vectors, eliminating axial mesh twisting while keeping the arm swing pure
// and allowing the elbow joint to articulate naturally and flexibly.
const PITCH_UPPER_L = new THREE.Vector3(-0.12884, 0, 0.99166).normalize();
const PITCH_UPPER_R = new THREE.Vector3(-0.13200, 0, -0.99125).normalize();

const PITCH_LOWER_L = new THREE.Vector3(-0.10899, 0, 0.99404).normalize();
const PITCH_LOWER_R = new THREE.Vector3(-0.11215, 0, -0.99369).normalize();

const PITCH_HAND_L = new THREE.Vector3(-0.10899, 0, 0.99404).normalize();
const PITCH_HAND_R = new THREE.Vector3(-0.11215, 0, -0.99369).normalize();

const PITCH_SLEEVE_LOWER_L = new THREE.Vector3(0.82815, 0, 0.56051).normalize();
const PITCH_SLEEVE_TIP_L = new THREE.Vector3(-0.01420, 0, 0.99990).normalize();
const PITCH_SLEEVE_LOWER_R = new THREE.Vector3(0.82916, 0, -0.55900).normalize();
const PITCH_SLEEVE_TIP_R = new THREE.Vector3(-0.01239, 0, -0.99992).normalize();

/**
 * Procedural anime walk cycle for Florie:
 * - Expressive, fluid anime gait with generous suppleness across all joints
 * - Active elbow joint rotation on top of the initial relaxed bend
 * - Zero-twist bone axes preventing any mesh distortion or twisting sensation
 * - Natural contralateral coordination (opposite arm & leg)
 * - Dynamic double-pendulum arm mechanics (shoulder roll -> upper arm sweep -> elbow hinge lag -> wrist whip)
 * - Living finger trailing curl that breathes with the hand follow-through
 * - Graceful hip sway, pelvic roll, and vertical inverted pendulum bounce
 * - Upright torso with delicate counter-rotation for poise
 * - Trailing secondary motion for hair, skirt, and wide bell sleeves
 */
function buildWalkMotions(secondary: THREE.Bone[]): Record<string, Motion> {
  const phi = (t: number) => (TAU * t) / WALK_DURATION;

  // Asymmetric smooth knee flex curve:
  // Peaks during the swing/recovery phase (mid-swing ~ 0.44 rad) and cushions down to soft plant (~ 0.06 rad)
  const kneeCurve = (phaseOffset: number) => (t: number) => {
    const p = phi(t) + phaseOffset;
    const h1 = Math.sin(p - 0.7);
    const h2 = Math.sin(2 * (p - 0.7));
    const curve = 0.5 + 0.5 * (0.75 * h1 - 0.25 * h2);
    return 0.06 + 0.44 * Math.pow(curve, 2);
  };

  // Ankle roll curve: plantarflexion at toe push-off, gentle dorsiflexion at heel contact
  const footCurve = (phaseOffset: number) => (t: number) => {
    const p = phi(t) + phaseOffset;
    return 0.16 * Math.sin(p - 1.6) - 0.06 * Math.sin(2 * (p - 1.6));
  };

  // Arm swing pitch: generous front-to-back swing, contralateral to leg stride (opposite arm & leg)
  // Left arm swings forward (negative phi phase) when right leg steps forward
  const armPitchL = (t: number) => -0.44 * Math.sin(phi(t) - 0.08);
  const armPitchR = (t: number) => 0.44 * Math.sin(phi(t) - 0.08);

  // Active elbow joint rotation on top of the initial relaxed bend:
  // Reversed and slightly amplified for a softer, more natural arm swing
  // (up to ~+0.51 rad extra bend, down to ~-0.19 rad)
  const elbowPitchL = (t: number) => 0.16 + 0.35 * Math.sin(phi(t) - 0.38);
  const elbowPitchR = (t: number) => 0.16 - 0.35 * Math.sin(phi(t) - 0.38);

  // Wrist trailing wave: fluid whip-like trailing wave following the forearm
  const wristPitchL = (t: number) => -0.16 * Math.sin(phi(t) - 0.68);
  const wristPitchR = (t: number) => 0.16 * Math.sin(phi(t) - 0.68);

  const motions: Record<string, Motion> = {
    // --- Pelvis / Hips ---
    J_Bip_C_Hips: {
      // Inverted pendulum vertical bounce (dips on step plant, rises at mid-stride)
      py: (t) => -0.012 * (1 - Math.cos(2 * phi(t))),
      // Graceful lateral weight shift
      px: (t) => 0.012 * Math.sin(phi(t)),
      // Feminine hip sway / pelvic roll
      rz: (t) => 0.038 * Math.sin(phi(t)),
      // Pelvic yaw following the advancing leg
      ry: (t) => -0.045 * Math.sin(phi(t)),
      // Upright posture with gentle cyclic breathing
      rx: (t) => 0.024 + 0.008 * Math.cos(2 * phi(t)),
    },

    // --- Torso (smooth poise, keeping shoulders level and stable) ---
    J_Bip_C_Spine: {
      rx: (t) => -0.015 - 0.006 * Math.cos(2 * phi(t)),
      ry: (t) => 0.022 * Math.sin(phi(t)),
      rz: (t) => -0.012 * Math.sin(phi(t)),
    },
    J_Bip_C_Chest: {
      rx: (t) => -0.012 - 0.004 * Math.cos(2 * phi(t)),
      ry: (t) => 0.018 * Math.sin(phi(t)),
      rz: (t) => -0.008 * Math.sin(phi(t)),
    },
    J_Bip_C_UpperChest: {
      rx: () => -0.005,
      ry: (t) => 0.008 * Math.sin(phi(t)),
    },

    // --- Neck & Head (serene, forward gaze with cute delicate rhythmic nod) ---
    J_Bip_C_Neck: {
      rx: (t) => 0.010 * Math.cos(2 * phi(t)),
      ry: (t) => -0.010 * Math.sin(phi(t)),
    },
    J_Bip_C_Head: {
      rx: (t) => 0.014 * Math.cos(2 * phi(t) + 0.3),
      ry: (t) => -0.008 * Math.sin(phi(t)),
      rz: (t) => 0.010 * Math.sin(phi(t) + 0.35),
    },

    // --- Shoulders (fluid clavicle roll connected to arm swing, zero lateral wobble) ---
    J_Bip_L_Shoulder: {
      rx: (t) => 0.008 * Math.cos(2 * phi(t)),
      quat: (t) => new THREE.Quaternion().setFromAxisAngle(PITCH_UPPER_L, -0.05 * Math.sin(phi(t) - 0.08)),
    },
    J_Bip_R_Shoulder: {
      rx: (t) => 0.008 * Math.cos(2 * phi(t)),
      quat: (t) => new THREE.Quaternion().setFromAxisAngle(PITCH_UPPER_R, 0.05 * Math.sin(phi(t) - 0.08)),
    },

    // --- Arms (pure front-and-back sagittal swing, zero left-to-right drift, zero twist) ---
    J_Bip_L_UpperArm: {
      quat: (t) => new THREE.Quaternion().setFromAxisAngle(PITCH_UPPER_L, armPitchL(t)),
    },
    J_Bip_R_UpperArm: {
      quat: (t) => new THREE.Quaternion().setFromAxisAngle(PITCH_UPPER_R, armPitchR(t)),
    },

    // --- Elbows / Forearms (active elbow flexion on top of initial pose, zero twist) ---
    J_Bip_L_LowerArm: {
      quat: (t) => new THREE.Quaternion().setFromAxisAngle(PITCH_LOWER_L, elbowPitchL(t)),
    },
    J_Bip_R_LowerArm: {
      quat: (t) => new THREE.Quaternion().setFromAxisAngle(PITCH_LOWER_R, elbowPitchR(t)),
    },

    // --- Wrists / Hands (pure sagittal trailing wave, zero twist) ---
    J_Bip_L_Hand: {
      quat: (t) => new THREE.Quaternion().setFromAxisAngle(PITCH_HAND_L, wristPitchL(t)),
    },
    J_Bip_R_Hand: {
      quat: (t) => new THREE.Quaternion().setFromAxisAngle(PITCH_HAND_R, wristPitchR(t)),
    },

    // --- Legs (Thighs, Knees, Feet) ---
    J_Bip_L_UpperLeg: {
      rx: (t) => 0.26 * Math.sin(phi(t)) + 0.040 * Math.sin(2 * phi(t) - 1.57),
      ry: () => -0.010,
      rz: () => 0.016,
    },
    J_Bip_R_UpperLeg: {
      rx: (t) => -0.26 * Math.sin(phi(t)) - 0.040 * Math.sin(2 * phi(t) - 1.57),
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
      rz: (t) => -0.026 * Math.sin(phi(t)),
    },
    J_Bip_R_Foot: {
      rx: footCurve(Math.PI),
      rz: (t) => -0.026 * Math.sin(phi(t)),
    },
  };

  // Add living finger follow-through wave so fingers remain supple throughout
  addWalkFingerMotions(motions);

  // Add secondary follow-through for hair, skirt, and sleeves
  addWalkSecondaryMotions(motions, secondary);

  return motions;
}

function addWalkFingerMotions(motions: Record<string, Motion>) {
  const phi = (t: number) => (TAU * t) / WALK_DURATION;
  const curlFn = (t: number, seg: number) => -0.05 * seg * (0.5 + 0.5 * Math.sin(phi(t) - 0.85));

  for (const side of ['L', 'R']) {
    for (const finger of ['Index', 'Middle', 'Ring', 'Little']) {
      for (const segment of [1, 2, 3]) {
        motions[`J_Bip_${side}_${finger}${segment}`] = {
          rx: (t) => curlFn(t, segment),
        };
      }
    }
    // Thumbs maintain neutral relaxed curvature
    motions[`J_Bip_${side}_Thumb1`] = {};
    motions[`J_Bip_${side}_Thumb2`] = {};
  }
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
        rx: (t) => 0.048 * Math.cos(2 * phi(t) - 0.45 - stagger),
        rz: (t) => 0.034 * Math.sin(phi(t) - 0.40 - stagger),
      };
    } else if (isSkirt) {
      // Skirt responds to leg stride and pelvic bounce
      if (isLeftSkirt) {
        motions[bone.name] = {
          rx: (t) => 0.085 * Math.sin(phi(t) - stagger) + 0.040 * Math.cos(2 * phi(t)),
          rz: (t) => 0.050 * Math.sin(phi(t) - stagger),
        };
      } else if (isRightSkirt) {
        motions[bone.name] = {
          rx: (t) => -0.085 * Math.sin(phi(t) - stagger) + 0.040 * Math.cos(2 * phi(t)),
          rz: (t) => -0.050 * Math.sin(phi(t) - stagger),
        };
      } else {
        motions[bone.name] = {
          rx: (t) => 0.040 * Math.cos(2 * phi(t) - stagger),
          rz: (t) => 0.030 * Math.sin(phi(t) - stagger),
        };
      }
    } else if (isSleeve) {
      // Sleeves trail the dynamic front-and-back arm swing along their exact pitch axes
      const isLeft = isLeftSleeve;
      const isLower = /LowerSleeve/.test(bone.name);
      const axis = isLeft
        ? (isLower ? PITCH_SLEEVE_LOWER_L : PITCH_SLEEVE_TIP_L)
        : (isLower ? PITCH_SLEEVE_LOWER_R : PITCH_SLEEVE_TIP_R);
      const sign = isLeft ? 1 : -1;
      const angleFn = (t: number) => sign * 0.16 * Math.sin(phi(t) - 0.50 - stagger);
      motions[bone.name] = {
        quat: (t: number) => new THREE.Quaternion().setFromAxisAngle(axis, angleFn(t)),
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
