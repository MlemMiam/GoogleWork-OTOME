import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWalkAnimationClip, WALK_DURATION } from './walkAnimation';

function createMockFlorieSkeleton(): THREE.Group {
  const root = new THREE.Group();
  const bones = [
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
    'J_Sec_Hair_Front',
    'J_Sec_Hair_Back',
    'J_Sec_L_SkirtSide0_01',
    'J_Sec_R_SkirtSide0_01',
    'J_Sec_L_LowerSleeve',
    'J_Sec_R_LowerSleeve',
  ];

  for (const name of bones) {
    const b = new THREE.Bone();
    b.name = name;
    root.add(b);
  }
  return root;
}

test('walkAnimation: clip creation and duration', () => {
  const root = createMockFlorieSkeleton();
  const clip = createWalkAnimationClip(root);

  assert.equal(clip.name, 'florie_anime_walk');
  assert.ok(clip.duration > 0, 'clip duration must be positive');
  assert.ok(Math.abs(clip.duration - WALK_DURATION) < 0.05, 'duration matches WALK_DURATION');
  assert.ok(clip.tracks.length >= 20, 'clip must contain keyframe tracks for bones');
});

test('walkAnimation: track coverage for key locomotion joints', () => {
  const root = createMockFlorieSkeleton();
  const clip = createWalkAnimationClip(root);
  const trackNames = clip.tracks.map((t) => t.name);

  assert.ok(trackNames.includes('J_Bip_C_Hips.quaternion'), 'must animate hips rotation');
  assert.ok(trackNames.includes('J_Bip_C_Hips.position'), 'must animate hips vertical bounce/sway');
  assert.ok(trackNames.includes('J_Bip_L_UpperLeg.quaternion'), 'must animate left leg swing');
  assert.ok(trackNames.includes('J_Bip_R_UpperLeg.quaternion'), 'must animate right leg swing');
  assert.ok(trackNames.includes('J_Bip_L_LowerLeg.quaternion'), 'must animate left knee flexion');
  assert.ok(trackNames.includes('J_Bip_R_LowerLeg.quaternion'), 'must animate right knee flexion');
  assert.ok(trackNames.includes('J_Bip_L_Foot.quaternion'), 'must animate left foot');
  assert.ok(trackNames.includes('J_Bip_R_Foot.quaternion'), 'must animate right foot');
  assert.ok(trackNames.includes('J_Bip_L_UpperArm.quaternion'), 'must animate arm swing');
  assert.ok(trackNames.includes('J_Bip_R_UpperArm.quaternion'), 'must animate arm swing');
});

test('walkAnimation: seamless loop continuity (start matches end)', () => {
  const root = createMockFlorieSkeleton();
  const clip = createWalkAnimationClip(root);

  clip.tracks.forEach((track) => {
    const stride = track.getValueSize();
    const values = track.values;
    const len = values.length;
    // Compare first frame and last frame
    for (let i = 0; i < stride; i++) {
      const first = values[i];
      const last = values[len - stride + i];
      assert.ok(
        Math.abs(first - last) < 1e-4,
        `Track ${track.name} index ${i} must wrap seamlessly (first=${first}, last=${last})`
      );
    }
  });
});
