#!/usr/bin/env tsx
/**
 * CLI: turn a news article URL into a video script manifest.
 *
 *   npx tsx scripts/article.ts --url https://thehill.com/... --title "..." --pipeline shorts --run-id my-article-01
 *   npx tsx scripts/article.ts --file article.txt --title "My Article" --pipeline longform
 *
 * Outputs runs/<run-id>/script.json (+ article.json) ready for rendering:
 *   npx remotion render src/index.tsx Article2026Midterms out/out.mp4 --props runs/<run-id>/script.json --audio <voiceover.wav>
 */

import { articleToScript } from '../src/agents/articleAgent';
import { synthesizeVoice } from '../src/agents/voiceAgent';
import { generateCaptions } from '../src/agents/captionAgent';
import { PipelineType } from '../src/agents/types';
import * as fs from 'fs';

const args = process.argv.slice(2);

const getFlag = (name: string): string | undefined => {
  const eq = args.find((a) => a.startsWith(`--${name}=`))?.slice(`--${name}=`.length);
  if (eq !== undefined) return eq;
  const idx = args.indexOf(`--${name}`);
  return idx === -1 ? undefined : args[idx + 1];
};

const url = getFlag('url');
const file = getFlag('file');
const title = getFlag('title');
const pipelineArg = getFlag('pipeline');
const runIdArg = getFlag('run-id');

if (!title) {
  console.error('Usage: npx tsx scripts/article.ts --url <url> | --file <path> --title <title> [--pipeline shorts|longform] [--run-id <id>]');
  process.exit(1);
}

const pipelineType = (pipelineArg ?? 'shorts') as 'shorts' | 'longform';

/** Extract readable title + body text from HTML. */
const extractFromHtml = (html: string): { title: string; text: string } => {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : title;
  const blocks: string[] = [];
  const tagRegex = /<(h1|h2|h3|p)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRegex.exec(html))) blocks.push(m[2]);
  const text = blocks.length ? blocks.join('\n\n') : html.replace(/<[^>]*>/g, ' ');
  return { title: pageTitle, text: text.replace(/\s+/g, ' ').trim() };
};

const fetchArticle = async (u: string): Promise<{ title: string; text: string }> => {
  const res = await fetch(u);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${u}`);
  const html = await res.text();
  return extractFromHtml(html);
};

const main = async () => {
  let article: { title: string; text: string; url?: string };

  if (url) {
    article = await fetchArticle(url);
    article.url = url;
    if (!article.title || article.title === title) article.title = title;
  } else if (file) {
    const text = fs.readFileSync(file, 'utf-8');
    article = { title, text };
  } else {
    console.error('Provide --url or --file');
    process.exit(1);
  }

  if (!article.text || article.text.length < 100) {
    console.error('Article text too short to convert. Check the URL or file.');
    process.exit(1);
  }

  const runId = runIdArg ?? `run-${Date.now()}`;
  const script = await articleToScript(article, pipelineType, { runId });
  const runDir = `runs/${runId}`;

  // Voiceover (placeholder TTS — swap provider for real voice)
  const voice = await synthesizeVoice(script, { provider: 'placeholder', runId: runIdArg });

  // Captions
  generateCaptions(script, { runId: runIdArg });

  console.log('\n╔════════════════════════════════════════════════╗');
  console.log(`║  Article → render-ready: ${article.title}`);
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`Run dir: ${runDir}`);
  console.log(`Scenes: ${script.scenes.length} | Duration: ${script.durationSeconds}s | Pipeline: ${pipelineType}`);
  console.log('\nRender the video:');
  console.log(`  npx remotion render src/index.tsx Article2026Midterms out/article.mp4 --props ${runDir}/script.json --audio ${runDir}/voiceover.wav`);
  console.log(`\nPreview: npm run dev  (Remotion Studio, localhost:3000)`);
};

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
