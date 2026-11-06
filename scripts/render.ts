#!/usr/bin/env tsx
/**
 * Render a Remotion composition to MP4.
 *
 *   npx tsx scripts/render.ts ShortsPlayer out/demo.mp4
 *   npx tsx scripts/render.ts LongFormPlayer out/demo.mp4 --props runs/run-123/script.json --audio runs/run-123/voiceover.wav --frames 5400
 *
 * Requires ffmpeg on PATH (Remotion encodes video with it).
 */

import { execSync } from 'child_process';

const args = process.argv.slice(2);
const [compositionId, output] = args;

const getFlag = (name: string): string | undefined => {
  const eq = args.find((a) => a.startsWith(`--${name}=`))?.slice(`--${name}=`.length);
  if (eq !== undefined) return eq;
  const idx = args.indexOf(`--${name}`);
  return idx === -1 ? undefined : args[idx + 1];
};

const propsArg = getFlag('props');
const audioArg = getFlag('audio');
const framesArg = getFlag('frames');
const imageFormat = getFlag('image-format') ?? 'jpeg';

if (!compositionId || !output) {
  console.error('Usage: npx tsx scripts/render.ts <CompositionId> <output.mp4> [--props <file>] [--audio <file>] [--frames <n>] [--image-format <jpeg|png>]');
  process.exit(1);
}

const remotionArgs = [
  'render',
  'src/index.ts',
  compositionId,
  output,
  `--image-format=${imageFormat}`,
];

if (propsArg) remotionArgs.push(`--props=${propsArg}`);
if (audioArg) remotionArgs.push(`--audio=${audioArg}`);
if (framesArg) remotionArgs.push(`--frames=${framesArg}`);

console.log(`$ npx remotion ${remotionArgs.join(' ')}`);
try {
  execSync(`npx remotion ${remotionArgs.join(' ')}`, { stdio: 'inherit' });
  console.log(`\nRender complete: ${output}`);
} catch (err) {
  console.error('Render failed:', (err as Error).message);
  process.exit(1);
}
