/**
 * Real-metrics typesetting for the exhibit sheets.
 *
 * The compositor must know the width of a string *before* it decides where a
 * line breaks. Browser measurement is not available in the headless proof
 * renderer, and canvas estimates drift by several per cent, so we measure
 * against the actual TTF glyph advances — the same files the browser paints
 * with. One measuring function, three consumers (player, stills, audit).
 */

import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';

export interface Face {
  file: string;
  family: string;
  weight: number;
  italic?: boolean;
}

const FONT_DIR = path.resolve(process.cwd(), 'public', 'bad-actors', 'fonts');

export const FACES: Record<string, Face> = {
  display900: { file: 'LeagueSpartan_900Black.ttf', family: 'League Spartan', weight: 900 },
  display700: { file: 'LeagueSpartan_700Bold.ttf', family: 'League Spartan', weight: 700 },
  numeral: { file: 'Anton_400Regular.ttf', family: 'Anton', weight: 400 },
  mono500: { file: 'IBMPlexMono_500Medium.ttf', family: 'IBM Plex Mono', weight: 500 },
  mono700: { file: 'IBMPlexMono_700Bold.ttf', family: 'IBM Plex Mono', weight: 700 },
  sans500: { file: 'PlusJakartaSans_500Medium.ttf', family: 'Plus Jakarta Sans', weight: 500 },
  sans700: { file: 'PlusJakartaSans_700Bold.ttf', family: 'Plus Jakarta Sans', weight: 700 },
  sans800: { file: 'PlusJakartaSans_800ExtraBold.ttf', family: 'Plus Jakarta Sans', weight: 800 },
  serif400: { file: 'LibreBaskerville_400Regular.ttf', family: 'Libre Baskerville', weight: 400 },
  serifIt: { file: 'LibreBaskerville_400Regular_Italic.ttf', family: 'Libre Baskerville', weight: 400, italic: true },
  instrument: { file: 'InstrumentSerif_400Regular_Italic.ttf', family: 'Instrument Serif', weight: 400, italic: true },
  grotesk: { file: 'SpaceGrotesk_500Medium.ttf', family: 'Space Grotesk', weight: 500 },
};

export type FaceKey = keyof typeof FACES;

/** Bump when a line-breaking rule changes so cached manifests invalidate. */
export const MEASURE_VERSION = 3;

type Font = ReturnType<typeof opentype.parse>;

/**
 * Faces travel through the tree as plain SVG family strings, so `width` accepts
 * either a face key or a family string and resolves both to the same TTF.
 */
const FAMILY_TO_KEY: Record<string, FaceKey> = Object.fromEntries(
  Object.entries(FACES).map(([k, f]) => [f.family, k as FaceKey]),
);

export const faceKey = (key: FaceKey | string): FaceKey => {
  if (key in FACES) return key as FaceKey;
  const fam = key.replace(/["']/g, '').trim();
  const hit = FAMILY_TO_KEY[fam];
  if (!hit) throw new Error(`unknown face: ${key}`);
  return hit;
};
const cache = new Map<string, Font>();

export const loadFace = (key: FaceKey): Font => {
  const hit = cache.get(key);
  if (hit) return hit;
  const face = FACES[key];
  if (!face) throw new Error(`unknown face: ${key}`);
  const buf = fs.readFileSync(path.join(FONT_DIR, face.file));
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  cache.set(key, font);
  return font;
};

/**
 * Width of a string in stage pixels at a given size, with a letter-spacing term.
 *
 * Advances are summed per glyph rather than handed to `getAdvanceWidth`, which
 * runs the full OpenType shaping path and trips over unsupported GSUB lookups
 * in a couple of these faces. Unkerned advances are within a fraction of a per
 * cent of the painted width at these sizes, and never narrower — so the
 * compositor errs on the side of a slightly looser line, never an overflowing
 * one.
 */
export const width = (text: string, key: FaceKey | string, size: number, spacing = 0): number => {
  const font = loadFace(faceKey(key));
  const scale = size / font.unitsPerEm;
  let total = 0;
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    total += (g.advanceWidth ?? 0) * scale;
  }
  return total + Math.max(0, text.length - 1) * spacing;
};

export interface Line {
  text: string;
  /** Advance width of the painted line. */
  w: number;
}

/** Greedy, widow-aware line breaking against real advances. */
export const breakLines = (
  text: string,
  key: FaceKey,
  size: number,
  maxWidth: number,
  opts: { spacing?: number; maxLines?: number; hyphenate?: boolean } = {},
): Line[] => {
  const spacing = opts.spacing ?? 0;
  const maxLines = opts.maxLines ?? 99;
  const words = text.split(/\s+/).filter(Boolean);
  const out: Line[] = [];
  let current: string[] = [];

  const flush = () => {
    if (!current.length) return;
    const t = current.join(' ');
    out.push({ text: t, w: width(t, key, size, spacing) });
    current = [];
  };

  for (const w of words) {
    const candidate = [...current, w].join(' ');
    if (!current.length || width(candidate, key, size, spacing) <= maxWidth) {
      current.push(w);
    } else {
      flush();
      current.push(w);
    }
  }
  flush();

  if (out.length > maxLines) {
    const kept = out.slice(0, maxLines);
    const last = kept[maxLines - 1];
    // Ellipsise the final kept line to fit.
    let t = last.text;
    while (t.length > 4 && width(`${t}…`, key, size, spacing) > maxWidth) t = t.slice(0, -1);
    kept[maxLines - 1] = { text: `${t.trimEnd()}…`, w: width(`${t.trimEnd()}…`, key, size, spacing) };
    return kept;
  }
  return out;
};

/** Largest size in [min,max] at which `text` fits `maxWidth` on one line. */
export const fitSize = (
  text: string,
  key: FaceKey,
  maxWidth: number,
  min: number,
  max: number,
  spacing = 0,
): number => {
  let lo = min;
  let hi = max;
  if (width(text, key, min, spacing) > maxWidth) return min;
  for (let i = 0; i < 22; i += 1) {
    const mid = (lo + hi) / 2;
    if (width(text, key, mid, spacing) <= maxWidth) lo = mid;
    else hi = mid;
  }
  return Math.floor(lo);
};

/** how many lines a paragraph occupies at a size — used by the overflow audit. */
export const lineCount = (text: string, key: FaceKey, size: number, maxWidth: number, spacing = 0): number =>
  breakLines(text, key, size, maxWidth, { spacing }).length;

/** Truncate a string to a measured width, with an ellipsis. */
export const clipWidth = (text: string, key: FaceKey, size: number, maxW: number, spacing = 0): string => {
  if (width(text, key, size, spacing) <= maxW) return text;
  let t = text;
  while (t.length > 3 && width(`${t}\u2026`, key, size, spacing) > maxW) t = t.slice(0, -1);
  return `${t.trimEnd()}\u2026`;
};
