#!/usr/bin/env node
/**
 * One-command bootstrap for the MP4 render toolchain.
 *
 *   npm run setup     # install / verify everything needed to render MP4s
 *   npm run doctor    # same checks, but never installs or downloads anything
 *
 * What it prepares:
 *   1. Node.js >= 20 and the npm dependencies (Remotion, React, tsx, ...).
 *   2. ffmpeg + ffprobe — the system binaries if present, otherwise the copy
 *      bundled with Remotion (`@remotion/compositor-<platform>`), exposed via
 *      `node_modules/.bin` so npm scripts can call `ffmpeg` directly.
 *   3. A Chromium build for Remotion to screenshot compositions with:
 *        a. `REMOTION_BROWSER_EXECUTABLE` if you point it at your own Chrome,
 *        b. Remotion's own Chrome Headless Shell (`remotion browser ensure`),
 *        c. fallback: the npm-packaged `@sparticuz/chromium` build, used when
 *           remotion.media is unreachable (locked-down sandboxes / CI).
 *      Chromium needs the NSS libraries on Linux; if they are missing the
 *      script tells you the apt/dnf command (and uses the cached copies in
 *      ~/.cache/political-animation/nss-libs when they exist).
 *   4. Optional Python helpers used by `scripts/generate_lofi.py` (numpy).
 *
 * Everything that gets downloaded lives outside the repo (npm's node_modules
 * or ~/.cache/political-animation), and the resolved paths are written to
 * `.render-env.json`, which `scripts/render.ts` reads automatically.
 *
 * Only Node built-ins are used, so this runs before `npm install` has
 * happened:  node scripts/setup.mjs
 */

import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import zlib from 'node:zlib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = path.join(os.homedir(), '.cache', 'political-animation');
const BROWSER_DIR = path.join(CACHE_DIR, 'browser');
const NSS_DIR = path.join(CACHE_DIR, 'nss-libs');
const ENV_FILE = path.join(ROOT, '.render-env.json');

const CHECK_ONLY = process.argv.includes('--check') || process.argv.includes('--doctor');
const IS_LINUX = process.platform === 'linux';
const IS_WIN = process.platform === 'win32';

/* ------------------------------------------------------------------ utils -- */

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

const step = (msg) => console.log(`\n${c.bold('▸')} ${msg}`);
const ok = (msg) => console.log(`  ${c.green('✓')} ${msg}`);
const info = (msg) => console.log(`  ${c.dim('·')} ${msg}`);
const warn = (msg) => console.log(`  ${c.yellow('!')} ${msg}`);
const fail = (msg) => console.log(`  ${c.red('✗')} ${msg}`);

const run = (cmd, args, options = {}) =>
  spawnSync(cmd, args, {cwd: ROOT, encoding: 'utf8', ...options});

const exists = (p) => {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
};

const firstLine = (s) => (s ?? '').trim().split('\n')[0]?.trim() ?? '';

const problems = [];
const record = (msg) => {
  problems.push(msg);
  return undefined;
};

/* --------------------------------------------------------------- 1. node -- */

const nodeMajor = Number(process.versions.node.split('.')[0]);
step(`Node.js ${process.versions.node} (${process.platform}/${process.arch})`);
if (nodeMajor < 20) {
  fail(`Node.js >= 20 is required (engines field). Upgrade Node and re-run.`);
  record('upgrade Node.js to >= 20');
} else {
  ok('Node.js version satisfies package.json engines (>= 20)');
}

/* ------------------------------------------------------ 2. npm dependencies -- */

step('npm dependencies (Remotion, React, tsx, ...)');
const remotionInstalled = exists(path.join(ROOT, 'node_modules', 'remotion'));
if (remotionInstalled) {
  const version = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'node_modules', 'remotion', 'package.json'), 'utf8'),
  ).version;
  ok(`installed (remotion ${version})`);
} else if (CHECK_ONLY) {
  fail('node_modules is missing — run `npm install`');
  record('npm install');
} else {
  warn('node_modules is missing — running `npm install`');
  const res = run('npm', ['install', '--no-audit', '--no-fund'], {stdio: 'inherit'});
  if (res.status === 0) {
    ok('npm install finished');
  } else {
    fail('npm install failed — see the output above');
    record('npm install');
  }
}

