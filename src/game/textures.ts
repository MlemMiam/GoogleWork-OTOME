/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

let seed = 20261108;
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
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) {
    draw(ctx, w, h);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function speckle(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  n: number,
  a: number
) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(0,0,0,${rnd() * a})`;
    g.fillRect(rnd() * w, rnd() * h, 2, 2);
  }
}

export const brickTex = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#c2a48b';
  g.fillRect(0, 0, w, h);
  const rows = 8,
    cols = 4,
    bh = h / rows,
    bw = w / cols;
  for (let r = 0; r < rows; r++) {
    for (let c = -1; c < cols; c++) {
      const x = c * bw + ((r % 2) * bw) / 2 + 2,
        y = r * bh + 2,
        v = rnd();
      g.fillStyle = `rgb(${128 + ((v * 36) | 0)},${86 + ((v * 24) | 0)},${64 + ((v * 18) | 0)})`;
      g.fillRect(x, y, bw - 4, bh - 4);
      g.strokeStyle = `rgba(60,32,22,${0.15 + rnd() * 0.2})`;
      g.lineWidth = 1;
      g.strokeRect(x + 0.5, y + 0.5, bw - 5, bh - 5);
    }
  }
  speckle(g, w, h, 1800, 0.12);
});

export const concreteTex = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#d7d0c1';
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 18) {
    g.fillStyle = 'rgba(110,104,94,0.08)';
    g.fillRect(0, y, w, 2);
  }
  for (let x = 0; x < w; x += 20) {
    g.fillStyle = 'rgba(90,84,76,0.06)';
    g.fillRect(x, 0, 2, h);
  }
  speckle(g, w, h, 3000, 0.08);
  g.fillStyle = '#b9b1a2';
  g.fillRect(0, 0, w, 3);
  g.fillRect(0, 0, 3, h);
});

export const grassTex = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#4d7d39';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 8000; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const len = 3 + rnd() * 6;
    const shade = 60 + ((rnd() * 70) | 0);
    g.strokeStyle = `rgba(${50 + shade}, ${120 + shade}, ${40 + shade / 2}, 0.5)`;
    g.beginPath();
    g.moveTo(x, y + len);
    g.lineTo(x + (rnd() - 0.5) * 3, y);
    g.stroke();
  }
  for (let i = 0; i < 1200; i++) {
    g.fillStyle = `rgba(${90 + (rnd() * 40) | 0},${110 + (rnd() * 50) | 0},${70 + (rnd() * 30) | 0},${0.22 + rnd() * 0.4})`;
    g.fillRect(rnd() * w, rnd() * h, 2, 2);
  }
});

export const asphaltTex = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#2c2d31';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 5000; i++) {
    const v = (rnd() * 50) | 0;
    g.fillStyle = `rgb(${40 + v},${42 + v},${46 + v})`;
    g.fillRect(rnd() * w, rnd() * h, 2, 2);
  }
  for (let x = 0; x < w; x += 24) {
    g.fillStyle = 'rgba(216,214,186,0.08)';
    g.fillRect(x, 0, 1, h);
  }
});

export const tileTex = tex(128, 128, (g, w, h) => {
  g.fillStyle = '#e8dfca';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#d3c7ad';
  g.fillRect(0, 0, w / 2, h / 2);
  g.fillRect(w / 2, h / 2, w / 2, h / 2);
  g.fillStyle = '#b9ab8f';
  g.fillRect(0, 0, w, 2);
  g.fillRect(0, 0, 2, h);
  g.fillRect(0, h / 2, w, 2);
  g.fillRect(w / 2, 0, 2, h);
  speckle(g, w, h, 420, 0.05);
});

export const lockerTex = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#173f47';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2; i++) {
    const x = i * 128 + 6;
    g.fillStyle = '#2f7480';
    g.fillRect(x, 6, 116, 244);
    g.fillStyle = '#235b66';
    for (let s = 0; s < 5; s++) g.fillRect(x + 30, 22 + s * 9, 56, 4);
    g.fillStyle = '#d9e4e6';
    g.fillRect(x + 92, 120, 10, 34);
    g.fillStyle = '#173f47';
    g.fillRect(x + 10, 196, 96, 3);
  }
});

export const plaidTex = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#35221a';
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(18,8,4,.55)';
  g.fillRect(w * 0.12, 0, w * 0.2, h);
  g.fillRect(0, h * 0.12, w, h * 0.2);
  g.fillStyle = 'rgba(120,92,72,.45)';
  g.fillRect(w * 0.55, 0, w * 0.26, h);
  g.fillRect(0, h * 0.55, w, h * 0.26);
  g.fillStyle = 'rgba(240,230,214,.78)';
  g.fillRect(w * 0.36, 0, 3, h);
  g.fillRect(w * 0.42, 0, 3, h);
  g.fillRect(0, h * 0.36, w, 3);
  g.fillRect(0, h * 0.42, w, 3);
  g.fillStyle = 'rgba(235,225,210,.35)';
  g.fillRect(w * 0.58, 0, 2, h);
  g.fillRect(0, h * 0.58, w, 2);
});

export const flagTex = tex(520, 274, (g, w, h) => {
  const sh = h / 13;
  for (let i = 0; i < 13; i++) {
    g.fillStyle = i % 2 ? '#ffffff' : '#b22234';
    g.fillRect(0, i * sh, w, sh + 1);
  }
  g.fillStyle = '#3c3b6e';
  g.fillRect(0, 0, w * 0.4, sh * 7);
  g.fillStyle = '#fff';
  for (let r = 0; r < 9; r++) {
    const n = r % 2 ? 5 : 6;
    for (let c = 0; c < n; c++) {
      const x = (r % 2 ? (c + 1) * 2 : c * 2 + 1) * ((w * 0.4) / 12);
      const y = (r + 1) * ((sh * 7) / 10);
      g.fillRect(x - 2, y - 2, 4, 4);
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
  const t = tex(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
  });
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}








































































































































































































































































































































































































































































































































































































































































































































































































































































































































n

































n









































































n





























n









































n
































n




















n













n



n




















n



n









n






n



n





n



n

n









n



n









n


n





n



n








n




n


n


n



n



n



n


n



n


n



n


n








n


n



n


n


n



n


n



n


n


n


n



n


n



n



n


n



n


"}]} ivoq to=functions.push_files  arjson{