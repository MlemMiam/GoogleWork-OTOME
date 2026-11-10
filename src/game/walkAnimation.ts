import * as THREE from 'three';
import {
  collectPose,
  applyRelaxedPose,
  localRotate,
  sampleClip,
  TAU,
  Motion,
} from './idleAnimation';

export const WALK_DURATION = 1.0;

// Local bone pitch axes calculated directly from the VRoid skeleton in restored relaxed pose.
// Keeping the longitudinal component y = 0 makes the arm swing perpendicular to the bone,
// avoiding axial mesh twisting.
const PITCH_UPPER_L = new THREE.Vector3(-0.12884, 0, 0.99166).normalize();
const PITCH_UPPER_R = new THREE.Vector3(-0.13200, 0, -0.99125).normalize();

/**
 * Procedural anime walk cycle for Florie, with a gentle contralateral arm swing,
 * slightly-outward arm pose, and skirt motion that helps keep the fabric clear
 * of the thighs.
 */
function buildWalkMotions(secondary: THREE.Bone[]): Record<string, Motion> {
  const phi = (t: number) => (TAU * t) / WALK_DURATION;

  // Smooth knee flex, peaking during swing and cushioning the foot plant.
  const kneeCurve = (phaseOffset: number) => (t: number) => {
    const p = phi(t) + phaseOffset;
    const curve = 0.5 + 0.5 * Math.sin(p - 1.0);
    return 0.06 + 0.40 * Math.pow(Math.max(0, curve), 2);
  };

  // Ankle roll: plantarflexion at toe push-off, gentle dorsiflexion at heel contact.
  const footCurve = (phaseOffset: number) => (t: number) => {
    const p = phi(t) + phaseOffset;
    return 0.15 * Math.sin(p - 1.6) - 0.04 * Math.sin(2 * (p - 1.6));
  };

  const armAmp = 0.20;
  const armSwingL = (t: number) => -armAmp * Math.sin(phi(t) - 0.10);
  const armSwingR = (t: number) => armAmp * Math.sin(phi(t) - 0.10);

  // A small, constant local roll holds both upper arms a little away from the torso.
  // The opposite signs mirror the character's left and right sides.
  const armSpread = 0.10;
  const armRotation = (axis: THREE.Vector3, swing: (t: number) => number, spread: number) =>
    (t: number) =>
      new THREE.Quaternion()
        .setFromAxisAngle(new THREE.Vector3(0, 0, 1), spread)
        .multiply(new THREE.Quaternion().setFromAxisAngle(axis, swing(t)));

  const shoulderRollL = (t: number) => -0.05 * Math.sin(phi(t) - 0.05);
  const shoulderRollR = (t: number) => 0.05 * Math.sin(phi(t) - 0.05);
  const wristTrailL = (t: number) => -0.06 * Math.sin(phi(t) - 0.60);
  const wristTrailR = (t: number) => 0.06 * Math.sin(phi(t) - 0.60);

  const motions: Record<string, Motion> = {
    J_Bip_C_Hips: {
      py: (t) => -0.004 * (1 - Math.cos(2 * phi(t))),
      px: (t) => 0.008 * Math.sin(phi(t)),
      rz: (t) => 0.030 * Math.sin(phi(t)),
      ry: (t) => -0.034 * Math.sin(phi(t)),
      rx: (t) => 0.018 + 0.004 * Math.cos(2 * phi(t)),
    },
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
    J_Bip_C_Neck: {
      rx: (t) => 0.008 * Math.cos(2 * phi(t)),
      ry: (t) => -0.008 * Math.sin(phi(t)),
    },
    J_Bip_C_Head: {
      rx: (t) => 0.010 * Math.cos(phi(t) + 0.3),
      ry: (t) => -0.006 * Math.sin(phi(t)),
      rz: (t) => 0.007 * Math.sin(phi(t) + 0.35),
    },
    J_Bip_L_Shoulder: {
      rx: (t) => 0.004 * Math.cos(2 * phi(t)),
      quat: (t) => new THREE.Quaternion().setFromAxisAngle(PITCH_UPPER_L, shoulderRollL(t)),
    },
    J_Bip_R_Shoulder: {
      rx: (t) => 0.004 * Math.cos(2 * phi(t)),
      quat: (t) => new THREE.Quaternion().setFromAxisAngle(PITCH_UPPER_R, shoulderRollR(t)),
    },
    J_Bip_L_UpperArm: {
      quat: armRotation(PITCH_UPPER_L, armSwingL, armSpread),
    },
    J_Bip_R_UpperArm: {
      quat: armRotation(PITCH_UPPER_R, armSwingR, -armSpread),
    },
    // Forearms stay in their relaxed pose to avoid an unwanted bend in the silhouette.
    J_Bip_L_LowerArm: {},
    J_Bip_R_LowerArm: {},
    J_Bip_L_Hand: {
      quat: (t) => new THREE.Quaternion().setFromAxisAngle(PITCH_UPPER_L, wristTrailL(t)),
    },
    J_Bip_R_Hand: {
      quat: (t) => new THREE.Quaternion().setFromAxisAngle(PITCH_UPPER_R, wristTrailR(t)),
    },
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
    J_Bip_L_LowerLeg: { rx: kneeCurve(0) },
    J_Bip_R_LowerLeg: { rx: kneeCurve(Math.PI) },
    J_Bip_L_Foot: {
      rx: footCurve(0),
      rz: (t) => -0.018 * Math.sin(phi(t)),
    },
    J_Bip_R_Foot: {
      rx: footCurve(Math.PI),
      rz: (t) => 0.018 * Math.sin(phi(t)),
    },
  };

  addWalkFingerMotions(motions);
  addWalkSecondaryMotions(motions, secondary);
  return motions;
}