/* ------------------------------------------------------ 3. ffmpeg / ffprobe -- */

const linkIntoBin = (src, name) => {
  const binDir = path.join(ROOT, 'node_modules', '.bin');
  const dest = path.join(binDir, IS_WIN ? `${name}.exe` : name);
  if (!exists(binDir)) return dest;
  try {
    if (exists(dest)) fs.rmSync(dest, {force: true});
    if (IS_WIN) {
      fs.copyFileSync(src, dest);
    } else {
      fs.symlinkSync(src, dest);
    }
    if (!IS_WIN) fs.chmodSync(src, 0o755);
  } catch {
    /* non-fatal: the resolved path is exported anyway */
  }
  return dest;
};

const findBundledFfmpeg = (bin) => {
  const dirs = fs
    .readdirSync(path.join(ROOT, 'node_modules', '@remotion'))
    .filter((d) => d.startsWith('compositor-'))
    .map((d) => path.join(ROOT, 'node_modules', '@remotion', d, bin))
    .filter(exists);
  return dirs[0];
};

step('ffmpeg + ffprobe (video/audio muxing)');
let ffmpegPath = null;
let ffprobePath = null;

const systemFfmpeg = run('ffmpeg', ['-version']);
if (systemFfmpeg.status === 0) {
  ffmpegPath = 'ffmpeg';
  ffprobePath = run('ffprobe', ['-version']).status === 0 ? 'ffprobe' : null;
  ok(`system ffmpeg found — ${firstLine(systemFfmpeg.stdout).split('Copyright')[0].trim()}`);
} else {
  const bundled = remotionInstalled ? findBundledFfmpeg('ffmpeg') : undefined;
  if (bundled) {
    ffmpegPath = linkIntoBin(bundled, 'ffmpeg');
    const bundledProbe = findBundledFfmpeg('ffprobe');
    if (bundledProbe) ffprobePath = linkIntoBin(bundledProbe, 'ffprobe');
    const version = run(bundled, ['-version']);
    ok(`no system ffmpeg — using Remotion's bundled build`);
    info(firstLine(version.stdout).split('Copyright')[0].trim());
    info(`exposed as node_modules/.bin/ffmpeg (${path.relative(ROOT, bundled)})`);
  } else {
    fail('ffmpeg is not installed and no Remotion-bundled copy was found');
    warn('install it: apt-get install -y ffmpeg   |   brew install ffmpeg');
    record('ffmpeg');
  }
}

/* ------------------------------------------------------------- 4. browser -- */

const chromeVersion = (exe, libraryPath) => {
  const res = run(exe, ['--version'], {
    env: {...process.env, ...(libraryPath ? {LD_LIBRARY_PATH: libraryPath} : {})},
  });
  if (res.status !== 0) return null;
  return firstLine(res.stdout || res.stderr);
};

const missingSharedLibs = (exe) => {
  if (!IS_LINUX) return [];
  const res = run('ldd', [exe]);
  if (res.status !== 0) return [];
  return (res.stdout || '')
    .split('\n')
    .filter((line) => line.includes('not found'))
    .map((line) => line.trim().split(' ')[0]);
};

