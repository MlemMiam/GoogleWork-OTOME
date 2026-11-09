import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const IDLE_DURATION = 6;
export const SHY_DURATION = 5;
export const SAMPLE_FPS = 30;

export type BoneBase = {
  bone: THREE.Bone;
  quaternion: THREE.Quaternion;
  position: THREE.Vector3;
};

export type Motion = {
  /** Rotation offsets in radians, applied in the bone's local space. */
  rx?: (t: number) => number;
  ry?: (t: number) => number;
  rz?: (t: number) => number;
  /** Position offset in meters, applied in the bone's local space. */
  px?: (t: number) => number;
  py?: (t: number) => number;
  pz?: (t: number) => number;
};

export type PoseSet = Record<string, BoneBase>;

const CORE_BONES = [
  'J_Bip_C_Hips',
  'J_Bip_C_Spine',
  'J_Bip_C_Chest',
  'J_Bip_C_UpperChest',
  'J_Bip_C_Neck',
  'J_Bip_C_Head',
  'J_Bip_L_Shoulder',
  'J_Bip_R_Shoulder',
  'J_Bip_L_UpperArm',
  'J_Bip_R_UpperArm',
  'J_Bip_L_LowerArm',
  'J_Bip_R_LowerArm',
  'J_Bip_L_Hand',
  'J_Bip_R_Hand',
  'J_Bip_L_Thumb1',
  'J_Bip_L_Thumb2',
  'J_Bip_R_Thumb1',
  'J_Bip_R_Thumb2',
  'J_Bip_L_Index1',
  'J_Bip_L_Index2',
  'J_Bip_L_Index3',
  'J_Bip_L_Middle1',
  'J_Bip_L_Middle2',
  'J_Bip_L_Middle3',
  'J_Bip_L_Ring1',
  'J_Bip_L_Ring2',
  'J_Bip_L_Ring3',
  'J_Bip_L_Little1',
  'J_Bip_L_Little2',
  'J_Bip_L_Little3',
  'J_Bip_R_Index1',
  'J_Bip_R_Index2',
  'J_Bip_R_Index3',
  'J_Bip_R_Middle1',
  'J_Bip_R_Middle2',
  'J_Bip_R_Middle3',
  'J_Bip_R_Ring1',
  'J_Bip_R_Ring2',
  'J_Bip_R_Ring3',
  'J_Bip_R_Little1',
  'J_Bip_R_Little2',
  'J_Bip_R_Little3',
  'J_Bip_L_UpperLeg',
  'J_Bip_R_UpperLeg',
  'J_Bip_L_LowerLeg',
  'J_Bip_R_LowerLeg',
  'J_Bip_L_Foot',
  'J_Bip_R_Foot',
];

const SECONDARY_PATTERN =
  /J_Sec_(Hair|L_Skirt|R_Skirt|L_LowerSleeve|L_TipSleeve|R_LowerSleeve|R_TipSleeve)/;

/**
 * Collects the animated bones with their neutral transforms. The model rest
 * pose is used as a base, so every generated clip starts from the same
 * skeleton state and can be blended safely.
 */
export function collectPose(root: THREE.Object3D): { bases: PoseSet; secondary: THREE.Bone[] } {
  const bones: Record<string, THREE.Bone> = {};
  root.traverse((object) => {
    if ((object as THREE.Bone).isBone && !object.name.toLowerCase().includes('collider')) {
      bones[object.name] = object as THREE.Bone;
    }
  });

  const bases: PoseSet = {};
  const capture = (bone: THREE.Bone) => {
    bases[bone.name] = {
      bone,
      quaternion: bone.quaternion.clone(),
      position: bone.position.clone(),
    };
  };

  CORE_BONES.forEach((name) => {
    if (bones[name]) capture(bones[name]);
  });

  // Secondary bones (hair, skirt, sleeves) add the soft anime follow-through.
  const secondary = Object.values(bones).filter(
    (bone) => !bone.name.includes('_end_') && SECONDARY_PATTERN.test(bone.name)
  );
  secondary.forEach(capture);

  return { bases, secondary };
}

const localRotate = (bases: PoseSet, name: string, x: number, y: number, z: number) => {
  const base = bases[name];
  if (!base) return;
  base.quaternion.multiply(
    new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'))
  );
};

