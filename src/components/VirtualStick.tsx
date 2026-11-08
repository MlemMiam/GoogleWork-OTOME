/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useCallback } from 'react';

interface VirtualStickProps {
  onMove: (stick: { x: number; y: number }) => void;
}

export const VirtualStick: React.FC<VirtualStickProps> = ({ onMove }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeTouchId = useRef<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    activeTouchId.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updateStick(e.clientX, e.clientY);
  }, []);

  const updateStick = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      let dx = (clientX - cx) / (rect.width / 2);
      let dy = (clientY - cy) / (rect.height / 2);
      const m = Math.hypot(dx, dy);
      if (m > 1) {
        dx /= m;
        dy /= m;
      }

      setOffset({ x: dx * 36, y: dy * 36 });
      onMove({ x: dx, y: -dy });
    },
    [onMove]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerId !== activeTouchId.current) return;
      updateStick(e.clientX, e.clientY);
    },
    [updateStick]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerId === activeTouchId.current) {
        activeTouchId.current = null;
        setOffset({ x: 0, y: 0 });
        onMove({ x: 0, y: 0 });
      }
    },
    [onMove]
  );

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="fixed z-20 left-6 bottom-16 sm:bottom-20 w-28 h-28 rounded-full bg-[#fff3d6]/20 border-2 border-[#fff3d6]/60 touch-none select-none flex items-center justify-center cursor-grab active:cursor-grabbing"
      title="Joystick tactile"
      aria-label="Joystick tactile pour déplacer Florie"
      role="button"
    >
      <div
        className="w-12 h-12 rounded-full bg-[#fff3d6]/90 shadow-md transition-transform duration-75 pointer-events-none"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
        }}
      />
    </div>
  );
};
