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
  g.fillStyle = '#bba998';
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
      g.fillStyle = `rgb(${118 + ((v * 40) | 0)},${50 + ((v * 22) | 0)},${40 + ((v * 16) | 0)})`;
      g.fillRect(x, y, bw - 4, bh - 4);
    }
  }
  speckle(g, w, h, 1400, 0.1);
});

export const concreteTex = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#cfc9bd';
  g.fillRect(0, 0, w, h);
  speckle(g, w, h, 2500, 0.07);
  g.fillStyle = '#aaa397';
  g.fillRect(0, 0, w, 3);
  g.fillRect(0, 0, 3, h);
});

export const grassTex = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#5f9040';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 5000; i++) {
    const v = rnd();
    g.fillStyle = `rgba(${60 + ((v * 50) | 0)},${120 + ((v * 60) | 0)},${40 + ((v * 30) | 0)},.55)`;
    g.fillRect(rnd() * w, rnd() * h, 2, 4);
  }
});

export const asphaltTex = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#3b3d42';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 3500; i++) {
    const v = (rnd() * 60) | 0;
    g.fillStyle = `rgb(${50 + v},${52 + v},${56 + v})`;
    g.fillRect(rnd() * w, rnd() * h, 2, 2);
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
  speckle(g, w, h, 300, 0.05);
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
