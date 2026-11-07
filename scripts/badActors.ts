#!/usr/bin/env tsx
/**
 * CLI workflow for "Bad Actors: How Politicians Pretend"
 *
 * Scans a politician's speech, debate, and Q&A transcript corpus, computes
 * buzzword frequencies, discourse marker density, and claim specificity ratios,
 * and writes reviewable manifests under runs/<run-id>/.
 *
 * Usage:
 *   npx tsx scripts/badActors.ts
 *   npx tsx scripts/badActors.ts --corpus src/data/corpus/jd-vance-corpus.json --run-id bad-actors-ep01-jd-vance
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  analyzeTranscriptCorpus,
  type PoliticianCorpus,
} from '../src/agents/badActorsAgent';
import { BAD_ACTORS_EP01_JD_VANCE } from '../src/data/badActorsJDVance';
import { compileDeck } from '../src/slides/deck';
import { auditDeck, summarize } from '../src/agents/slideQualityAgent';
import { deckMeasure } from './lib/deckFonts';

const args = process.argv.slice(2);
const getFlag = (name: string): string | undefined => {
  const eq = args.find((a) => a.startsWith(`--${name}=`))?.slice(`--${name}=`.length);
  if (eq !== undefined) return eq;
  const idx = args.indexOf(`--${name}`);
  return idx === -1 ? undefined : args[idx + 1];
};

const corpusPath = getFlag('corpus') ?? 'src/data/corpus/jd-vance-corpus.json';
const runId = getFlag('run-id') ?? 'bad-actors-ep01-jd-vance';

const raw = fs.readFileSync(corpusPath, 'utf-8');
const corpus = JSON.parse(raw) as PoliticianCorpus;

const report = analyzeTranscriptCorpus(corpus, { excludeDocPrefix: '2016' });
const runDir = path.join(process.cwd(), 'runs', runId);
fs.mkdirSync(runDir, { recursive: true });
const reportPath = path.join(runDir, 'corpus-analysis.json');
const episodePath = path.join(runDir, 'episode-manifest.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
fs.writeFileSync(episodePath, JSON.stringify(BAD_ACTORS_EP01_JD_VANCE, null, 2));

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log(`║  Bad Actors: How Politicians Pretend — Corpus Analysis Ready  ║`);
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log(`Politician : ${report.politician} (${report.party}) — ${report.role}`);
console.log(`Corpus     : ${report.documentCount} documents (${report.totalWordsAllEras} words total; ${report.analyzedActiveEraWords} post-2021 words)`);
console.log(`Specificity: ${report.specificityRatio.specificPercent}% specific vs. ${report.specificityRatio.vaguePercent}% sweeping/anecdotal`);
console.log('\nTop Buzzword Clusters (per 1,000 words):');
for (const bw of report.buzzwords) {
  console.log(`  • ${bw.label.padEnd(36)} ${String(bw.perThousandWords).padStart(4)} / 1k  (${bw.hits} hits)`);
}
// Compile the deck and gate it on legibility before anything is rendered.
const deck = compileDeck(BAD_ACTORS_EP01_JD_VANCE);
const deckPath = path.join(runDir, 'deck.json');
fs.writeFileSync(
  deckPath,
  JSON.stringify(
    {
      stage: { width: 1920, height: 1080 },
      durationSeconds: deck.duration,
      pages: deck.pages.map((page) => ({
        id: page.id,
        kind: page.kind,
        folio: page.folio,
        start: Number(page.start.toFixed(3)),
        end: Number(page.end.toFixed(3)),
        section: page.section.id,
        layout: page.kind === 'content' ? page.slide.layout : undefined,
        body: page.kind === 'content' ? page.body : undefined,
      })),
    },
    null,
    2,
  ),
);

const findings = auditDeck(deck, deckMeasure);
const { errors, warnings } = summarize(findings);
const problems = findings.filter((f) => f.level !== 'note');

console.log(`\nDeck: ${deck.pages.length} pages / ${deck.duration}s (${deck.pages.length} folios)`);
if (problems.length) {
  console.log('Legibility gate:');
  for (const finding of problems) {
    console.log(`  ${finding.level === 'error' ? 'FAIL' : 'WARN'}  ${finding.page.padEnd(24)} ${finding.message}`);
  }
}
console.log(`Legibility gate → ${errors} error(s), ${warnings} warning(s)`);

console.log(`\nManifests written to: ${runDir}`);
console.log(`  - ${reportPath}`);
console.log(`  - ${episodePath}`);
console.log(`  - ${deckPath}`);
console.log('\nNext:');
console.log('  npm run deck            # project the deck in the browser');
console.log('  npm run render:deck     # encode a crisp 2× MP4');

if (errors > 0) process.exitCode = 1;
