import * as fs from 'fs';
import * as path from 'path';
import { PIPELINES, type PipelineType } from './pipelineConfig';
import { generateScript } from './scriptAgent';
import { storyboard } from './storyboardAgent';
import { synthesizeVoice } from './voiceAgent';
import { generateAssets } from './assetAgent';
import { generateCaptions } from './captionAgent';
import type { PipelineOptions, RunManifest } from './types';

const RUNS_DIR = path.join(process.cwd(), 'runs');

/**
 * Full agentic pipeline:
 *   topic → script → storyboard → voice → assets → captions → (render)
 *
 * Each step writes a manifest under runs/<runId>/. Run with --skipRender to
 * stop before rendering, then render manually:
 *   npx remotion render src/index.tsx <CompositionId> out/<runId>.mp4 --props runs/<runId>/script.json
 */

export const runPipeline = async (
  topic: string,
  pipelineType: PipelineType,
  opts: PipelineOptions = {},
): Promise<RunManifest> => {
  const runId = opts.runId ?? `run-${Date.now()}`;
  const cfg = PIPELINES[pipelineType];
  const runDir = path.join(RUNS_DIR, runId);
  fs.mkdirSync(runDir, { recursive: true });

  const steps: RunManifest['steps'] = {} as RunManifest['steps'];

  // 1. Script
  const script = await generateScript(topic, pipelineType, { openAiKey: opts.openAiKey, runId });
  steps.script = path.join(runDir, 'script.json');

  // 2. Storyboard (visuals per scene)
  const board = storyboard(script);
  steps.storyboard = path.join(runDir, 'storyboard.json');

  // 3. Voiceover
  const voice = await synthesizeVoice(script, {
    provider: 'placeholder',
    voice: opts.voice,
    runId,
  });
  steps.voice = path.join(runDir, 'voice.json');

  // 4. Assets (image prompts + offline placeholders)
  const assets = generateAssets(script, { runId });
  steps.assets = path.join(process.cwd(), 'assets', `manifest-${runId}.json`);

  // 5. Captions
  const captions = generateCaptions(script, { runId });
  steps.captions = path.join(runDir, 'captions.json');

  const manifest: RunManifest = {
    runId,
    topic,
    pipeline: pipelineType,
    createdAt: new Date().toISOString(),
    steps,
  };
  fs.writeFileSync(path.join(runDir, 'run.json'), JSON.stringify(manifest, null, 2));

  const compId = pipelineType === 'shorts' ? 'ShortsPlayer' : 'LongFormPlayer';
  const audioPath = path.join(runDir, 'voiceover.wav');

  console.log('\n╔════════════════════════════════════════════════╗');
  console.log(`║  Pipeline complete: ${topic} (${pipelineType})`);
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`Run dir: ${runDir}`);
  console.log('\nNext — render the video:');
  console.log(`  npx remotion render src/index.tsx ${compId} out/${runId}.mp4 --props "${path.join(runDir, 'script.json')}"`);
  if (fs.existsSync(audioPath)) {
    console.log(`  # Add audio with: --audio "${audioPath}"`);
  }
  console.log('\nPreview in Remotion Studio:  npm run dev');

  return manifest;
};
