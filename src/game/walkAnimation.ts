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
    const h1 = Math.sin(p - 1.0);
    const curve = 0.5 + 0.5 * h1;
    return 0.06 + 0.40 * Math.pow(Math.max(0, curve), 2);
  };

  // Ankle roll curve: plantarflexion at toe push-off, gentle dorsiflexion at heel contact
  const footCurve = (phaseOffset: number) => (t: number) => {
    const p = phi(t) + phaseOffset;
    return 0.15 * Math.sin(p - 1.6) - 0.04 * Math.sin(2 * (p - 1.6));
  };

  // Gentle arm swing: subtle contralateral pendulum, single frequency, no
  // wobble. Amplitudes kept small so the arms just sway with the gait
  // without forming an undesirable curve.
  const armAmp = 0.20;
  // Single, clean contralateral swing (no lagged component -> no curve).
  const armSwingL = (t: number) => -armAmp * Math.sin(phi(t) - 0.10);
  const armSwingR = (t: number) => armAmp * Math.sin(phi(t) - 0.10);

  // Shoulder roll follows the arm swing, very softly.
  const shoulderRollL = (t: number) => -0.05 * Math.sin(phi(t) - 0.05);
  const shoulderRollR = (t: number) => 0.05 * Math.sin(phi(t) - 0.05);

  // Wrist trails the forearm lightly.
  const wristTrailL = (t: number) => -0.06 * Math.sin(phi(t) - 0.60);
  const wristTrailR = (t: number) => 0.06 * Math.sin(phi(t) - 0.60);


  const motions: Record<string, Motion> = {
    // --- Pelvis / Hips ---
    J_Bip_C_Hips: {
      // Inverted pendulum vertical bounce (dips on step plant, rises at mid-stride)
      py: (t) => -0.004 * (1 - Math.cos(2 * phi(t))),
      // Graceful lateral weight shift
      px: (t) => 0.008 * Math.sin(phi(t)),
      // Feminine hip sway / pelvic roll
      rz: (t) => 0.030 * Math.sin(phi(t)),
      // Pelvic yaw following the advancing leg
      ry: (t) => -0.034 * Math.sin(phi(t)),
      // Upright posture with gentle cyclic breathing
      rx: (t) => 0.018 + 0.004 * Math.cos(2 * phi(t)),
    },

    // --- Torso (smooth poise, keeping shoulders level and stable) ---
    J_Bip_C_Spine: {
      rx: (t) => -0.012 - 0.005 * Math.cos(2 * phi(t)),
      ry: (t) => 0.018 * Math.sin(phi(t)),
      rz: (t) => -0.010 * Math.sin(phi(t)),
    },
    J_Bip_C_Chest: {
      rx: (t) => -0.010 - 0.003 * Math.cos(2 * phi(t)),
      ry: (t) => 0.015 * Math.sin(phi(t)),
      rz: (t) => -0.006 * Math.sin(phi(t)),
    },
    J_Bip_C_UpperChest: {
      rx: () => -0.004,
      ry: (t) => 0.006 * Math.sin(phi(t)),
    },

    // --- Neck & Head (serene, forward gaze with cute delicate rhythmic nod) ---
    J_Bip_C_Neck: {
      rx: (t) => 0.008 * Math.cos(2 * phi(t)),
      ry: (t) => -0.008 * Math.sin(phi(t)),
    },
    J_Bip_C_Head: {
      rx: (t) => 0.010 * Math.cos(phi(t) + 0.3),
      ry: (t) => -0.006 * Math.sin(phi(t)),
      rz: (t) => 0.007 * Math.sin(phi(t) + 0.35),
    },

    // --- Shoulders (gentle clavicle roll following the arm swing) ---
    J_Bip_L_Shoulder: {
      rx: (t) => 0.004 * Math.cos(2 * phi(t)),
      quat: (t) => new THREE.Quaternion().setFromAxisAngle(PITCH_UPPER_L, shoulderRollL(t)),
    },
    J_Bip_R_Shoulder: {
      rx: (t) => 0.004 * Math.cos(2 * phi(t)),
      quat: (t) => new THREE.Quaternion().setFromAxisAngle(PITCH_UPPER_R, shoulderRollR(t)),
    },

    // --- Arms (gentle contralateral swing) ---
    J_Bip_L_UpperArm: {
      quat: (t) => new THREE.Quaternion().setFromAxisAngle(PITCH_UPPER_L, armSwingL(t)),
    },
    J_Bip_R_UpperArm: {
      quat: (t) => new THREE.Quaternion().setFromAxisAngle(PITCH_UPPER_R, armSwingR(t)),
    },

    // --- Elbows / Forearms (held in relaxed pose; flex removed to avoid curve) ---
    J_Bip_L_LowerArm: {},
    J_Bip_R_LowerArm: {},

    // --- Wrists / Hands (light trailing) ---
    J_Bip_L_Hand: {
      quat: (t) => new THREE.Quaternion().setFromAxisAngle(PITCH_HAND_L, wristTrailL(t)),
    },
    J_Bip_R_Hand: {
      quat: (t) => new THREE.Quaternion().setFromAxisAngle(PITCH_HAND_R, wristTrailR(t)),
    },

    // --- Legs (Thighs, Knees, Feet) ---
    J_Bip_L_UpperLeg: {
      rx: (t) => 0.30 * Math.sin(phi(t)) + 0.06 * Math.sin(phi(t) - 0.45),
      ry: () => -0.010,
      rz: () => 0.014,
    },
    J_Bip_R_UpperLeg: {
      rx: (t) => -0.30 * Math.sin(phi(t)) - 0.06 * Math.sin(phi(t) - 0.45),
      ry: () => 0.010,
      rz: () => -0.014,
    },
    J_Bip_L_LowerLeg: {
      rx: kneeCurve(0),
    },
    J_Bip_R_LowerLeg: {
      rx: kneeCurve(Math.PI),
    },
    J_Bip_L_Foot: {
      rx: footCurve(0),
      rz: (t) => -0.018 * Math.sin(phi(t)),
    },
    J_Bip_R_Foot: {
      rx: footCurve(Math.PI),
      rz: (t) => 0.018 * Math.sin(phi(t)),
    },
  };

  // Add living finger follow-through wave so fingers remain supple throughout
  addWalkFingerMotions(motions);

  // Add secondary follow-through for hair, skirt, and sleeves
  addWalkSecondaryMotions(motions, secondary);

  return motions;
}

function addWalkFingerMotions(motions: Record<string, Motion>) {
  // Fingers and thumbs are held in the curled rest pose (defined in
  // applyRelaxedPose); no extra motion so they don't double-curl.
  for (const side of ['L', 'R']) {
    for (const finger of ['Index', 'Middle', 'Ring', 'Little']) {
      for (const segment of [1, 2, 3]) {
        motions[`J_Bip_${side}_${finger}${segment}`] = {};
      }
    }
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
      // Sleeves are held in their relaxed pose during the walk (no arm swing).
      motions[bone.name] = {};
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
