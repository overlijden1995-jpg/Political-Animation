import * as fs from 'fs';
import * as path from 'path';
import type { Script, CaptionManifest, CaptionWord } from './types';

const RUNS_DIR = path.join(process.cwd(), 'runs');

/**
 * Turn narration into word-level captions. Words are distributed evenly across
 * each scene. If an aligned transcript (e.g. Whisper) is available later, this
 * step can be replaced with word timestamps from the audio.
 */
export const generateCaptions = (script: Script, opts: { runId?: string } = {}): CaptionManifest => {
  const runId = opts.runId ?? `run-${Date.now()}`;
  const runDir = path.join(RUNS_DIR, runId);
  fs.mkdirSync(runDir, { recursive: true });

  const words: CaptionWord[] = [];
  script.scenes.forEach((scene) => {
    const tokens = scene.narration.split(/\s+/).filter(Boolean);
    const duration = scene.end - scene.start;
    const perWord = duration / Math.max(tokens.length, 1);
    tokens.forEach((text, i) => {
      words.push({ text, start: scene.start + i * perWord, end: scene.start + (i + 1) * perWord });
    });
  });

  const manifest: CaptionManifest = { scriptId: script.title, words };
  fs.writeFileSync(path.join(runDir, 'captions.json'), JSON.stringify(manifest, null, 2));
  console.log(`[captionAgent] ${words.length} caption words written`);
  return manifest;
};
