/**
 * Hand-drawn stroke helpers. Comic art is rarely a perfect rect or line — these
 * generate wiggly SVG paths that look inked by hand, with controllable roughness.
 */

const TAU = Math.PI * 2;

/** Pseudo-random number in [-1, 1], stable per seed. */
const noise = (seed: number, t: number) => {
  const x = Math.sin(seed * 137.5 + t * 12.9898) * 43758.5453123;
  return x - Math.floor(x);
};

/** Jitter a point by a small pseudo-random offset. */
const jitterPt = (x: number, y: number, seed: number, t: number, amount: number) => [
  x + noise(seed + 1, t) * amount,
  y + noise(seed + 2, t) * amount,
];

/**
 * Draw a hand-drawn rect path. Instead of 4 straight lines we draw 4 wiggly
 * strokes that don't quite meet at the corners — the essence of comic inking.
 */
export const handRect = (
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { roughness?: number; seed?: number; close?: boolean } = {},
): string => {
  const { roughness = 1.2, seed = 0, close = true } = opts;
  const r = roughness;
  const t = seed * 0.01;

  const tl = jitterPt(x, y, seed, t, r);
  const tr = jitterPt(x + w, y, seed, t, r);
  const br = jitterPt(x + w, y + h, seed, t, r);
  const bl = jitterPt(x, y + h, seed, t, r);

  // Slightly overshoot corners so lines don't cleanly join
  const path = [
    `M ${tl[0].toFixed(2)} ${tl[1].toFixed(2)}`,
    `L ${tr[0].toFixed(2)} ${tr[1].toFixed(2)}`,
    `L ${br[0].toFixed(2)} ${br[1].toFixed(2)}`,
    `L ${bl[0].toFixed(2)} ${bl[1].toFixed(2)}`,
  ];

  if (close) path.push('Z');
  return path.join(' ');
};

/**
 * Draw a hand-drawn line between two points with a slight arc/wobble.
 */
export const handLine = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  opts: { roughness?: number; seed?: number; bow?: number } = {},
): string => {
  const { roughness = 1.2, seed = 0, bow = 0 } = opts;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const perpX = -dy;
  const perpY = dx;
  const len = Math.hypot(dx, dy) || 1;
  const bowOffset = bow * len;
  const t = seed * 0.01;

  const c1 = jitterPt(mx + (perpX / len) * bowOffset, my + (perpY / len) * bowOffset, seed + 3, t, roughness);
  const c2 = jitterPt(mx - (perpX / len) * bowOffset * 0.5, my - (perpY / len) * bowOffset * 0.5, seed + 7, t, roughness);

  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} C ${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

/**
 * A comic-style "speed / emphasis line" — short tapered ink stroke.
 */
export const emphasisLine = (cx: number, cy: number, angle: number, len = 24, seed = 0): string => {
  const x2 = cx + Math.cos(angle) * len;
  const y2 = cy + Math.sin(angle) * len;
  return handLine(cx, cy, x2, y2, { roughness: 1.6, seed, bow: 0 });
};

/**
 * Rough circle / ellipse (hand-drawn "O", "dizzy" symbol, etc).
 */
export const handCircle = (cx: number, cy: number, r: number, opts: { roughness?: number; seed?: number } = {}): string => {
  const { roughness = 2, seed = 0 } = opts;
  const pts: string[] = [];
  const segments = 8;
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * TAU;
    const jitterR = r + noise(seed + i, seed * 0.1) * roughness * 2;
    const [x, y] = jitterPt(cx + Math.cos(a) * jitterR, cy + Math.sin(a) * jitterR, seed + i, seed * 0.1, roughness);
    pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  pts.push('Z');
  return pts.join(' ');
};
