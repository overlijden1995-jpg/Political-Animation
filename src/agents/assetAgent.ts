import * as fs from 'fs';
import * as path from 'path';
import type { Script, AssetManifest } from './types';
const ASSETS_DIR = path.join(process.cwd(), 'assets');

/**
 * Generate per-scene image prompts for an image provider (Midjourney, DALL-E,
 * Stable Diffusion). Writes placeholder SVGs so the composition renders
 * correctly offline, then swaps in real images when they appear in
 * assets/generated/<runId>/<sceneId>.png.
 */
export const generateAssets = (script: Script, opts: { runId?: string } = {}): AssetManifest => {
  const runId = opts.runId ?? `run-${Date.now()}`;
  const runDir = path.join(ASSETS_DIR, 'generated', runId);
  fs.mkdirSync(runDir, { recursive: true });

  const style = 'Kurzgesagt-inspired flat vector illustration, comic-strip hand-drawn ink outlines, warm paper texture, muted saturated palette, US politics explainer, no text, no letters, no words';

  const assets = script.scenes.map((scene) => {
    const prompt = `${style}. Scene: ${scene.label}. ${scene.narration}`;
    const placeholder = path.join(runDir, `${scene.id}.svg`);
    const color = scene.background ?? '#F7F5EE';
    // Simple placeholder: labeled paper card with a hand-drawn border
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" font-family="system-ui" font-size="40" fill="#1F1A14" text-anchor="middle" dy=".3em">${scene.label}</text></svg>`;
    fs.writeFileSync(placeholder, svg);

    return {
      sceneId: scene.id,
      kind: 'illustration' as const,
      prompt,
      path: placeholder,
    };
  });

  const manifest: AssetManifest = { scriptId: script.title, assets };
  fs.writeFileSync(path.join(ASSETS_DIR, `manifest-${runId}.json`), JSON.stringify(manifest, null, 2));
  console.log(`[assetAgent] ${assets.length} placeholder assets written to ${runDir}`);
  return manifest;
};