const localSwing = (bases: PoseSet, name: string, angle: number) => {
  const base = bases[name];
  if (!base) return;
  base.quaternion.multiply(
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle)
  );
};

/** Relaxed A-pose: arms down, slightly outward and forward. */
export function applyRelaxedPose(bases: PoseSet) {
  localRotate(bases, 'J_Bip_L_UpperArm', -1.20, 0.15, 0.20);
  localRotate(bases, 'J_Bip_R_UpperArm', -1.20, -0.15, -0.20);
  localRotate(bases, 'J_Bip_L_LowerArm', -0.10, 0, 0.10);
  localRotate(bases, 'J_Bip_R_LowerArm', -0.10, 0, -0.10);
  localRotate(bases, 'J_Bip_L_Hand', 0, 0, 0.04);
  localRotate(bases, 'J_Bip_R_Hand', 0, 0, -0.04);
  // Final local swing pulls the hands forward, next to the skirt.
  localSwing(bases, 'J_Bip_L_UpperArm', -0.30);
  localSwing(bases, 'J_Bip_R_UpperArm', 0.30);
}

/**
 * Timid pose: shoulders slightly rounded, head dipped and tilted, hands
 * clasped in front of the waist, knees close together.
 */
function applyShyPose(bases: PoseSet) {
  localRotate(bases, 'J_Bip_C_Spine', 0.08, 0, 0);
  localRotate(bases, 'J_Bip_C_Chest', 0.06, 0, 0);
  localRotate(bases, 'J_Bip_C_Neck', 0.05, 0, 0.02);
  localRotate(bases, 'J_Bip_C_Head', 0.10, 0.06, 0.12);

  // Rounded shoulders, pulled a touch forward.
  localRotate(bases, 'J_Bip_L_Shoulder', 0.03, 0, -0.05);
  localRotate(bases, 'J_Bip_R_Shoulder', -0.03, 0, 0.05);

  // Elbows stay slightly outside the torso while the forearms angle inward,
  // bringing both hands together in front of the belly.
  localRotate(bases, 'J_Bip_L_UpperArm', -0.10, 0, -0.40);
  localRotate(bases, 'J_Bip_R_UpperArm', -0.10, 0, 0.42);
  // The right forearm reaches a little further, so the right hand rests in
  // front of the left one with a small gap between them.
  localRotate(bases, 'J_Bip_L_LowerArm', -0.55, 0, -0.25);
  localRotate(bases, 'J_Bip_R_LowerArm', -0.61, 0, 0.27);
  // Part of the palm twist happens in the forearm, so the sleeve cuffs turn
  // with the hands instead of being cut through by the wrist heels.
  localRotate(bases, 'J_Bip_L_LowerArm', 0, 0.50, 0);
  localRotate(bases, 'J_Bip_R_LowerArm', 0, -0.50, 0);

  // Wrists turn the palms toward the belly and angle both hands diagonally,
  // so they leave the sleeve cuffs cleanly instead of bending across them.
  localRotate(bases, 'J_Bip_L_Hand', 0.50, 0.84, -0.35);
  localRotate(bases, 'J_Bip_R_Hand', 0.53, -0.88, 0.35);

  // Thumbs curl loosely toward the fingers.
  localRotate(bases, 'J_Bip_L_Thumb1', 0, 0, 0.45);
  localRotate(bases, 'J_Bip_L_Thumb2', 0, 0, 0.15);
  localRotate(bases, 'J_Bip_R_Thumb1', 0, 0, -0.45);
  localRotate(bases, 'J_Bip_R_Thumb2', 0, 0, -0.15);

  // A soft finger curl keeps the clasped hands from looking like flat paddles.
  const curl: Array<[number, number]> = [
    [1, -0.10],
    [2, -0.16],
    [3, -0.10],
  ];
  for (const finger of ['Index', 'Middle', 'Ring', 'Little']) {
    for (const [segment, angle] of curl) {
      localRotate(bases, `J_Bip_L_${finger}${segment}`, angle, 0, 0);
      localRotate(bases, `J_Bip_R_${finger}${segment}`, angle, 0, 0);
    }
  }

  // Knees and feet turned slightly inward.
  localRotate(bases, 'J_Bip_L_UpperLeg', 0, 0.02, -0.03);
  localRotate(bases, 'J_Bip_R_UpperLeg', 0, -0.02, 0.03);
  localRotate(bases, 'J_Bip_L_Foot', 0, 0.03, 0);
  localRotate(bases, 'J_Bip_R_Foot', 0, -0.03, 0);
}

