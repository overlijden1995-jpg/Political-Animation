#!/usr/bin/env tsx
/**
 * Render a Remotion composition to MP4.
 *
 *   npx tsx scripts/render.ts ShortsPlayer out/demo.mp4
 *   npx tsx scripts/render.ts LongFormPlayer out/demo.mp4 --props runs/run-123/script.json --audio runs/run-123/voiceover.wav --frames 5400
 *   npx tsx scripts/render.ts Article2026Midterms out/sample.mp4 --frames 0-89 --scale 0.5
 *
 * Toolchain notes
 * ---------------
 * `npm run setup` resolves ffmpeg and a Chromium build for this machine and
 * writes `.render-env.json`; this wrapper picks both up automatically, so no
 * global installs or PATH tweaks are needed. Environment overrides win:
 *
 *   REMOTION_BROWSER_EXECUTABLE  path to your own Chrome/Chromium
 *   LD_LIBRARY_PATH              extra shared libraries for Chromium (Linux)
 *   FFMPEG_PATH / FFPROBE_PATH   explicit ffmpeg binaries
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ENV_FILE = path.join(ROOT, '.render-env.json');

interface RenderEnv {
  ffmpeg?: string | null;
  ffprobe?: string | null;
  browserExecutable?: string | null;
  libraryPath?: string | null;
}

const readRenderEnv = (): RenderEnv => {
  try {
    return JSON.parse(fs.readFileSync(ENV_FILE, 'utf8')) as RenderEnv;
  } catch {
    return {};
  }
};

const usage = () => {
  console.error(
    [
      'Usage: npx tsx scripts/render.ts <CompositionId> <output.mp4> [options]',
      '',
      'Options:',
      '  --props <file>              JSON props for the composition',
      '  --audio <file>              audio track to mux in',
      '  --frames <start>-<end>      render a frame range (e.g. 0-89)',
      '  --scale <n>                 render at a fraction of the resolution (e.g. 0.5)',
      '  --concurrency <n>           parallel browser tabs',
      '  --image-format <jpeg|png>   frame screenshot format (default jpeg)',
      '  --codec <h264|h265|vp8|vp9|prores|gif>',
      '  --crf <n>                   constant rate factor (quality)',
      '  --browser-executable <path> Chrome/Chromium to use for this render',
      '  --chrome-mode <mode>        headless-shell | chrome-for-testing',
      '  --log <level>               verbose | info | warn | error',
    ].join('\n'),
  );
};

const argv = process.argv.slice(2);
const [compositionId, output] = argv;

const getFlag = (name: string): string | undefined => {
  const eq = argv.find((a) => a.startsWith(`--${name}=`))?.slice(`--${name}=`.length);
  if (eq !== undefined) return eq;
  const idx = argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  const next = argv[idx + 1];
  return next && !next.startsWith('--') ? next : undefined;
};

if (!compositionId || !output || compositionId === '--help' || compositionId === '-h') {
  usage();
  process.exit(compositionId ? 0 : 1);
}

const env = readRenderEnv();
const imageFormat = getFlag('image-format') ?? 'jpeg';
const propsArg = getFlag('props');
const audioArg = getFlag('audio');
const framesArg = getFlag('frames');
const scaleArg = getFlag('scale');
const concurrencyArg = getFlag('concurrency');
const codecArg = getFlag('codec');
const crfArg = getFlag('crf');
const chromeModeArg = getFlag('chrome-mode');
const logArg = getFlag('log');

const browserExecutable =
  getFlag('browser-executable') ?? process.env.REMOTION_BROWSER_EXECUTABLE ?? env.browserExecutable ?? undefined;

const libraryPath = env.libraryPath ?? undefined;

const remotionArgs = ['remotion', 'render', 'src/index.tsx', compositionId, output, `--image-format=${imageFormat}`];

if (propsArg) remotionArgs.push(`--props=${propsArg}`);
if (audioArg) remotionArgs.push(`--audio=${audioArg}`);
if (framesArg) remotionArgs.push(`--frames=${framesArg}`);
if (scaleArg) remotionArgs.push(`--scale=${scaleArg}`);
if (concurrencyArg) remotionArgs.push(`--concurrency=${concurrencyArg}`);
if (codecArg) remotionArgs.push(`--codec=${codecArg}`);
if (crfArg) remotionArgs.push(`--crf=${crfArg}`);
if (chromeModeArg) remotionArgs.push(`--chrome-mode=${chromeModeArg}`);
if (logArg) remotionArgs.push(`--log=${logArg}`);
if (browserExecutable) remotionArgs.push(`--browser-executable=${browserExecutable}`);

for (const [flag, file] of [
  ['props', propsArg],
  ['audio', audioArg],
] as const) {
  if (file && !fs.existsSync(path.resolve(ROOT, file))) {
    console.error(`Input for --${flag} does not exist: ${file}`);
    process.exit(1);
  }
}

fs.mkdirSync(path.dirname(path.resolve(ROOT, output)), { recursive: true });

const binDir = path.join(ROOT, 'node_modules', '.bin');
const prepend = (key: string, value: string, existing = process.env[key]) =>
  existing ? `${value}:${existing}` : value;

const childEnv: NodeJS.ProcessEnv = {
  ...process.env,
  PATH: prepend('PATH', binDir),
};
if (libraryPath) childEnv.LD_LIBRARY_PATH = prepend('LD_LIBRARY_PATH', libraryPath);
if (env.ffmpeg && path.isAbsolute(env.ffmpeg)) childEnv.PATH = prepend('PATH', path.dirname(env.ffmpeg), childEnv.PATH);

console.log(`$ ${[process.execPath, path.join(ROOT, 'node_modules', '.bin', 'remotion'), ...remotionArgs.slice(1)].join(' ')}`);
if (browserExecutable) console.log(`  browser: ${browserExecutable}`);
if (env.ffmpeg) console.log(`  ffmpeg:  ${env.ffmpeg}`);

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(npx, remotionArgs, { cwd: ROOT, env: childEnv, stdio: 'inherit' });

if (result.error) {
  console.error(`\nCould not start Remotion: ${result.error.message}`);
  console.error('Run `npm install` first, then `npm run setup`.');
  process.exit(1);
}

if (result.status !== 0) {
  console.error('\nRender failed.');
  console.error('If the error mentions a browser or ffmpeg, run `npm run setup` (or `npm run doctor`) to repair the toolchain.');
  process.exit(result.status ?? 1);
}

const rendered = path.resolve(ROOT, output);
const size = fs.existsSync(rendered) ? fs.statSync(rendered).size : 0;
console.log(`\nRender complete: ${output} (${(size / 1e6).toFixed(2)} MB)`);
