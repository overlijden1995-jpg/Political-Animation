/**
 * Page geometry — one shared calculation for the renderer and the audit.
 *
 * The deck is typeset, not flowed: headline size, subheadline, rule position
 * and body box are all resolved *up front* from real font metrics. Keeping
 * that math here means the legibility audit and the rendered slide can never
 * disagree about how much room a block of copy has.
 */

import type { ContentPage } from './deck';
import { fitWith, type Measure } from './measure';
import { GRID, TYPE } from './tokens';

/** Type limits per body layout. Copy is measured against these, never guessed. */
export const TEXT_LIMITS = {
  timeline: { tagWidth: 258, tagGap: 22, tagSize: 13, tagLines: 3, titleMax: 26, titleLines: 2, detailSize: 20, detailLines: 3, rowPadding: 18 },
  columns: { gutter: 48, titleMax: 24, titleLines: 2, detailSize: 19, detailLines: 4, headHeight: 74 },
  split: { arrowWidth: 96, size: 19.5, lines: 3, headHeight: 66 },
  bars: { valueWidth: 300, labelMax: 23, noteMaxWidth: 300, headerHeight: 40, trackHeight: 16 },
  quotes: { gutterWidth: 74, size: 21, lines: 3, headHeight: 64, lineHeight: 1.42 },
  specificity: { meterHeight: 96, claimWidth: 500, verdictWidth: 180, claimMax: 20, claimLines: 2, realitySize: 18.5, realityLines: 3, gap: 20 },
  scorecard: { metricWidth: 280, valueWidth: 380, valueSize: 27, contrastSize: 19, contrastLines: 2, rowPadding: 20 },
  statement: { numberWidth: 96, titleMax: 34, titleLines: 1, detailSize: 21, detailLines: 3, tailHeight: 34 },
  caption: { size: 23, width: 1000, maxLines: 2, wordsPerChunk: 10 },
} as const;

export const HEAD_TOP = 150;
export const BODY_TOP_COMPACT = 352;
export const BODY_TOP_STANDARD = 392;
export const BODY_BOTTOM = 932;
export const SUBHEAD_SIZE = 23;

export interface PageGeometry {
  headSize: number;
  headLines: string[];
  headHeight: number;
  subSize: number;
  subLines: string[];
  subTop: number;
  subHeight: number;
  ruleY: number;
  bodyTop: number;
  bodyHeight: number;
  /** Width of one body cell for multi-column layouts. */
  cellWidth: number;
  /** Height of one body row. */
  rowHeight: number;
}

export const pageGeometry = (page: ContentPage, measure: Measure): PageGeometry => {
  const { slide } = page;
  const head = fitWith(measure, {
    text: slide.headline,
    family: TYPE.display,
    weight: 900,
    maxWidth: GRID.colW,
    maxLines: 2,
    maxSize: page.headlineMax,
    minSize: 42,
    letterSpacing: -0.005,
  });
  const headHeight = head.lines.length * head.size * 0.97;

  const sub =
    page.showSubheadline
      ? fitWith(measure, {
          text: slide.subheadline,
          family: TYPE.sans,
          weight: 500,
          maxWidth: GRID.colW - 40,
          maxLines: 2,
          maxSize: SUBHEAD_SIZE,
          minSize: 18,
        })
      : null;

  const subTop = HEAD_TOP + headHeight + 20;
  const subHeight = sub ? sub.lines.length * sub.size * 1.38 : 0;
  const ruleY = Math.round(subTop + subHeight + 20);
  const bodyTop = Math.max(ruleY + 34, page.shell === 'compact' ? BODY_TOP_COMPACT : BODY_TOP_STANDARD);
  const bodyHeight = BODY_BOTTOM - bodyTop - 8;

  const columns = page.columns;
  const cellWidth = (GRID.colW - TEXT_LIMITS.columns.gutter * (columns - 1)) / columns;

  const count =
    page.slide.bullets?.length ||
    page.slide.contradictions?.length ||
    page.slide.quotes?.length ||
    page.slide.scorecard?.length ||
    page.slide.buzzwords?.length ||
    page.slide.claims?.length ||
    1;

  const rows =
    page.body === 'columns'
      ? Math.ceil(count / columns)
      : page.body === 'bars'
        ? count
        : count;

  const rowHeight = bodyHeight / Math.max(rows, 1);

  return {
    headSize: head.size,
    headLines: head.lines,
    headHeight,
    subSize: sub?.size ?? 0,
    subLines: sub?.lines ?? [],
    subTop,
    subHeight,
    ruleY,
    bodyTop,
    bodyHeight,
    cellWidth,
    rowHeight,
  };
};
