#!/usr/bin/env tsx
/**
 * Render the slide deck to a crisp MP4.
 *
 * Defaults are chosen for *text sharpness*, not file size:
 *   • 2× supersampling  — every hairline lands on a real pixel
 *   • PNG frames        — no JPEG ringing around letterforms
 *   • CRF 10 + slow     — near-lossless h.264 at 1080p
 *   • bt709, yuv420p    — plays everywhere, correct colour on projectors
 *
 *   npx tsx scripts/render_deck.ts                        # full episode
 *   npx tsx scripts/render_deck.ts --scale 3 --crf 8      # master quality
 *   npx tsx scripts/render_deck.ts --still 7              # one page → PNG
 *   npx tsx scripts/render_deck.ts --frames 0-300 --out out/opening.mp4
 */

import { execSync } from 'child_process';
import * as path from 'path';

const args = process.argv.slice(2);
const getFlag = (name: string): string | undefined => {
  const eq = args.find((a) => a.startsWith(`--${name}=`))?.slice(`--${name}=`.length);
  if (eq !== undefined) return eq;
  const idx = args.indexOf(`--${name}`);
  return idx === -1 ? undefined : args[idx + 1];
};

const entry = 'src/index.ts';
const compositionId = 'BadActorsJDVance';
const output = getFlag('out') ?? path.join('episodes', 'bad-actors-ep01-jd-vance-deck.mp4');
const scale = getFlag('scale') ?? '2';
const crf = getFlag('crf') ?? '10';
const frames = getFlag('frames');
const still = getFlag('still');

const run = (command: string) => {
  console.log(`$ ${command}`);
  execSync(command, { stdio: 'inherit' });
};

try {
  if (still) {
    // Single-page proof at full supersample — handy for review decks.
    const frame = Math.max(0, Math.round(Number.parseFloat(still) * 30));
    const target = output.endsWith('.png') ? output : path.join('out', 'stills', `${still}.png`);
    run(
      `npx remotion still ${entry} ${compositionId} ${target} --frame=${frame} --scale=${scale} --image-format=png --log=error`,
    );
    console.log(`\nStill written: ${target}`);
  } else {
    const flags = [
      `--scale=${scale}`,
      `--crf=${crf}`,
      '--codec=h264',
      '--image-format=png',
      '--pixel-format=yuv420p',
      '--color-space=bt709',
      '--x264-preset=slow',
      '--concurrency=4',
      '--log=error',
    ];
    if (frames) flags.push(`--frames=${frames}`);
    run(`npx remotion render ${entry} ${compositionId} ${output} ${flags.join(' ')}`);
    console.log(`\nRender complete: ${output}`);
  }
} catch (error) {
  console.error('Render failed:', (error as Error).message);
  console.error('Remotion needs a local Chrome/ffmpeg. Run `npx remotion browser ensure` and install ffmpeg.');
  process.exit(1);
}