/** Cheap reachability probe so we never hang on a blocked download host. */
const hostReachable = async (url, timeoutMs = 6000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(url, {method: 'HEAD', signal: controller.signal, redirect: 'manual'});
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Remotion's downloader rejects asynchronously (an uncaught exception) when the
 * CDN is blocked, which would kill this script. Guard the call so a failed
 * download degrades into the npm fallback instead.
 */
const withDownloadCrashGuard = (fn, timeoutMs = 240000) =>
  new Promise((resolve, reject) => {
    const onUncaught = (err) => {
      cleanup();
      reject(err);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`download timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
    function cleanup() {
      clearTimeout(timer);
      process.off('uncaughtException', onUncaught);
    }
    process.on('uncaughtException', onUncaught);
    fn().then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (err) => {
        cleanup();
        reject(err);
      },
    );
  });

const extractSparticuz = async () => {
  const pkgJson = path.join(ROOT, 'node_modules', '@sparticuz', 'chromium', 'package.json');
  if (!exists(pkgJson)) {
    if (CHECK_ONLY) return null;
    warn('installing @sparticuz/chromium (npm fallback browser, ~70 MB)');
    const res = run(
      'npm',
      ['install', '--no-save', '--no-package-lock', '--no-audit', '--no-fund', '@sparticuz/chromium'],
      {stdio: 'inherit'},
    );
    if (res.status !== 0 || !exists(pkgJson)) return null;
  }
  const brotli = path.join(ROOT, 'node_modules', '@sparticuz', 'chromium', 'bin', 'chromium.br');
  if (!exists(brotli)) return null;

  fs.mkdirSync(BROWSER_DIR, {recursive: true});
  const out = path.join(BROWSER_DIR, IS_WIN ? 'chromium.exe' : 'chromium');
  const version = JSON.parse(fs.readFileSync(pkgJson, 'utf8')).version;
  const stamp = path.join(BROWSER_DIR, 'VERSION');
  if (exists(out) && exists(stamp) && fs.readFileSync(stamp, 'utf8').trim() === version) {
    return out;
  }
  info(`unpacking @sparticuz/chromium ${version} → ${out}`);
  const raw = zlib.brotliDecompressSync(fs.readFileSync(brotli));
  fs.writeFileSync(out, raw, {mode: 0o755});
  fs.chmodSync(out, 0o755);
  fs.writeFileSync(stamp, version);
  info(`${(raw.length / 1e6).toFixed(0)} MB unpacked`);
  return out;
};

step('Chromium (the browser Remotion screenshots with)');
let browserExecutable = null;
let libraryPath = null;

const explicit = process.env.REMOTION_BROWSER_EXECUTABLE;
if (explicit && exists(explicit)) {
  browserExecutable = explicit;
  ok(`using REMOTION_BROWSER_EXECUTABLE=${explicit}`);
} else if (explicit) {
  warn(`REMOTION_BROWSER_EXECUTABLE points at a missing file: ${explicit}`);
}

if (!browserExecutable && remotionInstalled && !CHECK_ONLY) {
  const reachable = await hostReachable('https://remotion.media/');
  if (!reachable) {
    warn('remotion.media is unreachable from this machine — skipping the official download');
    warn('falling back to the npm-packaged Chromium build');
  } else {
    try {
      const {ensureBrowser} = await import('@remotion/renderer');
      const status = await withDownloadCrashGuard(() => ensureBrowser({logLevel: 'info'}));
      if (status.type === 'user-defined-path' || status.type === 'local-puppeteer-browser') {
        browserExecutable = status.path;
        ok(`Remotion browser ready: ${status.path}`);
      } else {
        warn(`Remotion browser status: ${status.type}`);
      }
    } catch (err) {
      warn(`could not install Remotion's Chrome Headless Shell (${firstLine(err?.message ?? String(err))})`);
      warn('falling back to the npm-packaged Chromium build');
    }
  }
}

if (!browserExecutable) {
  const cached = path.join(BROWSER_DIR, 'chromium');
  if (exists(cached)) {
    browserExecutable = cached;
    ok(`using cached fallback Chromium: ${cached}`);
  } else if (!CHECK_ONLY) {
    const extracted = await extractSparticuz();
    if (extracted) {
      browserExecutable = extracted;
      ok(`fallback Chromium ready: ${extracted}`);
    }
  }
}

if (browserExecutable) {
  if (exists(path.join(NSS_DIR, 'libnss3.so'))) libraryPath = NSS_DIR;

  const missing = missingSharedLibs(browserExecutable);
  if (missing.length > 0 && libraryPath && missing.every((lib) => exists(path.join(libraryPath, lib)))) {
    /* cached libs cover every missing object — reuse them */
  } else if (missing.length > 0) {
    warn(`Chromium is missing shared libraries: ${[...new Set(missing)].join(', ')}`);
    warn('install them with:  apt-get install -y libnss3 libnspr4 libnssutil3');
    warn(`or drop the .so files into ${NSS_DIR} and re-run: npm run setup`);
    record('chromium shared libraries (libnss3 / libnspr4)');
  }

  const version = chromeVersion(browserExecutable, libraryPath);
  if (version) {
    ok(`browser responds: ${version}`);
    if (libraryPath) info(`LD_LIBRARY_PATH=${libraryPath}`);
  } else {
    fail('the browser binary could not be started (see the library warning above)');
    browserExecutable = null;
  }
} else {
  fail('no Chromium build available for Remotion');
  warn('run `npx remotion browser ensure` on a network with access to remotion.media');
  record('Chromium for Remotion');
}

/* --------------------------------------------------------------- 5. python -- */

step('Optional: Python audio helpers (scripts/generate_lofi.py)');
const python = run('python3', ['-c', 'import numpy, wave; print(numpy.__version__)']);
if (python.status === 0) {
  ok(`python3 + numpy ${python.stdout.trim()}`);
} else if (CHECK_ONLY) {
  info('numpy not installed — the lofi soundtrack generator will not run');
} else {
  info('numpy not installed — trying `pip install --user numpy`');
  let pip = run('python3', ['-m', 'pip', 'install', '--user', '--quiet', 'numpy']);
  if (pip.status !== 0 && /externally managed|PEP 668|break-system-packages/i.test(`${pip.stderr}${pip.stdout}`)) {
    pip = run('python3', [
      '-m',
      'pip',
      'install',
      '--user',
      '--quiet',
      '--break-system-packages',
      'numpy',
    ]);
  }
  if (pip.status === 0) {
    ok('numpy installed');
  } else {
    info('skipped (optional — only needed by scripts/generate_lofi.py)');
  }
}

/* --------------------------------------------------- 6. write the env file -- */

step('Render environment');
const env = {
  generatedAt: new Date().toISOString(),
  platform: `${process.platform}-${process.arch}`,
  node: process.versions.node,
  ffmpeg: ffmpegPath,
  ffprobe: ffprobePath,
  browserExecutable,
  libraryPath,
};
if (!CHECK_ONLY) {
  fs.writeFileSync(ENV_FILE, `${JSON.stringify(env, null, 2)}\n`);
  ok(`wrote ${path.relative(ROOT, ENV_FILE)} (used automatically by scripts/render.ts)`);
}
info(`browser: ${browserExecutable ?? 'unresolved'}`);
info(`ffmpeg:  ${ffmpegPath ?? 'unresolved'}`);

/* --------------------------------------------------------------- summary -- */

console.log('');
if (problems.length === 0) {
  console.log(c.green(c.bold('MP4 rendering is ready.')) + '  Try:');
  console.log('  npm run render:sample    # ~3 s smoke-test clip in out/sample.mp4');
  console.log('  npm run render:shorts    # full 9:16 short  → out/shorts.mp4');
  console.log('  npm run dev              # Remotion Studio preview');
} else {
  console.log(c.yellow(c.bold(`Setup incomplete — ${problems.length} item(s) to fix:`)));
  for (const p of problems) console.log(`  • ${p}`);
  console.log(c.dim('  Re-run `npm run setup` once the items above are resolved.'));
  if (!CHECK_ONLY) process.exitCode = 1;
}
