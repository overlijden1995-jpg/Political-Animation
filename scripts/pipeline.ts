#!/usr/bin/env tsx
/**
 * CLI entry point for the agentic pipeline.
 *
 *   npx tsx scripts/pipeline.ts "The electoral college explained" --pipeline shorts
 *   npx tsx scripts/pipeline.ts "How Congress works" --pipeline longform --run-id my-show-01
 *   npx tsx scripts/pipeline.ts "Topic" --pipeline shorts --run-id=my-show-01
 */

import { runPipeline } from '../src/agents/pipeline';

const args = process.argv.slice(2);
const topic = args.find((a) => !a.startsWith('--'));

const getFlag = (name: string): string | undefined => {
  const eq = args.find((a) => a.startsWith(`--${name}=`))?.slice(`--${name}=`.length);
  if (eq !== undefined) return eq;
  const idx = args.indexOf(`--${name}`);
  return idx === -1 ? undefined : args[idx + 1];
};

const pipelineArg = getFlag('pipeline');
const runIdArg = getFlag('run-id');

if (!topic) {
  console.error(
    'Usage: npx tsx scripts/pipeline.ts "<topic>" [--pipeline shorts|longform] [--run-id <id>]',
  );
  process.exit(1);
}

const pipelineType = (pipelineArg ?? 'shorts') as 'shorts' | 'longform';

runPipeline(topic, pipelineType, { runId: runIdArg }).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
