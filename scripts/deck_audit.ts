/**
 * Deck legibility audit — CLI wrapper around `src/agents/slideQualityAgent`.
 *
 * Measures every string with the real TTF metrics (opentype.js), runs the same
 * geometry the renderer uses, writes `runs/.../deck-audit.json` and fails the
 * process on any layout error.
 *
 * Usage: npm run deck:audit
 */

import fs from 'node:fs';
import path from 'node:path';
import { BAD_ACTORS_EP01_JD_VANCE } from '../src/data/badActorsJDVance';
import { compileDeck } from '../src/slides/deck';
import { auditDeck, summarize } from '../src/agents/slideQualityAgent';
import { GRID } from '../src/slides/tokens';
import { deckMeasure, ROOT } from './lib/deckFonts';

const deck = compileDeck(BAD_ACTORS_EP01_JD_VANCE);
const findings = auditDeck(deck, deckMeasure);
const { errors, warnings } = summarize(findings);
const contentPages = deck.pages.filter((p) => p.kind === 'content');

const pad = (s: string, n: number) => s.padEnd(n).slice(0, n);
console.log('\nBAD ACTORS — DECK LEGIBILITY AUDIT');
console.log(`${deck.pages.length} pages · ${contentPages.length} content slides · ${GRID.colW}px measure\n`);
for (const finding of findings) {
  const tag = finding.level === 'error' ? 'FAIL' : finding.level === 'warn' ? 'WARN' : '  · ';
  console.log(`${tag}  ${pad(finding.page, 24)} ${finding.message}`);
}
console.log(`\n${errors} error(s), ${warnings} warning(s)\n`);

const outDir = path.join(ROOT, 'runs', 'bad-actors-ep01-jd-vance');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'deck-audit.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      stage: '1920×1080',
      metrics: 'opentype.js advance widths (real TTFs)',
      pages: deck.pages.map((page) => ({
        id: page.id,
        kind: page.kind,
        folio: page.folio,
        start: Number(page.start.toFixed(3)),
        end: Number(page.end.toFixed(3)),
      })),
      errors,
      warnings,
      findings,
    },
    null,
    2,
  ),
);

if (errors > 0) process.exitCode = 1;
