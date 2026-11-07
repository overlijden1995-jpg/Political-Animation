/**
 * Slide quality agent — the pipeline's legibility gate.
 *
 * Long-form decks fail in the same three ways every time: an over-long string
 * forces a third line, a row of copy outgrows its row, or a caption chunk
 * wraps out of its band. All three are measurable *before* a frame is
 * rendered, so this stage treats the deck as data and checks it against the
 * real type metrics.
 *
 * It is dependency-free (no canvas, no browser): pass a `Measure` — the
 * browser uses its canvas, CI uses opentype.js — and it audits the compiled
 * deck with the exact geometry the renderer will use.
 */

import type { ContentPage, SlideDeck } from '../slides/deck';
import { TEXT_LIMITS, pageGeometry } from '../slides/layout';
import { fitWith, wrapWith, type Measure } from '../slides/measure';
import { GRID, TYPE } from '../slides/tokens';

export type Severity = 'error' | 'warn' | 'note';

export interface QualityFinding {
  level: Severity;
  page: string;
  message: string;
}

/** Anything the viewer must read sits above this floor on a 1080p stage. */
export const MIN_READABLE = 17;

const linesOf = (measure: Measure) => (
  text: string,
  family: string,
  weight: number,
  size: number,
  width: number,
  letterSpacing = 0,
) => wrapWith(measure, { text, family, weight, size, maxWidth: width, letterSpacing }).length;

