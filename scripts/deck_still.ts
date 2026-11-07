/**
 * Headless still renderer for the slide deck.
 *
 * Rendering a deck page needs a browser; this path does not. It turns the same
 * React tree into SVG through satori and rasterises it with resvg, so a
 * producer (or CI) can eyeball every page as a PNG without launching Chrome.
 *
 * It is a *proofing* tool: satori implements a subset of CSS, so drop shadows
 * and some background tricks are approximated. Geometry, type sizes, line
 * breaks and photo placement are the real ones.
 *
 * Usage:
 *   npm run deck:still             # every page → out/stills/
 *   npm run deck:still -- 3 7      # specific pages (1-based)
 */

import * as React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { BAD_ACTORS_EP01_JD_VANCE } from '../src/data/badActorsJDVance';
import { compileDeck, type DeckPage } from '../src/slides/deck';
import { DeckCanvas } from '../src/slides/DeckStage';
import { setMeasureOverride } from '../src/slides/measure';
import { buildRoot } from './lib/stillBuild';
import { deckMeasure, ROOT, satoriFonts } from './lib/deckFonts';

// Photos resolve against public/ and are inlined, since satori cannot read
// filesystem paths. Fonts are handed over separately.
(globalThis as unknown as { __deckAssetResolver: (p: string) => string }).__deckAssetResolver = (p) => {
  const file = path.join(ROOT, 'public', p);
  const mime = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
};
setMeasureOverride(deckMeasure);

const OUT_DIR = path.join(ROOT, 'out', 'stills');

type Node = React.ReactElement | string | number | null | undefined | Node[];

/**
 * Satori insists that every <div> declares its display. Our slides are
 * absolutely-positioned print layout, so mapping "stacked children" to a
 * column flex box and "text children" to a wrapping row reproduces block flow
 * closely enough for proofing.
 */
const renderPage = async (page: DeckPage, index: number): Promise<string> => {
  // Sample a moment where entrance animation has settled and narration is live.
  const span = page.end - page.start;
  const time = page.start + Math.min(1.6, span * 0.45);
  const element = React.createElement(DeckCanvas, { deck, time, showCaptions: true });
  const svg = await satori(buildRoot(element, 1920, 1080), {
    width: 1920,
    height: 1080,
    fonts: satoriFonts(),
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1920 } }).render().asPng();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${String(index + 1).padStart(2, '0')}-${page.id}.png`);
  fs.writeFileSync(file, png);
  return file;
};

const deck = compileDeck(BAD_ACTORS_EP01_JD_VANCE);

const requested = process.argv.slice(2).map((n) => Number.parseInt(n, 10)).filter(Number.isFinite);
const selection = requested.length
  ? deck.pages.filter((_, i) => requested.includes(i + 1))
  : deck.pages;

const main = async () => {
  for (const page of selection) {
    const index = deck.pages.indexOf(page);
    const file = await renderPage(page, index);
    console.log(`${String(index + 1).padStart(2, '0')}  ${page.kind.padEnd(8)} ${page.id.padEnd(30)} → ${path.relative(ROOT, file)}`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
