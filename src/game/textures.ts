/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

// Seeded variation keeps the hand-painted textures consistent between runs.
let seed = 20261109;
function rnd() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function tex(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, w, h);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function speckle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  count: number,
  alpha: number,
  color = '70,54,45'
) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = `rgba(${color},${rnd() * alpha})`;
    const size = 1 + rnd() * 2;
    ctx.fillRect(rnd() * w, rnd() * h, size, size);
  }
}

function softWash(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.52, 'rgba(255,255,255,0)');
  gradient.addColorStop(1, 'rgba(42,35,48,0.12)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

// Warm terracotta masonry with softened mortar and small painted highlights.
export const brickTex = tex(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#d8c6b5';
  ctx.fillRect(0, 0, w, h);
  const rows = 10;
  const cols = 5;
  const brickH = h / rows;
  const brickW = w / cols;

  for (let row = 0; row < rows; row++) {
    for (let col = -1; col <= cols; col++) {
      const x = col * brickW + (row % 2 ? brickW / 2 : 0) + 3;
      const y = row * brickH + 3;
      const variation = rnd();
      const red = 145 + Math.round(variation * 35);
      const green = 83 + Math.round(variation * 27);
      const blue = 67 + Math.round(variation * 22);
      const gradient = ctx.createLinearGradient(x, y, x + brickW, y + brickH);
      gradient.addColorStop(0, `rgb(${red + 12},${green + 10},${blue + 8})`);
      gradient.addColorStop(0.18, `rgb(${red},${green},${blue})`);
      gradient.addColorStop(1, `rgb(${red - 18},${green - 13},${blue - 10})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, brickW - 6, brickH - 6);
      ctx.fillStyle = 'rgba(255,228,196,0.13)';
      ctx.fillRect(x + 2, y + 2, brickW - 12, 2);
      ctx.strokeStyle = 'rgba(65,39,35,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, brickW - 7, brickH - 7);
    }
  }
  softWash(ctx, w, h, 'rgba(255,223,188,0.12)');
  speckle(ctx, w, h, 2200, 0.09);
});

// Cream stone/concrete with broad tonal variation instead of noisy pixels.
export const concreteTex = tex(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#d9d4c8';
  ctx.fillRect(0, 0, w, h);
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, 'rgba(255,250,231,0.35)');
  base.addColorStop(0.48, 'rgba(255,255,255,0.02)');
  base.addColorStop(1, 'rgba(91,83,74,0.12)');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 32; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const rx = 10 + rnd() * 60;
    const ry = 4 + rnd() * 20;
    ctx.fillStyle = `rgba(255,247,226,${0.025 + rnd() * 0.06})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let y = 0; y < h; y += 128) {
    ctx.fillStyle = 'rgba(105,96,83,0.09)';
    ctx.fillRect(0, y, w, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(0, y + 2, w, 2);
  }
  speckle(ctx, w, h, 2600, 0.055);
});

// Layered green brush strokes evoke an illustrated school lawn.
export const grassTex = tex(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#638c50';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const radius = 18 + rnd() * 75;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, rnd() > 0.5 ? 'rgba(163,190,103,0.18)' : 'rgba(54,99,66,0.16)');
    glow.addColorStop(1, 'rgba(80,125,65,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  for (let i = 0; i < 7200; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const height = 3 + rnd() * 10;
    const hue = rnd();
    ctx.strokeStyle = hue > 0.76
      ? `rgba(190,190,112,${0.12 + rnd() * 0.28})`
      : hue > 0.38
        ? `rgba(118,160,79,${0.2 + rnd() * 0.3})`
        : `rgba(39,92,57,${0.12 + rnd() * 0.25})`;
    ctx.lineWidth = 0.7 + rnd() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.quadraticCurveTo(x + (rnd() - 0.5) * 5, y + height / 2, x + (rnd() - 0.5) * 6, y);
    ctx.stroke();
  }
});

// Asphalt stays subdued so the warm courtyard palette remains the focus.
export const asphaltTex = tex(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#44464a';
  ctx.fillRect(0, 0, w, h);
  const wash = ctx.createLinearGradient(0, 0, w, h);
  wash.addColorStop(0, 'rgba(168,167,157,0.08)');
  wash.addColorStop(0.5, 'rgba(255,255,255,0.015)');
  wash.addColorStop(1, 'rgba(18,21,28,0.15)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 5200; i++) {
    const v = Math.round(45 + rnd() * 55);
    ctx.fillStyle = `rgba(${v},${v + 1},${v + 3},${0.08 + rnd() * 0.18})`;
    ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  for (let y = 64; y < h; y += 128) {
    ctx.fillStyle = 'rgba(22,24,28,0.12)';
    ctx.fillRect(0, y, w, 2);
  }
});

// Soft, alternating school-hall tiles with subtle beveled edges.
export const tileTex = tex(256, 256, (ctx, w, h) => {
  const tile = w / 2;
  ctx.fillStyle = '#b9ad98';
  ctx.fillRect(0, 0, w, h);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const x = col * tile + 3;
      const y = row * tile + 3;
      const light = (row + col) % 2 === 0;
      ctx.fillStyle = light ? '#eee5d3' : '#ded3bd';
      ctx.fillRect(x, y, tile - 6, tile - 6);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(x + 4, y + 4, tile - 14, 3);
      ctx.fillStyle = 'rgba(83,70,53,0.1)';
      ctx.fillRect(x + 4, y + tile - 13, tile - 14, 3);
    }
  }
  speckle(ctx, w, h, 500, 0.04);
});

