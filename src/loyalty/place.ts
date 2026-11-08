import { width, type FaceKey } from './measure';

/**
 * Deterministic label placement for scatter plates.
 *
 * Diagram labels are not decorative: an unreadable label is a wrong label. This
 * routine tries a fixed ring of candidate offsets around each point, scores them
 * against everything already placed (dots, labels, frame edges) and takes the
 * best. No randomness, no iteration to convergence — same input, same picture.
 */

export interface Dot {
  x: number;
  y: number;
  r: number;
}

export interface PlacedLabel {
  id: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  w: number;
  h: number;
}

const CANDIDATES: Array<{ dx: number; dy: number; anchor: 'start' | 'middle' | 'end' }> = [
  { dx: 12, dy: 4, anchor: 'start' },
  { dx: -12, dy: 4, anchor: 'end' },
  { dx: 0, dy: -13, anchor: 'middle' },
  { dx: 0, dy: 16, anchor: 'middle' },
  { dx: 12, dy: -10, anchor: 'start' },
  { dx: -12, dy: -10, anchor: 'end' },
  { dx: 12, dy: 16, anchor: 'start' },
  { dx: -12, dy: 16, anchor: 'end' },
  { dx: 0, dy: -26, anchor: 'middle' },
  { dx: 0, dy: 29, anchor: 'middle' },
  { dx: 20, dy: 0, anchor: 'start' },
  { dx: -20, dy: 0, anchor: 'end' },
  { dx: 26, dy: -18, anchor: 'start' },
  { dx: -26, dy: -18, anchor: 'end' },
  { dx: 26, dy: 22, anchor: 'start' },
  { dx: -26, dy: 22, anchor: 'end' },
  { dx: 0, dy: -40, anchor: 'middle' },
  { dx: 0, dy: 44, anchor: 'middle' },
];

const boxOf = (x: number, y: number, anchor: 'start' | 'middle' | 'end', w: number, h: number) => {
  const left = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
  return { l: left, r: left + w, t: y - h * 0.8, b: y + h * 0.25 };
};

const overlap = (a: ReturnType<typeof boxOf>, b: ReturnType<typeof boxOf>) => {
  const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l);
  const oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
  return ox > 0 && oy > 0 ? ox * oy : 0;
};

export const placeLabels = (
  items: Array<{
    id: string;
    x: number;
    y: number;
    text: string;
    size: number;
    face?: FaceKey;
    /** preferred outward direction (unit vector) — used by radial diagrams */
    u?: { x: number; y: number };
    /** offsets tried before the shared ring — for crowd scenes, "up and left" */
    prefer?: Array<{ dx: number; dy: number; anchor: 'start' | 'middle' | 'end' }>;
  }>,
  opts: {
    dots: Dot[];
    frame: { l: number; r: number; t: number; b: number };
    /** Rectangles that are already occupied (quadrant captions, callouts). */
    blocks?: Array<{ l: number; r: number; t: number; b: number }>;
  },
): Record<string, PlacedLabel> => {
  const out: Record<string, PlacedLabel> = {};
  const placedBoxes: Array<ReturnType<typeof boxOf>> = [];

  const items2 = items.map((it) => ({ ...it, w: width(it.text, it.face ?? 'mono700', it.size, 0.9), h: it.size }));

  items2.forEach((it) => {
    let best: { score: number; c: (typeof CANDIDATES)[number] } | null = null;
    // radial candidates first when the caller knows which way is "out"
    const radial: Array<{ dx: number; dy: number; anchor: 'start' | 'middle' | 'end' }> = it.u
      ? [16, 30, 46, 62].map((d) => ({
          dx: it.u!.x * d,
          dy: it.u!.y * d + 3.2,
          anchor: (it.u!.x > 0.45 ? 'start' : it.u!.x < -0.45 ? 'end' : 'middle') as 'start' | 'middle' | 'end',
        }))
      : [];
    [...(it.prefer ?? []), ...radial, ...CANDIDATES].forEach((c, ci) => {
      const lx = it.x + c.dx;
      const ly = it.y + c.dy;
      const box = boxOf(lx, ly, c.anchor, it.w, it.h);
      let score = ci * 0.35; // prefer the earliest candidate
      // must stay inside the drawing frame
      if (box.l < opts.frame.l || box.r > opts.frame.r || box.t < opts.frame.t || box.b > opts.frame.b) score += 900;
      // never sit on a dot
      opts.dots.forEach((d) => {
        const db = boxOf(d.x, d.y, 'middle', d.r * 2, d.r * 2);
        const o = overlap(box, db);
        if (o > 0) score += 260 + o * 0.4;
      });
      // never sit on another label
      placedBoxes.forEach((pb) => {
        const o = overlap(box, pb);
        if (o > 0) score += 320 + o * 0.5;
      });
      // never sit on a caption block
      (opts.blocks ?? []).forEach((b) => {
        const o = overlap(box, b);
        if (o > 0) score += 700 + o * 0.6;
      });
      // prefer living above/right of the dot very slightly
      if (!best || score < best.score) best = { score, c };
    });
    const c = (best as unknown as { c: (typeof CANDIDATES)[number] }).c;
    const lx = it.x + c.dx;
    const ly = it.y + c.dy;
    out[it.id] = { id: it.id, x: lx, y: ly, anchor: c.anchor, w: it.w, h: it.h };
    placedBoxes.push(boxOf(lx, ly, c.anchor, it.w, it.h));
  });

  return out;
};
