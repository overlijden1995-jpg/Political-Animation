/**
 * Shared font plumbing for build-side deck tools (audit + still renderer).
 *
 * Loads the real TTFs from `public/` once and exposes:
 *   • `deckMeasure` — a text measurer identical in behaviour to the browser's,
 *     backed by actual glyph advances
 *   • `satoriFonts` — the same faces for headless SVG/PNG rendering
 */

import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';
import type { Font } from 'opentype.js';
import type { Measure } from '../../src/slides/measure';

export const ROOT = path.resolve(__dirname, '..', '..');
export const FONT_DIR = path.join(ROOT, 'public', 'bad-actors', 'fonts');

export interface DeckFontFile {
  family: string;
  weight: number;
  style: 'normal' | 'italic';
  file: string;
}

export const DECK_FONT_FILES: DeckFontFile[] = [
  { family: 'League Spartan', weight: 900, style: 'normal', file: 'LeagueSpartan_900Black.ttf' },
  { family: 'League Spartan', weight: 700, style: 'normal', file: 'LeagueSpartan_700Bold.ttf' },
  { family: 'Anton', weight: 400, style: 'normal', file: 'Anton_400Regular.ttf' },
  { family: 'Archivo Black', weight: 400, style: 'normal', file: 'ArchivoBlack_400Regular.ttf' },
  { family: 'IBM Plex Mono', weight: 500, style: 'normal', file: 'IBMPlexMono_500Medium.ttf' },
  { family: 'IBM Plex Mono', weight: 700, style: 'normal', file: 'IBMPlexMono_700Bold.ttf' },
  { family: 'Plus Jakarta Sans', weight: 500, style: 'normal', file: 'PlusJakartaSans_500Medium.ttf' },
  { family: 'Plus Jakarta Sans', weight: 700, style: 'normal', file: 'PlusJakartaSans_700Bold.ttf' },
  { family: 'Plus Jakarta Sans', weight: 800, style: 'normal', file: 'PlusJakartaSans_800ExtraBold.ttf' },
  { family: 'Libre Baskerville', weight: 400, style: 'normal', file: 'LibreBaskerville_400Regular.ttf' },
  { family: 'Libre Baskerville', weight: 400, style: 'italic', file: 'LibreBaskerville_400Regular_Italic.ttf' },
  { family: 'Libre Baskerville', weight: 700, style: 'normal', file: 'LibreBaskerville_700Bold.ttf' },
  { family: 'Instrument Serif', weight: 400, style: 'italic', file: 'InstrumentSerif_400Regular_Italic.ttf' },
  { family: 'Space Grotesk', weight: 500, style: 'normal', file: 'SpaceGrotesk_500Medium.ttf' },
];

const parsed = new Map<string, Font>();

export const fontData = (file: string): Buffer => fs.readFileSync(path.join(FONT_DIR, file));

const load = (file: string): Font => {
  const hit = parsed.get(file);
  if (hit) return hit;
  const buffer = fontData(file);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const font = opentype.parse(arrayBuffer as ArrayBuffer);
  parsed.set(file, font);
  return font;
};

const pick = (family: string, weight: number, style: 'normal' | 'italic' = 'normal'): Font => {
  const name = family.replace(/"/g, '').split(',')[0].trim();
  const sameFamily = DECK_FONT_FILES.filter((f) => f.family === name);
  const pool = sameFamily.filter((f) => f.style === style);
  const candidates = pool.length ? pool : sameFamily;
  if (!candidates.length) throw new Error(`No deck font registered for "${family}"`);
  const sorted = [...candidates].sort((a, b) => Math.abs(a.weight - weight) - Math.abs(b.weight - weight));
  return load(sorted[0].file);
};

/** Kerning is approximated with a small safety factor so fits err on the tight side. */
const KERN_SAFETY = 1.012;

export const advanceWidth = (font: Font, text: string, size: number): number => {
  const upm = font.unitsPerEm || 1000;
  let total = 0;
  for (const char of text) {
    const glyph = font.charToGlyph(char);
    total += glyph.advanceWidth ?? 0;
  }
  return (total / upm) * size * KERN_SAFETY;
};

export const deckMeasure: Measure = (text, family, weight, size, letterSpacing) =>
  advanceWidth(pick(family, weight), text, size) + letterSpacing * Math.max(text.length - 1, 0);

export const italicMeasure = (text: string, size: number): number =>
  advanceWidth(pick('Libre Baskerville', 400, 'italic'), text, size);

/** All faces, ready for satori. */
export const satoriFonts = () =>
  DECK_FONT_FILES.map((face) => ({
    name: face.family,
    data: fontData(face.file),
    weight: face.weight as 400 | 500 | 700 | 800 | 900,
    style: face.style,
  }));