function addWalkFingerMotions(motions: Record<string, Motion>) {
  // Fingers and thumbs stay in the curled relaxed pose throughout the walk.
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

function addWalkSecondaryMotions(motions: Record<string, Motion>, secondary: THREE.Bone[]) {
  const phi = (t: number) => (TAU * t) / WALK_DURATION;

  secondary.forEach((bone, index) => {
    const isHair = /Hair/.test(bone.name);
    const isSkirt = /Skirt/.test(bone.name);
    const isLeftSkirt = /L_Skirt/.test(bone.name);
    const isRightSkirt = /R_Skirt/.test(bone.name);
    const isSleeve = /Sleeve/.test(bone.name);
    const stagger = (index % 5) * 0.08;

    if (isHair) {
      motions[bone.name] = {
        rx: (t) => 0.048 * Math.cos(2 * phi(t) - 0.45 - stagger),
        rz: (t) => 0.034 * Math.sin(phi(t) - 0.40 - stagger),
      };
    } else if (isSkirt) {
      // A subtle mirrored outward flare adds clearance between the skirt and thighs;
      // the smaller cyclic sway keeps the fabric moving naturally during the stride.
      if (isLeftSkirt) {
        motions[bone.name] = {
          rx: (t) => 0.085 * Math.sin(phi(t) - stagger) + 0.040 * Math.cos(2 * phi(t)),
          rz: (t) => 0.075 + 0.035 * Math.sin(phi(t) - stagger),
        };
      } else if (isBack) {
        motions[bone.name] = {
          rx: (t) => -0.085 * Math.sin(phi(t) - stagger) + 0.040 * Math.cos(2 * phi(t)),
          rz: (t) => -0.075 - 0.035 * Math.sin(phi(t) - stagger),
        };
      } else {
        // SkirtSide follows pelvic weight shift, flared outward from hips
        motions[bone.name] = {
          rx: (t) => 0.025 * Math.cos(2 * phi(t) - stagger),
          rz: (t) => (isLeftSkirt ? -0.025 : 0.025) * Math.sin(phi(t) - stagger),
        };
      }
    } else if (isSleeve) {
      // Sleeves stay in their relaxed pose during the walk.
      motions[bone.name] = {};
    }
  });
}

/** Creates the procedural anime walk animation clip for Florie. */
export function createWalkAnimationClip(root: THREE.Object3D): THREE.AnimationClip {
  const { bases, secondary } = collectPose(root);
  applyRelaxedPose(bases);
  // Spread arms slightly away from the body during the walk animation (+0.07 rad outward spread)
  localRotate(bases, 'J_Bip_L_UpperArm', 0.07, 0, 0);
  localRotate(bases, 'J_Bip_R_UpperArm', 0.07, 0, 0);
  return sampleClip(bases, buildWalkMotions(secondary), 'florie_anime_walk', WALK_DURATION);
}
