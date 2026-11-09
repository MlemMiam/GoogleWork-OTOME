import * as THREE from 'three';

const TAU = Math.PI * 2;
const IDLE_DURATION = 6;
const SAMPLE_FPS = 30;

type BoneBase = {
  bone: THREE.Bone;
  quaternion: THREE.Quaternion;
  position: THREE.Vector3;
};

type Motion = {
  /** Rotation offsets in radians, applied in the bone's local space. */
  rx?: (t: number) => number;
  ry?: (t: number) => number;
  rz?: (t: number) => number;
  /** Position offset in meters, applied in the bone's local space. */
  px?: (t: number) => number;
  py?: (t: number) => number;
  pz?: (t: number) => number;
};

/**
 * Builds a soft, looping anime idle entirely from keyframes. The base pose is
 * sampled from an existing clip when provided, otherwise the model rest pose
 * is used with a relaxed A-pose adjustment for the arms.
 */
export function createIdleAnimationClip(
  root: THREE.Object3D,
  baseClip?: THREE.AnimationClip
): THREE.AnimationClip {
  const bones: Record<string, THREE.Bone> = {};
  root.traverse((object) => {
    if ((object as THREE.Bone).isBone && !object.name.toLowerCase().includes('collider')) {
      bones[object.name] = object as THREE.Bone;
    }
  });

  const bases: Record<string, BoneBase> = {};
  let baseSampler: THREE.AnimationMixer | null = null;
  let baseAction: THREE.AnimationAction | null = null;

  if (baseClip) {
    baseSampler = new THREE.AnimationMixer(root);
    baseAction = baseSampler.clipAction(baseClip);
    baseAction.play();
    baseSampler.setTime(0);
  }

  const capture = (name: string) => {
    const bone = bones[name];
    if (!bone) return;
    bases[name] = {
      bone,
      quaternion: bone.quaternion.clone(),
      position: bone.position.clone(),
    };
  };

  // Core pose bones.
  [
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
    'J_Bip_L_UpperLeg',
    'J_Bip_R_UpperLeg',
    'J_Bip_L_LowerLeg',
    'J_Bip_R_LowerLeg',
    'J_Bip_L_Foot',
    'J_Bip_R_Foot',
  ].forEach(capture);

  // Secondary bones (hair, skirt, sleeves) add the soft anime follow-through.
  const secondaryBones = Object.values(bones).filter(
    (bone) =>
      !bone.name.includes('_end_') &&
      /J_Sec_(Hair|L_Skirt|R_Skirt|L_LowerSleeve|L_TipSleeve|R_LowerSleeve|R_TipSleeve)/.test(bone.name)
  );
  secondaryBones.forEach((bone) => {
    bases[bone.name] = {
      bone,
      quaternion: bone.quaternion.clone(),
      position: bone.position.clone(),
    };
  });

  // The temporary sampler must stay active until every base transform has
  // been captured; stopping it restores the original rest pose.
  if (baseAction) baseAction.stop();
  if (baseSampler) baseSampler.uncacheRoot(root);

  // If there is no source animation, place the arms along the body so the
  // rest T-pose does not leak into the idle.
  if (!baseClip) {
    const relaxed = (name: string, x: number, z = 0) => {
      const base = bases[name];
      if (!base) return;
      const offset = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, 0, z, 'XYZ'));
      base.quaternion.multiply(offset);
    };
    relaxed('J_Bip_L_UpperArm', -1.22, 0.06);
    relaxed('J_Bip_R_UpperArm', -1.22, -0.06);
    relaxed('J_Bip_L_LowerArm', -0.12, 0.02);
    relaxed('J_Bip_R_LowerArm', -0.12, -0.02);
  }

  const breath = (t: number) => Math.sin((TAU * t) / 3);
  const sway = (t: number) => Math.sin((TAU * t) / IDLE_DURATION);
  const swayHarmonic = (t: number, phase = 0) =>
    0.7 * Math.sin((TAU * t) / IDLE_DURATION + phase) +
    0.3 * Math.sin((2 * TAU * t) / IDLE_DURATION + phase);

  const motions: Record<string, Motion> = {
    J_Bip_C_Hips: {
      rx: (t) => 0.012 * breath(t + 0.2),
      ry: (t) => 0.022 * swayHarmonic(t + 0.3),
      rz: (t) => 0.035 * swayHarmonic(t),
      py: (t) => 0.004 * breath(t),
    },
    J_Bip_C_Spine: {
      rx: (t) => -0.015 * breath(t),
      ry: (t) => 0.012 * sway(t + 0.4),
      rz: (t) => 0.022 * swayHarmonic(t + 0.15),
    },
    J_Bip_C_Chest: {
      rx: (t) => -0.020 * breath(t + 0.1),
      ry: (t) => 0.010 * sway(t + 0.5),
      rz: (t) => 0.015 * sway(t + 0.3),
    },
    J_Bip_C_UpperChest: {
      rx: (t) => -0.015 * breath(t + 0.2),
      rz: (t) => 0.010 * sway(t + 0.45),
    },
    J_Bip_C_Neck: {
      rx: (t) => 0.012 * Math.sin((TAU * t) / 3 + 0.4),
      rz: (t) => -0.022 * sway(t + 0.5),
    },
    J_Bip_C_Head: {
      rx: (t) => 0.020 * Math.sin((TAU * t) / 3 + 0.9),
      ry: (t) => 0.045 * swayHarmonic(t + 0.2),
      rz: (t) => -0.055 * swayHarmonic(t + 0.75),
    },
    J_Bip_L_Shoulder: {
      rx: (t) => 0.010 * breath(t + 0.3),
      rz: (t) => 0.022 * sway(t + 0.25),
    },
    J_Bip_R_Shoulder: {
      rx: (t) => 0.010 * breath(t + 0.3),
      rz: (t) => -0.022 * sway(t + 0.25),
    },
    J_Bip_L_UpperArm: {
      rx: (t) => 0.050 * sway(t + 0.9),
      ry: (t) => 0.025 * sway(t + 0.1),
      rz: (t) => 0.030 * Math.sin((TAU * t) / 3 + 0.6),
    },
    J_Bip_R_UpperArm: {
      rx: (t) => 0.050 * sway(t + 1.1),
      ry: (t) => -0.025 * sway(t + 0.1),
      rz: (t) => -0.030 * Math.sin((TAU * t) / 3 + 0.6),
    },
    J_Bip_L_LowerArm: {
      rx: (t) => 0.035 * sway(t + 1.25),
      rz: (t) => 0.025 * Math.sin((TAU * t) / 3 + 1.0),
    },
    J_Bip_R_LowerArm: {
      rx: (t) => 0.035 * sway(t + 1.4),
      rz: (t) => -0.025 * Math.sin((TAU * t) / 3 + 1.0),
    },
    J_Bip_L_Hand: {
      rx: (t) => 0.025 * sway(t + 1.6),
      rz: (t) => 0.015 * Math.sin((TAU * t) / 3 + 1.2),
    },
    J_Bip_R_Hand: {
      rx: (t) => 0.025 * sway(t + 1.75),
      rz: (t) => -0.015 * Math.sin((TAU * t) / 3 + 1.2),
    },
    J_Bip_L_UpperLeg: {
      rx: (t) => 0.008 * breath(t + 0.5),
      rz: (t) => 0.018 * sway(t + 0.2),
    },
    J_Bip_R_UpperLeg: {
      rx: (t) => 0.008 * breath(t + 0.5),
      rz: (t) => -0.018 * sway(t + 0.2),
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

  // Soft follow-through on hair, skirt and sleeves.
  secondaryBones.forEach((bone, index) => {
    const phase = index * 0.37;
    const isHair = /Hair/.test(bone.name);
    const isSleeve = /Sleeve/.test(bone.name);
    const amplitude = isHair ? 0.018 : isSleeve ? 0.010 : 0.013;

    motions[bone.name] = {
      rx: (t) => amplitude * Math.sin((TAU * t) / IDLE_DURATION + phase),
      rz: (t) => amplitude * 0.8 * Math.sin((TAU * t) / IDLE_DURATION + phase + 0.65),
    };
  });

  const frameCount = Math.round(IDLE_DURATION * SAMPLE_FPS);
  const times = new Float32Array(frameCount + 1);
  for (let frame = 0; frame <= frameCount; frame++) {
    times[frame] = frame / SAMPLE_FPS;
  }

  const tracks: THREE.KeyframeTrack[] = [];
  const euler = new THREE.Euler(0, 0, 0, 'XYZ');
  const offsetQuaternion = new THREE.Quaternion();

  for (const [name, base] of Object.entries(bases)) {
    const motion = motions[name];
    if (!motion) continue;

    const quaternionValues = new Float32Array((frameCount + 1) * 4);
    const positionValues =
      motion.px || motion.py || motion.pz
        ? new Float32Array((frameCount + 1) * 3)
        : null;

    for (let frame = 0; frame <= frameCount; frame++) {
      const t = times[frame];
      const rx = motion.rx ? motion.rx(t) : 0;
      const ry = motion.ry ? motion.ry(t) : 0;
      const rz = motion.rz ? motion.rz(t) : 0;

      // Smooth the small offsets to keep the motion organic and avoid
      // visible linear stepping between samples.
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
      new THREE.QuaternionKeyframeTrack(`${base.bone.name}.quaternion`, Array.from(times), Array.from(quaternionValues))
    );

    if (positionValues) {
      tracks.push(
        new THREE.VectorKeyframeTrack(`${base.bone.name}.position`, Array.from(times), Array.from(positionValues))
      );
    }
  }

  const clip = new THREE.AnimationClip('florie_gentle_idle', IDLE_DURATION, tracks);
  clip.optimize();
  return clip;
}