export function sampleClip(
  bases: PoseSet,
  motions: Record<string, Motion>,
  name: string,
  duration: number
): THREE.AnimationClip {
  const frameCount = Math.round(duration * SAMPLE_FPS);
  const times = new Float32Array(frameCount + 1);
  for (let frame = 0; frame <= frameCount; frame++) {
    times[frame] = (frame / frameCount) * duration;
  }

  const tracks: THREE.KeyframeTrack[] = [];
  const euler = new THREE.Euler(0, 0, 0, 'XYZ');
  const offsetQuaternion = new THREE.Quaternion();

  for (const [boneName, base] of Object.entries(bases)) {
    const motion = motions[boneName];
    if (!motion) continue;

    const quaternionValues = new Float32Array((frameCount + 1) * 4);
    const positionValues =
      motion.px || motion.py || motion.pz ? new Float32Array((frameCount + 1) * 3) : null;

    for (let frame = 0; frame <= frameCount; frame++) {
      const t = times[frame];
      const rx = motion.rx ? motion.rx(t) : 0;
      const ry = motion.ry ? motion.ry(t) : 0;
      const rz = motion.rz ? motion.rz(t) : 0;

      // Compose the breathing/sway offset in the bone's local space.
      euler.set(rx, ry, rz, 'XYZ');
      offsetQuaternion.setFromEuler(euler);
      const q = base.quaternion.clone().multiply(offsetQuaternion);
      q.toArray(quaternionValues, frame * 4);

      if (positionValues) {
        positionValues[frame * 3] = base.position.x + (motion.px ? motion.px(t) : 0);
        positionValues[frame * 3 + 1] = base.position.y + (motion.py ? motion.py(t) : 0);
        positionValues[frame * 3 + 2] = base.position.z + (motion.pz ? motion.pz(t) : 0);
      }
    }

    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        `${base.bone.name}.quaternion`,
        Array.from(times),
        Array.from(quaternionValues)
      )
    );

    if (positionValues) {
      tracks.push(
        new THREE.VectorKeyframeTrack(
          `${base.bone.name}.position`,
          Array.from(times),
          Array.from(positionValues)
        )
      );
    }
  }

  const clip = new THREE.AnimationClip(name, duration, tracks);
  clip.optimize();
  return clip;
}

function addSecondaryMotions(
  motions: Record<string, Motion>,
  secondary: THREE.Bone[],
  duration: number,
  scale = 1
) {
  secondary.forEach((bone, index) => {
    const phase = index * 0.37;
    const isHair = /Hair/.test(bone.name);
    const isSleeve = /Sleeve/.test(bone.name);
    const amplitude = (isHair ? 0.018 : isSleeve ? 0.010 : 0.020) * scale;

    motions[bone.name] = {
      rx: (t) => amplitude * Math.sin((TAU * t) / duration + phase),
      rz: (t) => amplitude * 0.8 * Math.sin((TAU * t) / duration + phase + 0.65),
    };
  });
}

/**
 * Fingers and thumbs keep the same rotation all along, but they still need a
 * track in both clips: without one, the mixer leaves them stuck in the shy
 * pose after the blend back to the gentle idle.
 */
export function addHandMotions(motions: Record<string, Motion>) {
  const names = [
    'J_Bip_L_Thumb1',
    'J_Bip_L_Thumb2',
    'J_Bip_R_Thumb1',
    'J_Bip_R_Thumb2',
  ];
  for (const side of ['L', 'R']) {
    for (const finger of ['Index', 'Middle', 'Ring', 'Little']) {
      for (const segment of [1, 2, 3]) {
        names.push(`J_Bip_${side}_${finger}${segment}`);
      }
    }
  }
  for (const name of names) motions[name] = {};
}

