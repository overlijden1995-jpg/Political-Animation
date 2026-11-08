/**
 * Headless proof renderer for "The Loyalty Machine".
 *
 * Renders every page of the exhibit book to SVG (from the exact React tree the
 * player uses) and rasterises it with resvg — no browser, no layout engine, so
 * what comes out is what the player paints.
 *
 * Usage:
 *   npx tsx scripts/loyalty_proof.ts              # all pages → out/loyalty/
 *   npx tsx scripts/loyalty_proof.ts 1 5 22       # specific pages (1-based)
 *   npx tsx scripts/loyalty_proof.ts --audit      # geometry audit only
 */

import * as React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { Resvg } from '@resvg/resvg-js';
import { buildBook } from '../src/loyalty/book';
import { renderPage, setTotalPages } from '../src/loyalty/render';
import { GRID, STAGE } from '../src/loyalty/compose';
import { auditText } from '../src/loyalty/audit';
import { width } from '../src/loyalty/measure';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'out', 'loyalty');
const FONTS = path.join(ROOT, 'public', 'bad-actors', 'fonts');

const fontFiles = fs
  .readdirSync(FONTS)
  .filter((f) => f.endsWith('.ttf'))
  .map((f) => path.join(FONTS, f));

const book = buildBook();
const total = book.pages.length;
setTotalPages(total);

const toSvg = (index: number): string => {
  const page = book.pages[index];
  const body = renderToStaticMarkup(
    React.createElement(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: `0 0 ${STAGE.w} ${STAGE.h}`,
        width: STAGE.w,
        height: STAGE.h,
      },
      renderPage(page, book, total),
    ),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
};

// ── geometry audit ──────────────────────────────────────────────────────────
const audit = () => {
  let problems = 0;
  book.pages.forEach((page, i) => {
    const folio = page.frame.pageNo;
    page.cols.forEach((atoms, ci) => {
      const colW = page.frame.columns === 1 ? GRID.right - GRID.margin : GRID.colW;
      let y = page.frame.top;
      atoms.forEach((a) => {
        if (a.t === 'line' && a.face !== 'display900') {
          const w = width(a.text, a.face, a.size, a.spacing ?? 0) + (a.indent ?? 0);
          if (w > colW + 1.5) {
            console.log(`  ⚠ p${folio} col${ci + 1} overflow ${w.toFixed(1)} / ${colW.toFixed(1)} — “${a.text.slice(0, 54)}”`);
            problems += 1;
          }
        }
        y += a.h;
      });
      if (y > page.frame.bottom + 1) {
        console.log(`  ⚠ p${folio} col${ci + 1} runs ${(y - page.frame.bottom).toFixed(1)}px past the rule`);
        problems += 1;
      }
    });
  });
  // text collisions: every run measured from real advances, page by page
  let collisions = 0;
  book.pages.forEach((_, i) => {
    const svg = toSvg(i);
    const label = `p${String(book.pages[i].frame.pageNo).padStart(3, '0')}`;
    auditText(svg, label).forEach((hit) => {
      console.log(`  ⚠ ${hit}`);
      collisions += 1;
    });
  });

  console.log(problems === 0 ? '✓ geometry clean' : `✗ ${problems} geometry problems`);
  console.log(collisions === 0 ? '✓ no text collisions' : `✗ ${collisions} text collisions`);
  return problems + collisions;
};

const main = () => {
  const args = process.argv.slice(2);
  if (args.includes('--audit')) {
    audit();
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });
  const wanted = args.map((a) => Number(a)).filter((n) => Number.isFinite(n) && n > 0);
  const indices = wanted.length ? wanted.map((n) => n - 1) : book.pages.map((_, i) => i);

  indices.forEach((i) => {
    const page = book.pages[i];
    if (!page) return;
    const svg = toSvg(i);
    fs.writeFileSync(path.join(OUT, `page-${String(page.frame.pageNo).padStart(3, '0')}.svg`), svg);
    const png = new Resvg(svg, {
      font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Plus Jakarta Sans' },
      fitTo: { mode: 'width', value: STAGE.w },
      background: '#F6F4EE',
    })
      .render()
      .asPng();
    fs.writeFileSync(path.join(OUT, `page-${String(page.frame.pageNo).padStart(3, '0')}.png`), png);
  });

  console.log(`▸ ${indices.length} pages → out/loyalty/`);
  console.log(`▸ book: ${total} pages`);
};

main();
