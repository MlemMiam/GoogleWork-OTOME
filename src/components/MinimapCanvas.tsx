/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { WORLD } from '../game/physics';

interface MinimapCanvasProps {
  playerX: number;
  playerZ: number;
  facing: number;
}

export const MinimapCanvas: React.FC<MinimapCanvasProps> = ({ playerX, playerZ, facing }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const ax = W / (WORLD.x1 - WORLD.x0);
    const az = H / (WORLD.z1 - WORLD.z0 + 4);

    const X = (x: number) => (x - WORLD.x0) * ax;
    const Z = (z: number) => (z - WORLD.z0) * az;

    // Grass ground
    ctx.fillStyle = '#5f9040';
    ctx.fillRect(0, 0, W, H);

    // Street asphalt
    ctx.fillStyle = '#4a4c52';
    ctx.fillRect(0, Z(26), W, 10 * az);

    // Main walkway & plaza
    ctx.fillStyle = '#cfc9bd';
    ctx.fillRect(X(-3), Z(-6), 6 * ax, 28 * az);
    ctx.fillRect(X(-7), Z(-6), 14 * ax, 6 * az);

    // Diagonal paths
    ctx.strokeStyle = '#cfc9bd';
    ctx.lineWidth = 3 * ax;
    ctx.beginPath();
    ctx.moveTo(X(-5), Z(0));
    ctx.lineTo(X(-25), Z(22.5));
    ctx.moveTo(X(5), Z(0));
    ctx.lineTo(X(25), Z(22.5));
    ctx.stroke();

    // Building footprint
    ctx.fillStyle = '#8a3d30';
    ctx.fillRect(X(-30), Z(-30), 60 * ax, 20 * az);
    ctx.fillRect(X(-6), Z(-10), 12 * ax, 4.4 * az);

    // Interior floor
    ctx.fillStyle = '#efe6d2';
    ctx.fillRect(X(-29.4), Z(-29.4), 58.8 * ax, 18.8 * az);

    // Classroom partition walls
    ctx.strokeStyle = '#8a3d30';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(X(-30), Z(-22));
    ctx.lineTo(X(30), Z(-22));
    [-14, 0, 14].forEach((x) => {
      ctx.moveTo(X(x), Z(-30));
      ctx.lineTo(X(x), Z(-22));
    });
    ctx.stroke();

    // Flagpole dot
    ctx.fillStyle = '#fff';
    ctx.fillRect(X(-0.6), Z(4.4), 1.2 * ax + 1, 1.2 * az + 1);

    // Player arrow
    const px = X(playerX);
    const pz = Z(playerZ);
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(-facing + Math.PI);
    ctx.fillStyle = '#fffdb8';
    ctx.strokeStyle = '#2a1810';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, [playerX, playerZ, facing]);

  return (
    <canvas
      ref={canvasRef}
      width={160}
      height={120}
      className="rounded-xs border-2 border-[#2a1810] shadow-[0_0_0_2px_#fff3d6] w-[140px] h-[105px] sm:w-[160px] sm:h-[120px]"
    />
  );
};