export const auditDeck = (deck: SlideDeck, measure: Measure): QualityFinding[] => {
  const findings: QualityFinding[] = [];
  const add = (level: Severity, page: string, message: string) => findings.push({ level, page, message });
  const countLines = linesOf(measure);

  for (const page of deck.pages) {
    if (page.kind !== 'content') continue;
    const content = page as ContentPage;
    const { slide } = content;
    const geo = pageGeometry(content, measure);

    /* headline + subheadline */
    const head = fitWith(measure, {
      text: slide.headline,
      family: TYPE.display,
      weight: 900,
      maxWidth: GRID.colW,
      maxLines: 2,
      maxSize: content.headlineMax,
      minSize: 42,
      letterSpacing: -0.005,
    });
    if (head.overflow) add('error', content.id, `Headline needs ${head.lines.length} lines at ${head.size}px`);

    if (content.showSubheadline) {
      const sub = fitWith(measure, {
        text: slide.subheadline,
        family: TYPE.sans,
        weight: 500,
        maxWidth: GRID.colW - 40,
        maxLines: 2,
        maxSize: 23,
        minSize: 18,
      });
      if (sub.overflow) add('error', content.id, `Subheadline needs ${sub.lines.length} lines`);
    }

    if (geo.bodyHeight < 300) add('error', content.id, `Body box collapsed to ${geo.bodyHeight.toFixed(0)}px`);
    add(
      'note',
      content.id,
      `head ${head.size}px/${head.lines.length}L · body ${geo.bodyHeight.toFixed(0)}px · ${content.body}`,
    );

    /* body layouts */
    const rowHeight = geo.rowHeight;

    if (content.body === 'timeline') {
      const L = TEXT_LIMITS.timeline;
      const copyWidth = GRID.colW - L.tagWidth - L.tagGap;
      for (const bullet of slide.bullets ?? []) {
        const tagWidth = L.tagWidth - L.tagGap - 17;
        const tagLines = countLines(bullet.tag.toUpperCase(), TYPE.mono, 700, L.tagSize, tagWidth, 1.5);
        if (tagLines > L.tagLines) add('error', content.id, `Timeline tag needs ${tagLines} lines: ${bullet.tag}`);
        const fit = fitWith(measure, {
          text: bullet.title,
          family: TYPE.sans,
          weight: 800,
          maxWidth: copyWidth,
          maxLines: L.titleLines,
          maxSize: L.titleMax,
          minSize: 18,
        });
        const detailLines = countLines(bullet.detail, TYPE.sans, 500, L.detailSize, copyWidth);
        if (detailLines > L.detailLines) {
          add('error', content.id, `Row detail needs ${detailLines} lines: ${bullet.title.slice(0, 30)}…`);
        }
        const needed = fit.lines.length * fit.size * 1.16 + 7 + Math.min(detailLines, L.detailLines) * L.detailSize * 1.36;
        if (needed > rowHeight - L.rowPadding) {
          add('error', content.id, `Row content ${needed.toFixed(0)}px > ${(rowHeight - L.rowPadding).toFixed(0)}px`);
        }
      }
    }

    if (content.body === 'columns') {
      const L = TEXT_LIMITS.columns;
      for (const bullet of slide.bullets ?? []) {
        const fit = fitWith(measure, {
          text: bullet.title,
          family: TYPE.sans,
          weight: 800,
          maxWidth: geo.cellWidth,
          maxLines: L.titleLines,
          maxSize: L.titleMax,
          minSize: 17,
        });
        if (fit.overflow) add('error', content.id, `Column title needs ${fit.lines.length} lines`);
        const detailLines = countLines(bullet.detail, TYPE.sans, 500, L.detailSize, geo.cellWidth);
        const needed = fit.lines.length * fit.size * 1.18 + 16 + Math.min(detailLines, L.detailLines) * L.detailSize * 1.36;
        if (detailLines > L.detailLines) add('error', content.id, `Column detail needs ${detailLines} lines`);
        if (needed > rowHeight) add('error', content.id, `Column cell ${needed.toFixed(0)}px > row ${rowHeight.toFixed(0)}px`);
      }
    }

    if (content.body === 'split') {
      const L = TEXT_LIMITS.split;
      const halfWidth = (GRID.colW - L.arrowWidth) / 2;
      for (const item of slide.contradictions ?? []) {
        const before = countLines(item.earlierPosition, TYPE.sans, 500, L.size, halfWidth);
        const after = countLines(item.laterPosition, TYPE.sans, 700, L.size, halfWidth);
        if (before > L.lines) add('error', content.id, `"${item.topic}" before text needs ${before} lines`);
        if (after > L.lines) add('error', content.id, `"${item.topic}" after text needs ${after} lines`);
        const needed = 20 + 8 + 20 + Math.max(before, after) * L.size * 1.36 + 16;
        if (needed > rowHeight) add('error', content.id, `Contradiction row ${needed.toFixed(0)}px > ${rowHeight.toFixed(0)}px`);
      }
    }

    if (content.body === 'bars') {
      const L = TEXT_LIMITS.bars;
      const labelRoom = GRID.colW - L.valueWidth;
      for (const bar of slide.buzzwords ?? []) {
        const labelWidth = measure(bar.label, TYPE.sans, 800, L.labelMax, 0);
        const noteWidth = Math.min(measure(bar.note, TYPE.sans, 500, 15, 0), L.noteMaxWidth);
        if (labelWidth + 14 + noteWidth > labelRoom) add('warn', content.id, `Bar label clipped: ${bar.label}`);
      }
      const rowNeeded = L.labelMax * 1.2 + 8 + L.trackHeight;
      const rowAvailable = (geo.bodyHeight - L.headerHeight) / Math.max((slide.buzzwords ?? []).length, 1);
      if (rowNeeded > rowAvailable) add('error', content.id, 'Bar rows do not fit the body box');
    }

    if (content.body === 'quotes') {
      const L = TEXT_LIMITS.quotes;
      for (const quote of slide.quotes ?? []) {
        const lines = countLines(quote.quote, TYPE.serif, 400, L.size, GRID.colW - L.gutterWidth);
        const needed = lines * L.size * L.lineHeight + L.headHeight;
        if (needed > rowHeight) add('error', content.id, `Quote needs ${lines} lines (${needed.toFixed(0)}px > ${rowHeight.toFixed(0)}px)`);
      }
    }

    if (content.body === 'table' && slide.layout === 'specificity-meter') {
      const L = TEXT_LIMITS.specificity;
      const rowAvailable = (geo.bodyHeight - L.meterHeight) / Math.max((slide.claims ?? []).length, 1);
      for (const claim of slide.claims ?? []) {
        const fit = fitWith(measure, {
          text: claim.claim,
          family: TYPE.sans,
          weight: 800,
          maxWidth: L.claimWidth - L.gap,
          maxLines: L.claimLines,
          maxSize: L.claimMax,
          minSize: MIN_READABLE,
        });
        const reality = countLines(
          claim.reality,
          TYPE.sans,
          500,
          L.realitySize,
          GRID.colW - L.claimWidth - L.verdictWidth - L.gap,
        );
        if (fit.overflow) add('error', content.id, `Claim needs ${fit.lines.length} lines: ${claim.claim.slice(0, 30)}…`);
        if (reality > L.realityLines) add('error', content.id, `Claim reality needs ${reality} lines`);
        const needed = Math.max(fit.lines.length * fit.size * 1.24, Math.min(reality, L.realityLines) * L.realitySize * 1.34) + 30;
        if (needed > rowAvailable) add('error', content.id, `Claim row ${needed.toFixed(0)}px > ${rowAvailable.toFixed(0)}px`);
      }
    }

    if (content.body === 'table' && slide.layout === 'record-scorecard') {
      const L = TEXT_LIMITS.scorecard;
      const contrastWidth = GRID.colW - L.metricWidth - L.valueWidth;
      for (const row of slide.scorecard ?? []) {
        const metricWidth = measure(row.metric, TYPE.mono, 700, 13, 0.14 * 13);
        const valueWidth = measure(row.value, TYPE.display, 900, L.valueSize, 0);
        const contrast = countLines(row.rhetoricContrast, TYPE.sans, 500, L.contrastSize, contrastWidth);
        if (metricWidth > L.metricWidth - 20) add('warn', content.id, `Metric label overruns: ${row.metric}`);
        if (valueWidth > L.valueWidth - 20) add('warn', content.id, `Value column overruns: ${row.value}`);
        if (contrast > L.contrastLines) add('warn', content.id, `Contrast text needs ${contrast} lines`);
      }
    }

    if (content.body === 'statement') {
      const L = TEXT_LIMITS.statement;
      for (const item of slide.bullets ?? []) {
        const fit = fitWith(measure, {
          text: item.title,
          family: TYPE.display,
          weight: 900,
          maxWidth: GRID.colW - L.numberWidth,
          maxLines: L.titleLines,
          maxSize: L.titleMax,
          minSize: 22,
        });
        const detail = countLines(item.detail, TYPE.sans, 500, L.detailSize, GRID.colW - L.numberWidth);
        if (fit.overflow) add('warn', content.id, `Verdict title trimmed to ${fit.size}px`);
        if (detail > L.detailLines) add('error', content.id, `Verdict detail needs ${detail} lines`);
      }
    }

    /* caption band */
    const chunk = slide.narration.split(/\s+/).slice(0, TEXT_LIMITS.caption.wordsPerChunk).join(' ');
    const captionLines = countLines(chunk, TYPE.sans, 500, TEXT_LIMITS.caption.size, TEXT_LIMITS.caption.width);
    if (captionLines > TEXT_LIMITS.caption.maxLines) {
      add('warn', content.id, `Caption chunk wraps to ${captionLines} lines`);
    }

    /* vertical rhythm */
    const overflowBy = geo.bodyTop + geo.bodyHeight - 932;
    if (overflowBy > 0) add('error', content.id, `Body overruns the footer rule by ${overflowBy.toFixed(0)}px`);
  }

  /* title page standfirst */
  const coverLine = deck.episode.coverLine ?? '';
  if (coverLine) {
    const cover = fitWith(measure, {
      text: coverLine,
      family: TYPE.sans,
      weight: 500,
      maxWidth: 1000,
      maxLines: 3,
      maxSize: 25,
      minSize: 20,
    });
    if (cover.overflow) add('error', 'cover', `Standfirst needs ${cover.lines.length} lines`);
  }

  return findings;
};

export const summarize = (findings: QualityFinding[]) => ({
  errors: findings.filter((f) => f.level === 'error').length,
  warnings: findings.filter((f) => f.level === 'warn').length,
});