export const lockerTex = tex(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#173f47';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 2; i++) {
    const x = i * 128 + 6;
    const shade = ctx.createLinearGradient(x, 0, x + 116, 0);
    shade.addColorStop(0, '#286672');
    shade.addColorStop(0.16, '#397f88');
    shade.addColorStop(0.82, '#2f7480');
    shade.addColorStop(1, '#20545d');
    ctx.fillStyle = shade;
    ctx.fillRect(x, 6, 116, 244);
    ctx.fillStyle = 'rgba(255,255,255,0.11)';
    ctx.fillRect(x + 5, 10, 3, 232);
    ctx.fillStyle = '#235b66';
    for (let s = 0; s < 5; s++) ctx.fillRect(x + 30, 22 + s * 9, 56, 4);
    ctx.fillStyle = '#d9e4e6';
    ctx.fillRect(x + 92, 120, 10, 34);
    ctx.fillStyle = '#173f47';
    ctx.fillRect(x + 10, 196, 96, 3);
  }
});

export const plaidTex = tex(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#35221a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(18,8,4,.55)';
  ctx.fillRect(w * 0.12, 0, w * 0.2, h);
  ctx.fillRect(0, h * 0.12, w, h * 0.2);
  ctx.fillStyle = 'rgba(120,92,72,.45)';
  ctx.fillRect(w * 0.55, 0, w * 0.26, h);
  ctx.fillRect(0, h * 0.55, w, h * 0.26);
  ctx.fillStyle = 'rgba(240,230,214,.78)';
  ctx.fillRect(w * 0.36, 0, 3, h);
  ctx.fillRect(w * 0.42, 0, 3, h);
  ctx.fillRect(0, h * 0.36, w, 3);
  ctx.fillRect(0, h * 0.42, w, 3);
  ctx.fillStyle = 'rgba(235,225,210,.35)';
  ctx.fillRect(w * 0.58, 0, 2, h);
  ctx.fillRect(0, h * 0.58, w, 2);
});

export const flagTex = tex(520, 274, (ctx, w, h) => {
  const stripeH = h / 13;
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 ? '#ffffff' : '#b22234';
    ctx.fillRect(0, i * stripeH, w, stripeH + 1);
  }
  ctx.fillStyle = '#3c3b6e';
  ctx.fillRect(0, 0, w * 0.4, stripeH * 7);
  ctx.fillStyle = '#fff';
  for (let row = 0; row < 9; row++) {
    const count = row % 2 ? 5 : 6;
    for (let col = 0; col < count; col++) {
      const x = (row % 2 ? (col + 1) * 2 : col * 2 + 1) * ((w * 0.4) / 12);
      const y = (row + 1) * ((stripeH * 7) / 10);
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }
});
flagTex.wrapS = THREE.ClampToEdgeWrapping;
flagTex.wrapT = THREE.ClampToEdgeWrapping;

export function labelTex(
  text: string,
  w: number,
  h: number,
  bg: string,
  fg: string,
  font: string
): THREE.CanvasTexture {
  const texture = tex(w, h, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 4);
  });
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}