function buildIdleMotions(secondary: THREE.Bone[]): Record<string, Motion> {
  const breath = (t: number) => Math.sin((TAU * t) / 3);
  const sway = (t: number) => Math.sin((TAU * t) / IDLE_DURATION);
  const swayHarmonic = (t: number, phase = 0) =>
    0.7 * Math.sin((TAU * t) / IDLE_DURATION + phase) +
    0.3 * Math.sin((2 * TAU * t) / IDLE_DURATION + phase);

  const motions: Record<string, Motion> = {
    J_Bip_C_Hips: {
      rx: (t) => 0.008 * breath(t + 0.2),
      ry: (t) => 0.010 * swayHarmonic(t + 0.3),
      rz: (t) => 0.012 * swayHarmonic(t),
      py: (t) => 0.003 * breath(t),
    },
    J_Bip_C_Spine: {
      rx: (t) => -0.010 * breath(t),
      ry: (t) => 0.006 * sway(t + 0.4),
      rz: (t) => 0.008 * swayHarmonic(t + 0.15),
    },
    J_Bip_C_Chest: {
      rx: (t) => -0.014 * breath(t + 0.1),
      ry: (t) => 0.004 * sway(t + 0.5),
      rz: (t) => 0.005 * sway(t + 0.3),
    },
    J_Bip_C_UpperChest: {
      rx: (t) => -0.010 * breath(t + 0.2),
      rz: (t) => 0.003 * sway(t + 0.45),
    },
    J_Bip_C_Neck: {
      rx: (t) => 0.008 * Math.sin((TAU * t) / 3 + 0.4),
      rz: (t) => -0.008 * sway(t + 0.5),
    },
    J_Bip_C_Head: {
      rx: (t) => 0.014 * Math.sin((TAU * t) / 3 + 0.9),
      ry: (t) => 0.025 * swayHarmonic(t + 0.2),
      rz: (t) => -0.025 * swayHarmonic(t + 0.75),
    },
    J_Bip_L_Shoulder: {
      rx: (t) => 0.008 * breath(t + 0.3),
      rz: (t) => 0.010 * sway(t + 0.25),
    },
    J_Bip_R_Shoulder: {
      rx: (t) => 0.008 * breath(t + 0.3),
      rz: (t) => -0.010 * sway(t + 0.25),
    },
    J_Bip_L_UpperArm: {
      rx: (t) => 0.030 * sway(t + 0.9),
      ry: (t) => 0.015 * sway(t + 0.1),
      rz: (t) => 0.020 * Math.sin((TAU * t) / 3 + 0.6),
    },
    J_Bip_R_UpperArm: {
      rx: (t) => 0.030 * sway(t + 1.1),
      ry: (t) => -0.015 * sway(t + 0.1),
      rz: (t) => -0.020 * Math.sin((TAU * t) / 3 + 0.6),
    },
    J_Bip_L_LowerArm: {
      rx: (t) => 0.020 * sway(t + 1.25),
      rz: (t) => 0.015 * Math.sin((TAU * t) / 3 + 1.0),
    },
    J_Bip_R_LowerArm: {
      rx: (t) => 0.020 * sway(t + 1.4),
      rz: (t) => -0.015 * Math.sin((TAU * t) / 3 + 1.0),
    },
    J_Bip_L_Hand: {
      rx: (t) => 0.015 * sway(t + 1.6),
      rz: (t) => 0.010 * Math.sin((TAU * t) / 3 + 1.2),
    },
    J_Bip_R_Hand: {
      rx: (t) => 0.015 * sway(t + 1.75),
      rz: (t) => -0.010 * Math.sin((TAU * t) / 3 + 1.2),
    },
    J_Bip_L_UpperLeg: {
      rx: (t) => 0.006 * breath(t + 0.5),
      rz: (t) => 0.010 * sway(t + 0.2),
    },
    J_Bip_R_UpperLeg: {
      rx: (t) => 0.006 * breath(t + 0.5),
      rz: (t) => -0.010 * sway(t + 0.2),
    },
    J_Bip_L_LowerLeg: {
      rx: (t) => 0.012 * Math.sin((TAU * t) / 3 + 0.7),
    },
    J_Bip_R_LowerLeg: {
      rx: (t) => 0.012 * Math.sin((TAU * t) / 3 + 0.7),
    },
    J_Bip_L_Foot: {
      rx: (t) => -0.008 * Math.sin((TAU * t) / 3 + 0.9),
    },
    J_Bip_R_Foot: {
      rx: (t) => -0.008 * Math.sin((TAU * t) / 3 + 0.9),
    },
  };

  addHandMotions(motions);
  addSecondaryMotions(motions, secondary, IDLE_DURATION);
  return motions;
}

