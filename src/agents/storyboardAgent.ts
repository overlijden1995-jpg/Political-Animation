import * as fs from 'fs';
import * as path from 'path';
import type { PipelineType, Script, Storyboard, SceneVisuals, ScriptScene } from './types';
import { PIPELINES } from './pipelineConfig';

const REGIONS: string[] = ['west', 'mountain', 'midwest', 'south', 'northeast', 'texas', 'florida'];
let regionCursor = 0;

/** Extract the first meaningful number from narration for chart data. */
const firstNumber = (text: string): number | null => {
  const m = text.match(/\b(\d{2,}(?:\.\d+)?(?: million| billion| thousand)?)\b/);
  if (!m) return null;
  let n = Number(m[1].replace(/(million|billion|thousand)/g, ''));
  if (/million/.test(m[0])) n *= 1e6;
  if (/billion/.test(m[0])) n *= 1e9;
  if (/thousand/.test(m[0])) n *= 1e3;
  return n;
};

/** Heuristic visual direction from narration text. */
const visualsFor = (scene: { narration: string; label: string }, index: number, total: number): SceneVisuals => {
  const n = scene.narration.toLowerCase();
  const v: SceneVisuals = {};

  // Character emotion
  if (index === total - 1) v.character = { emotion: 'happy' };
  else if (/shock|unbelievable|crazy|insane|wow/.test(n)) v.character = { emotion: 'shocked' };
  else if (/problem|crisis|wrong|broken|fail/.test(n)) v.character = { emotion: 'worried' };
  else v.character = { emotion: 'neutral' };

  // Map for geography-heavy narration
  if (/\b(state|states|map|nation|country|swing|pennsylvania|michigan|wisconsin|arizona|georgia|nevada)\b/.test(n)) {
    v.mapRegion = REGIONS[regionCursor++ % REGIONS.length];
  }

  // Chart when numbers or comparisons appear
  const num = firstNumber(scene.narration);
  if (num != null && (/vote|elector|popular|million|billion|percent|%/.test(n) || scene.label.toLowerCase().includes('number'))) {
    v.chart = {
      maxValue: Math.max(num * 1.5, 100),
      data: [
        { label: scene.label, value: num, color: '#0F62FE' },
        { label: 'Remaining', value: Math.max(Math.floor(num * 0.5), 10), color: '#C9D6EA' },
      ],
    };
  }

  // Speech bubble for confusion / reaction moments
  if (/\b(wait|what|how\b|why\b|really)\b/.test(n) && index % 3 === 0) {
    v.speech = 'Wait — really?';
  }

  // Lower third on definitional scenes
  if (/basics|magic number|winner|swing|reform|how|what/.test(scene.label.toLowerCase())) {
    v.lowerThird = { name: scene.label, role: scene.narration.slice(0, 60) };
  }

  return v;
};

export const storyboard = (script: Script): Storyboard => {
  const scenes = script.scenes.map((scene, i) =>
    ({
      ...scene,
      visuals: visualsFor(scene, i, script.scenes.length),
      requiredAssets: [] as string[],
      imagePrompts: [] as string[],
    }) as ScriptScene & { requiredAssets: string[]; imagePrompts: string[] }
  );

  const storyboard: Storyboard = { ...script, scenes };

  const runDir = path.join(process.cwd(), 'runs', `storyboard-${Date.now()}`);
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, 'storyboard.json'), JSON.stringify(storyboard, null, 2));
  return storyboard;
};
