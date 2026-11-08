/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { collide, getPlaceInfo, clamp } from './game/physics';
import { buildEnvironment } from './game/environment';
import { createFlorie, FlorieCharacter } from './game/florie';
import { soundManager } from './game/audio';
import { StartModal } from './components/StartModal';
import { MinimapCanvas } from './components/MinimapCanvas';
import { VirtualStick } from './components/VirtualStick';
import { ControlsDock } from './components/ControlsDock';

const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return false;
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // UI state
  const [hasStarted, setHasStarted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isZen, setIsZen] = useState(false);
  const [locationInfo, setLocationInfo] = useState({
    title: "Cour d'entrée",
    subtitle: 'East High',
  });
  const [playerHud, setPlayerHud] = useState({ x: 0, z: 16, facing: Math.PI });
  const [isCloseup, setIsCloseup] = useState(false);
  const [activeModel, setActiveModel] = useState<'procedural' | 'glb'>('procedural');
  const [isGlbLoaded, setIsGlbLoaded] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Mutable game state in refs
  const stateRef = useRef({
    x: 0,
    z: 16,
    facing: Math.PI,
    walk: 0,
    phase: 0,
    r: 0.38,
    camYaw: 0,
    camPitch: 0.28,
    camDist: 6,
    minDist: 2.2,
    maxDist: 14,
    keys: {} as Record<string, boolean>,
    stick: { x: 0, y: 0 },
    started: false,
    locked: false,
    closeup: false,
    savedCam: null as [number, number] | null,
    dragId: null as number | null,
    lastX: 0,
    lastY: 0,
    moved: 0,
  });

  const florieRef = useRef<FlorieCharacter | null>(null);

  const startExperience = useCallback(() => {
    setHasStarted(true);
    stateRef.current.started = true;
    setShowHelp(false);
  }, []);

  // Check URL query parameters for ?autostart=1
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        startExperience();
      }
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }
  }, [startExperience]);

  // Main Three.js lifecycle
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    if (!isSoftwareGl) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
    const canvas = renderer.domElement;
    canvas.id = 'scene';
    canvas.className = 'fixed inset-0 w-full h-full block bg-[#9fd0f5] touch-none select-none';
    container.appendChild(canvas);

    // Build environment
    const env = buildEnvironment(isSoftwareGl);
    const { scene, camera, sun, solids, boxes, flagGeo, flagBase } = env;

    // Build Florie character
    const florie = createFlorie(scene, stateRef.current.x, stateRef.current.z);
    florieRef.current = florie;

    // Camera raycaster & vectors for smooth damping
    const ray = new THREE.Raycaster();
    const camTarget = new THREE.Vector3();
    const tmpDir = new THREE.Vector3();
    const desiredCamPos = new THREE.Vector3();

    camera.position.set(0, 3, 22);

    // Keyboard controls
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      stateRef.current.keys[k] = true;

      if (k === 'v' && stateRef.current.started) {
        stateRef.current.closeup = !stateRef.current.closeup;
        setIsCloseup(stateRef.current.closeup);
        if (stateRef.current.closeup) {
          stateRef.current.savedCam = [stateRef.current.camDist, stateRef.current.camPitch];
          stateRef.current.camDist = 2.3;
          stateRef.current.camPitch = 0.04;
          stateRef.current.camYaw = stateRef.current.facing;
        } else if (stateRef.current.savedCam) {
          stateRef.current.camDist = stateRef.current.savedCam[0];
          stateRef.current.camPitch = stateRef.current.savedCam[1];
        }
      }

      if (k === 'h' && stateRef.current.started) {
        setIsZen((prev) => !prev);
      }

      if (k.startsWith('Arrow') || k === ' ') {
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      stateRef.current.keys[k] = false;
    };

    const onBlur = () => {
      stateRef.current.keys = {};
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // Mouse / Pointer Camera Controls
    const rotateCam = (dx: number, dy: number) => {
      stateRef.current.camYaw -= dx * 0.0052;
      stateRef.current.camPitch = clamp(stateRef.current.camPitch + dy * 0.0042, -0.15, 1.3);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!stateRef.current.started) return;
      stateRef.current.dragId = e.pointerId;
      stateRef.current.lastX = e.clientX;
      stateRef.current.lastY = e.clientY;
      stateRef.current.moved = 0;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!stateRef.current.started) return;
      if (stateRef.current.locked) {
        rotateCam(e.movementX, e.movementY);
        return;
      }
      if (e.pointerId !== stateRef.current.dragId) return;
      const dx = e.clientX - stateRef.current.lastX;
      const dy = e.clientY - stateRef.current.lastY;
      stateRef.current.lastX = e.clientX;
      stateRef.current.lastY = e.clientY;
      stateRef.current.moved += Math.abs(dx) + Math.abs(dy);
      rotateCam(dx, dy);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId === stateRef.current.dragId) {
        stateRef.current.dragId = null;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const minD = stateRef.current.closeup ? 1.2 : stateRef.current.minDist;
      stateRef.current.camDist = clamp(
        stateRef.current.camDist + e.deltaY * 0.005,
        minD,
        stateRef.current.maxDist
      );
    };

    const onPointerLockChange = () => {
      stateRef.current.locked = document.pointerLockElement === canvas;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('pointerlockchange', onPointerLockChange);

    // Resize handler
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // Animation loop with software WebGL guard
    let animId = 0;
    let lastTime = performance.now();
    let totalTime = 0;
    let frameCount = 0;
    let blinkAt = 2.5;
    let blinkEnd = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      totalTime += dt;
      frameCount++;

      const st = stateRef.current;

      // Keyboard camera controls
      if (st.keys.ArrowLeft) st.camYaw += 1.9 * dt;
      if (st.keys.ArrowRight) st.camYaw -= 1.9 * dt;
      if (st.keys.ArrowUp) st.camPitch = clamp(st.camPitch - 1.2 * dt, -0.15, 1.3);
      if (st.keys.ArrowDown) st.camPitch = clamp(st.camPitch + 1.2 * dt, -0.15, 1.3);
      if (st.keys['+'] || st.keys['=']) st.camDist = clamp(st.camDist - 6 * dt, st.minDist, st.maxDist);
      if (st.keys['-']) st.camDist = clamp(st.camDist + 6 * dt, st.minDist, st.maxDist);

      // Movement ZQSD & WASD relative to camera
      let ix = st.stick.x;
      let iz = st.stick.y;
      if (st.started) {
        if (st.keys.z || st.keys.w) iz += 1;
        if (st.keys.s) iz -= 1;
        if (st.keys.d) ix += 1;
        if (st.keys.q || st.keys.a) ix -= 1;
      }
      const mag = Math.hypot(ix, iz);
      if (mag > 1) {
        ix /= mag;
        iz /= mag;
      }
      const isShift = !!st.keys.Shift;
      const speed = (isShift ? 5.8 : 3.1) * (mag ? 1 : 0);
      const fx = -Math.sin(st.camYaw);
      const fz = -Math.cos(st.camYaw);
      const rx = Math.cos(st.camYaw);
      const rz = -Math.sin(st.camYaw);
      const vx = fx * iz + rx * ix;
      const vz = fz * iz + rz * ix;
      const moving = mag > 0.05;

      if (moving) {
        const nextPos = collide(st.x + vx * speed * dt, st.z + vz * speed * dt, st.r, boxes);
        st.x = nextPos[0];
        st.z = nextPos[1];
        const targetRot = Math.atan2(vx, vz);
        let diff = targetRot - st.facing;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        st.facing += diff * Math.min(1, dt * 12);

        // Sound effect
        const isIndoors = st.z < -10;
        soundManager.playFootstep(isIndoors, isShift);
      }

      st.walk += ((moving ? 1 : 0) - st.walk) * Math.min(1, dt * 10);
      st.phase += dt * (isShift ? 11 : 7.5) * st.walk;

      // Update character position & animation
      florie.group.position.set(st.x, 0, st.z);
      florie.group.rotation.y = st.facing;

      if (totalTime > blinkAt) {
        blinkAt = totalTime + 2.5 + Math.random() * 3;
        blinkEnd = totalTime + 0.13;
      }
      florie.setBlink(totalTime < blinkEnd);
      florie.updateAnimation(dt, totalTime, st.phase, st.walk, isShift);

      // Camera 3rd person follow with wall collision raycasting
      camTarget.set(st.x, st.closeup ? 1.32 : 1.22, st.z);
      const cp = Math.cos(st.camPitch);
      tmpDir.set(Math.sin(st.camYaw) * cp, Math.sin(st.camPitch), Math.cos(st.camYaw) * cp);
      let dist = st.camDist;
      ray.set(camTarget, tmpDir);
      ray.near = 0;
      ray.far = dist + 0.4;
      const hits = ray.intersectObjects(solids, false);
      if (hits.length > 0) {
        dist = Math.max(0.9, Math.min(dist, hits[0].distance - 0.3));
      }
      desiredCamPos.copy(camTarget).addScaledVector(tmpDir, dist);
      if (desiredCamPos.y < 0.25) desiredCamPos.y = 0.25;
      camera.position.lerp(desiredCamPos, Math.min(1, dt * 18));
      camera.lookAt(camTarget);

      // Sun follows player for crisp shadows
      sun.position.set(st.x + 26, 46, st.z + 18);
      sun.target.position.set(st.x, 0, st.z);

      // Waving American flag
      const fp = flagGeo.attributes.position;
      const fb = flagBase;
      for (let i = 0; i < fp.count; i++) {
        const x = fb[i * 3];
        const w = (x + 1.25) / 2.5;
        fp.setZ(i, Math.sin(x * 3.2 - totalTime * 4.2) * 0.14 * w + Math.sin(x * 1.6 - totalTime * 2.3) * 0.05 * w);
        fp.setY(i, fb[i * 3 + 1] - Math.sin(x * 3.2 - totalTime * 4.2) * 0.02 * w);
      }
      fp.needsUpdate = true;
      flagGeo.computeVertexNormals();

      // Periodic HUD update (every 6 frames)
      if (frameCount % 6 === 0) {
        const place = getPlaceInfo(st.x, st.z);
        setLocationInfo(place);
        setPlayerHud({ x: st.x, z: st.z, facing: st.facing });
        setIsGlbLoaded(florie.isGlbLoaded());
        setActiveModel(florie.getActiveModel());
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        // Safe paced callback for headless/software WebGL
        window.setTimeout(() => {
          animId = requestAnimationFrame(tick);
        }, 50);
      } else {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      florie.dispose();
      env.dispose();
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, []);

  const handleVirtualStickMove = useCallback((stick: { x: number; y: number }) => {
    stateRef.current.stick = stick;
  }, []);

  const handleCameraPreset = useCallback((preset: 'follow' | 'entrance' | 'hall' | 'room' | 'closeup') => {
    const st = stateRef.current;
    if (preset === 'closeup') {
      st.closeup = !st.closeup;
      setIsCloseup(st.closeup);
      if (st.closeup) {
        st.savedCam = [st.camDist, st.camPitch];
        st.camDist = 2.3;
        st.camPitch = 0.04;
        st.camYaw = st.facing;
      } else if (st.savedCam) {
        st.camDist = st.savedCam[0];
        st.camPitch = st.savedCam[1];
      }
    } else if (preset === 'follow') {
      st.closeup = false;
      setIsCloseup(false);
      st.camDist = 6;
      st.camPitch = 0.28;
      st.camYaw = st.facing;
    } else if (preset === 'entrance') {
      st.x = 0;
      st.z = -1;
      st.facing = Math.PI;
      st.camYaw = 0;
      st.camDist = 6;
      st.camPitch = 0.22;
      st.closeup = false;
      setIsCloseup(false);
    } else if (preset === 'hall') {
      st.x = 0;
      st.z = -15;
      st.facing = Math.PI;
      st.camYaw = 0;
      st.camDist = 5.5;
      st.camPitch = 0.25;
      st.closeup = false;
      setIsCloseup(false);
    } else if (preset === 'room') {
      st.x = -20;
      st.z = -25;
      st.facing = Math.PI;
      st.camYaw = 0;
      st.camDist = 5;
      st.camPitch = 0.2;
      st.closeup = false;
      setIsCloseup(false);
    }
    setLocationInfo(getPlaceInfo(st.x, st.z));
    setPlayerHud({ x: st.x, z: st.z, facing: st.facing });
  }, []);

  const handleToggleModel = useCallback(() => {
    if (!florieRef.current) return;
    const next = florieRef.current.getActiveModel() === 'procedural' ? 'glb' : 'procedural';
    florieRef.current.setActiveModel(next);
    setActiveModel(next);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#2a1810] text-[#fff3d6] font-['M_PLUS_Rounded_1c']">
      {/* 3D WebGL Canvas mount container */}
      <div ref={mountRef} className="fixed inset-0 w-full h-full" />

      {/* HUD - Location indicator top-left */}
      {!isZen && (
        <div
          id="place"
          className="fixed z-10 top-3 left-4 bg-[#2a1810]/85 text-[#fff3d6] px-3.5 py-1.5 rounded-xs font-bold tracking-wide text-sm border-l-4 border-[#fffdb8] shadow-md select-none pointer-events-none"
        >
          {locationInfo.title}
          <small className="block font-normal tracking-widest uppercase text-[10px] text-[#e0d2bc] mt-0.5">
            {locationInfo.subtitle}
          </small>
        </div>
      )}

      {/* HUD - Minimap top-right */}
      {!isZen && (
        <div id="mini" className="fixed z-10 top-3 right-4 select-none pointer-events-none">
          <MinimapCanvas
            playerX={playerHud.x}
            playerZ={playerHud.z}
            facing={playerHud.facing}
          />
        </div>
      )}

      {/* HUD - Keyboard hint bottom-left (desktop only) */}
      {!isZen && !isTouchDevice && (
        <div
          id="hint"
          className="fixed z-10 left-4 bottom-14 hidden md:block bg-[#2a1810]/75 text-[#e0d2bc] p-2.5 rounded-xs text-xs leading-relaxed shadow-sm pointer-events-none select-none border border-white/5"
        >
          <kbd className="font-bold text-[11px] bg-[#fff3d6] text-[#2a1810] border-b-2 border-[#e0d2bc] px-1.5 py-0.5 rounded-xs mr-1">Z</kbd>
          <kbd className="font-bold text-[11px] bg-[#fff3d6] text-[#2a1810] border-b-2 border-[#e0d2bc] px-1.5 py-0.5 rounded-xs mr-1">Q</kbd>
          <kbd className="font-bold text-[11px] bg-[#fff3d6] text-[#2a1810] border-b-2 border-[#e0d2bc] px-1.5 py-0.5 rounded-xs mr-1">S</kbd>
          <kbd className="font-bold text-[11px] bg-[#fff3d6] text-[#2a1810] border-b-2 border-[#e0d2bc] px-1.5 py-0.5 rounded-xs mr-1">D</kbd>
          bouger &nbsp;
          <kbd className="font-bold text-[11px] bg-[#fff3d6] text-[#2a1810] border-b-2 border-[#e0d2bc] px-1.5 py-0.5 rounded-xs mr-1">Maj</kbd>
          courir &nbsp;
          <kbd className="font-bold text-[11px] bg-[#fff3d6] text-[#2a1810] border-b-2 border-[#e0d2bc] px-1.5 py-0.5 rounded-xs mr-1">V</kbd>
          gros plan
          <br />
          Glisser = caméra &nbsp;
          <kbd className="font-bold text-[11px] bg-[#fff3d6] text-[#2a1810] border-b-2 border-[#e0d2bc] px-1 py-0.5 rounded-xs mr-0.5">←</kbd>
          <kbd className="font-bold text-[11px] bg-[#fff3d6] text-[#2a1810] border-b-2 border-[#e0d2bc] px-1 py-0.5 rounded-xs mr-0.5">→</kbd>
          <kbd className="font-bold text-[11px] bg-[#fff3d6] text-[#2a1810] border-b-2 border-[#e0d2bc] px-1 py-0.5 rounded-xs mr-0.5">↑</kbd>
          <kbd className="font-bold text-[11px] bg-[#fff3d6] text-[#2a1810] border-b-2 border-[#e0d2bc] px-1 py-0.5 rounded-xs mr-1">↓</kbd>
          &nbsp; Molette = zoom
        </div>
      )}

      {/* Virtual Joystick for touch / mobile */}
      {hasStarted && isTouchDevice && !isZen && (
        <VirtualStick onMove={handleVirtualStickMove} />
      )}

      {/* Collapsible Bottom Control Dock */}
      {hasStarted && (
        <ControlsDock
          onCameraPreset={handleCameraPreset}
          isCloseup={isCloseup}
          onOpenHelp={() => setShowHelp(true)}
          activeModel={activeModel}
          isGlbLoaded={isGlbLoaded}
          onToggleModel={handleToggleModel}
          onToggleZen={() => setIsZen(!isZen)}
          isZen={isZen}
        />
      )}

      {/* Start Modal / Instructions Modal */}
      {(!hasStarted || showHelp) && (
        <StartModal onStart={startExperience} />
      )}
    </div>
  );
}