function buildShyMotions(secondary: THREE.Bone[]): Record<string, Motion> {
  // Two breath cycles per loop so the clip wraps without a visible hitch.
  const breath = (t: number) => Math.sin((4 * Math.PI * t) / SHY_DURATION);
  const sway = (t: number) => Math.sin((TAU * t) / SHY_DURATION);
  const glance = (t: number) => Math.sin((TAU * t) / SHY_DURATION + 1.1);

  const motions: Record<string, Motion> = {
    J_Bip_C_Hips: {
      rx: (t) => 0.004 * breath(t + 0.2),
      rz: (t) => 0.008 * sway(t),
      py: (t) => 0.002 * breath(t),
    },
    J_Bip_C_Spine: {
      rx: (t) => 0.004 * breath(t),
      rz: (t) => 0.004 * sway(t + 0.3),
    },
    J_Bip_C_Chest: {
      rx: (t) => 0.005 * breath(t + 0.1),
    },
    J_Bip_C_Neck: {
      rx: (t) => 0.004 * Math.sin((4 * Math.PI * t) / SHY_DURATION + 0.4),
      rz: (t) => 0.005 * sway(t + 0.5),
    },
    J_Bip_C_Head: {
      rx: (t) => 0.008 * Math.sin((4 * Math.PI * t) / SHY_DURATION + 0.8),
      ry: (t) => 0.020 * glance(t),
      rz: (t) => 0.012 * sway(t + 0.6),
    },
    J_Bip_L_Shoulder: {
      rx: (t) => 0.004 * breath(t + 0.3),
      rz: (t) => 0.004 * sway(t + 0.2),
    },
    J_Bip_R_Shoulder: {
      rx: (t) => 0.004 * breath(t + 0.3),
      rz: (t) => -0.004 * sway(t + 0.2),
    },
    J_Bip_L_UpperArm: {
      rx: (t) => 0.010 * sway(t + 0.7),
      rz: (t) => 0.010 * breath(t + 0.4),
    },
    J_Bip_R_UpperArm: {
      rx: (t) => 0.010 * sway(t + 0.7),
      rz: (t) => -0.010 * breath(t + 0.4),
    },
    J_Bip_L_LowerArm: {
      rz: (t) => -0.016 * sway(t + 1.0),
    },
    J_Bip_R_LowerArm: {
      rz: (t) => 0.016 * sway(t + 1.0),
    },
    J_Bip_L_Hand: {
      rx: (t) => 0.010 * sway(t + 1.3),
    },
    J_Bip_R_Hand: {
      rx: (t) => 0.010 * sway(t + 1.3),
    },
    J_Bip_L_UpperLeg: {
      rz: (t) => 0.005 * sway(t + 0.2),
    },
    J_Bip_R_UpperLeg: {
      rz: (t) => -0.005 * sway(t + 0.2),
    },
  };

  addHandMotions(motions);
  addSecondaryMotions(motions, secondary, SHY_DURATION, 0.6);
  return motions;
}

/** Soft, looping anime idle used most of the time. */
export function createIdleAnimationClip(root: THREE.Object3D): THREE.AnimationClip {
  const { bases, secondary } = collectPose(root);
  applyRelaxedPose(bases);
  return sampleClip(bases, buildIdleMotions(secondary), 'florie_gentle_idle', IDLE_DURATION);
}

/** Timid idle played randomly when Florie has been standing still. */
export function createShyIdleAnimationClip(root: THREE.Object3D): THREE.AnimationClip {
  const { bases, secondary } = collectPose(root);
  applyRelaxedPose(bases);
  applyShyPose(bases);
  return sampleClip(bases, buildShyMotions(secondary), 'florie_shy_idle', SHY_DURATION);
}

export { createWalkAnimationClip } from './walkAnimation';

