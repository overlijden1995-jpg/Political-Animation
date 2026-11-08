import { breakLines, fitSize, width, type FaceKey } from './measure';
import type { Block, Part } from './article';

/**
 * The compositor.
 *
 * Nothing here is typeset by a browser. Every paragraph is broken against real
 * glyph advances (`measure.ts`), every atom is placed at an absolute baseline,
 * and the resulting page is a pure function of the source text. The projector
 * player, the headless proofs and the PDF export therefore show the same lines
 * in the same places.
 *
 * Units are stage pixels on a 1600 × 900 page.
 */

export const STAGE = { w: 1600, h: 900 } as const;

export const GRID = {
  margin: 64,
  right: 1536,
  gutter: 44,
  colW: (1536 - 64 - 44) / 2,
  top: 176,
  bottom: 846,
} as const;

export const INK = '#121212';
export const INK_SOFT = '#2E2A24';
export const MUTED = '#6B6559';
export const HAIR = 'rgba(18,18,18,0.16)';
export const HAIR_MID = 'rgba(18,18,18,0.34)';
export const VERMILION = '#C0241A';
export const COBALT = '#1F3A93';
export const PAPER = '#F6F4EE';
export const PAPER_DEEP = '#EBE6DA';

export const BODY = { size: 19.5, lead: 30 } as const;

export type Atom =
  | {
      t: 'line';
      text: string;
      face: FaceKey;
      size: number;
      fill: string;
      spacing?: number;
      italic?: boolean;
      h: number;
      base: number;
      indent?: number;
    }
  | { t: 'rule'; w: number; h: number; fill: string; thick?: number; dash?: string }
  | { t: 'space'; h: number }
  | {
      t: 'panel';
      h: number;
      pad: number;
      lineH: number;
      lines: Array<{ text: string; face: FaceKey; size: number; fill: string }>;
      fill: string;
      stroke: string;
      bar?: string;
    }
  | {
      t: 'kv';
      h: number;
      title: string;
      rows: Array<{ key: string; value: string; lines: number }>;
      keyW: number;
      pad: number;
      lineH: number;
    };

export type FrameKind =
  | 'cover'
  | 'contents'
  | 'method'
  | 'partOpen'
  | 'partCont'
  | 'reading'
  | 'plate'
  | 'sources'
  | 'colophon';

export interface PageFrame {
  kind: FrameKind;
  partIndex: number;
  pageNo: number;
  columns: 1 | 2 | 3;
  top: number;
  bottom: number;
}

export interface ComposedPage {
  frame: PageFrame;
  cols: Atom[][];
}

const atomH = (a: Atom) => a.h;

const lineAtom = (
  text: string,
  face: FaceKey,
  size: number,
  fill: string,
  lead: number,
  opts: { spacing?: number; italic?: boolean; indent?: number; base?: number } = {},
): Atom => ({
  t: 'line',
  text,
  face,
  size,
  fill,
  spacing: opts.spacing,
  italic: opts.italic,
  indent: opts.indent,
  h: lead,
  base: opts.base ?? Math.round(lead * 0.72),
});

export const kickerAtom = (text: string, fill = MUTED, size = 11.5) =>
  lineAtom(text.toUpperCase(), 'mono700', size, fill, 20, { spacing: 1.7, base: 14 });

const paraAtoms = (text: string, colW: number, size = BODY.size, lead = BODY.lead): Atom[] =>
  breakLines(text, 'sans500', size, colW).map((l) => lineAtom(l.text, 'sans500', size, INK, lead));

const headingAtoms = (text: string, kicker: string | undefined, colW: number): Atom[] => {
  const out: Atom[] = [{ t: 'space', h: 22 }];
  if (kicker) out.push(kickerAtom(kicker, VERMILION, 11));
  const size = fitSize(text, 'display900', colW, 22, 31);
  out.push({ t: 'space', h: 4 });
  breakLines(text, 'display900', size, colW).forEach((l) =>
    out.push(lineAtom(l.text, 'display900', size, INK, Math.round(size * 1.14), { spacing: -0.1, base: Math.round(size) })),
  );
  out.push({ t: 'rule', w: 72, h: 22, fill: INK, thick: 4 });
  return out;
};

const quoteAtoms = (text: string, who: string, colW: number): Atom[] => {
  const out: Atom[] = [{ t: 'space', h: 18 }];
  const inner = colW - 30;
  breakLines(text, 'serifIt', 20.5, inner).forEach((l) =>
    out.push(lineAtom(l.text, 'serifIt', 20.5, INK, 30, { indent: 24, base: 22 })),
  );
  out.push(lineAtom(who.toUpperCase(), 'mono700', 9.5, MUTED, 26, { indent: 24, spacing: 1.1, base: 17 }));
  out.push({ t: 'space', h: 16 });
  return out;
};

const listAtoms = (items: string[], colW: number, ordered?: boolean): Atom[] => {
  const out: Atom[] = [{ t: 'space', h: 8 }];
  items.forEach((it, i) => {
    const lines = breakLines(it, 'sans500', 17.5, colW - 32);
    lines.forEach((l, k) => {
      if (k === 0) out.push(lineAtom(ordered ? `${i + 1}.` : '—', 'mono700', 11, VERMILION, 26, { base: 19 }));
      out.push(lineAtom(l.text, 'sans500', 17.5, INK_SOFT, 26, { indent: 26, base: 19 }));
    });
    out.push({ t: 'space', h: 6 });
  });
  return out;
};

const noteAtoms = (text: string, colW: number): Atom[] => {
  const pad = 18;
  const inner = colW - pad * 2 - 6;
  const lines = breakLines(text, 'sans500', 16.5, inner).map((l) => ({
    text: l.text,
    face: 'sans500' as FaceKey,
    size: 16.5,
    fill: INK_SOFT,
  }));
  const lineH = 24;
  return [
    { t: 'space', h: 14 },
    { t: 'panel', h: pad * 2 + lines.length * lineH, pad, lineH, lines, fill: PAPER_DEEP, stroke: HAIR_MID, bar: COBALT },
    { t: 'space', h: 14 },
  ];
};

const factboxAtoms = (title: string, rows: Array<[string, string]>, colW: number): Atom[] => {
  const pad = 20;
  const keyW = 150;
  const valW = colW - pad * 2 - keyW;
  const lineH = 21;
  const out: Array<{ key: string; value: string; lines: number }> = [];
  let body = 0;
  rows.forEach(([k, v]) => {
    const n = breakLines(v, 'sans700', 14.5, valW).length;
    out.push({ key: k, value: v, lines: n });
    body += Math.max(1, n) * lineH + 8;
  });
  return [
    { t: 'space', h: 14 },
    { t: 'kv', h: pad * 2 + 26 + body, title, rows: out, keyW, pad, lineH },
    { t: 'space', h: 16 },
  ];
};

/** Block stream → keep-together groups of atoms. */
export const blockAtoms = (blocks: Block[], colW: number): Atom[][] => {
  const groups: Atom[][] = [];
  blocks.forEach((b) => {
    if (b.type === 'p') groups.push([...paraAtoms(b.text, colW), { t: 'space', h: 13 }]);
    else if (b.type === 'h') groups.push(headingAtoms(b.text, b.kicker, colW));
    else if (b.type === 'quote') groups.push(quoteAtoms(b.text, b.who, colW));
    else if (b.type === 'list') groups.push(listAtoms(b.items, colW, b.ordered));
    else if (b.type === 'note') groups.push(noteAtoms(b.text, colW));
    else if (b.type === 'factbox') groups.push(factboxAtoms(b.title, b.rows, colW));
  });
  return groups;
};

export interface FlowOptions {
  startPage: number;
  columns: 1 | 2 | 3;
  colW: number;
  /** Frames are produced lazily, one per page index. */
  frame: (pageIndex: number) => Omit<PageFrame, 'pageNo'>;
}

/**
 * Distribute groups over a column grid: keep-together first, then balance.
 *
 *   1. a greedy fill decides which atoms land on which page — the page count is
 *      the minimum the text needs, and a group is never split;
 *   2. inside each page the atoms are re-distributed across its columns against
 *      an even target, so a spread ends level instead of carried by its left
 *      column. Only the column a line sits in can change; the lines themselves
 *      were measured before any of this ran.
 */
export const flow = (groups: Atom[][], opts: FlowOptions): ComposedPage[] => {
  const atomHeight = (a: Atom) => atomH(a);
  const groupHeight = (g: Atom[]) => g.reduce((s, a) => s + atomHeight(a), 0);

  const capOf = (i: number) => {
    const f = opts.frame(i);
    return f.bottom - f.top;
  };

  /* ── 1 · greedy: which atoms belong to which page, in column order ───── */
  const pageAtoms: Atom[][] = [[]];
  let p = 0;
  let col = 0;
  let y = opts.frame(0).top;

  const advance = () => {
    col += 1;
    if (col >= opts.columns) {
      col = 0;
      p += 1;
      pageAtoms[p] = pageAtoms[p] ?? [];
    }
    y = opts.frame(p).top;
  };

  groups.forEach((group) => {
    const gh = groupHeight(group);
    const cap = capOf(p);
    const top = opts.frame(p).top;
    /* a group that would fit on a page but not on what is left of this column jumps */
    if (y > top && gh <= cap && y + gh > opts.frame(p).bottom) advance();
    group.forEach((atom) => {
      if (y + atomHeight(atom) > opts.frame(p).bottom && y > opts.frame(p).top) advance();
      pageAtoms[p] = pageAtoms[p] ?? [];
      pageAtoms[p].push(atom);
      y += atomHeight(atom);
    });
  });

  /* ── 2 · balance each page across its columns ───────────────────────── */
  return pageAtoms.map((atoms, i) => {
    const f = opts.frame(i);
    const total = atoms.reduce((s, a) => s + atomHeight(a), 0);
    const cap = f.bottom - f.top;
    /*
     * A short final page keeps one column: splitting 400px of text into two
     * 200px columns reads as two stubs. Only a page that needs both columns is
     * balanced across them.
     */
    const spread = total > cap * 0.92 ? opts.columns : 1;
    const target = Math.min(cap - 2, total / spread);

    const cols: Atom[][] = Array.from({ length: opts.columns }, () => []);
    let col = 0;
    let used = 0;
    atoms.forEach((atom) => {
      const h = atomHeight(atom);
      if (col < spread - 1 && used > 0 && (used + h > target + 8 || used + h > cap)) {
        col += 1;
        used = 0;
      }
      cols[col].push(atom);
      used += h;
    });

    return { frame: { ...f, pageNo: opts.startPage + i }, cols };
  });
};

/** A part of the essay: opens on a display page, continues in two columns. */
export const partPages = (part: Part, startPage: number, partIndex: number, colW = GRID.colW): ComposedPage[] => {
  const groups = blockAtoms(part.blocks, colW);
  return flow(groups, {
    startPage,
    columns: 2,
    colW,
    frame: (i) => ({
      kind: i === 0 ? 'partOpen' : 'partCont',
      partIndex,
      columns: 2,
      top: i === 0 ? 532 : 168,
      bottom: GRID.bottom,
    }),
  });
};

export const sectionPages = (
  blocks: Block[],
  startPage: number,
  kind: FrameKind,
  firstTop: number,
  columns: 1 | 2 = 2,
): ComposedPage[] => {
  const colW = columns === 2 ? GRID.colW : GRID.right - GRID.margin;
  const groups = blockAtoms(blocks, colW);
  return flow(groups, {
    startPage,
    columns,
    colW,
    frame: (i) => ({
      kind: i === 0 ? kind : kind === 'cover' ? 'cover' : 'partCont',
      partIndex: 0,
      columns,
      top: i === 0 ? firstTop : 168,
      bottom: GRID.bottom,
    }),
  });
};

/** The page facing each diagram: measured analysis in two columns. */
export const readingAtomGroups = (meta: { reading: string[]; source: string }, colW: number): Atom[][] => {
  const groups: Atom[][] = meta.reading.map((p) => [...paraAtoms(p, colW), { t: 'space', h: 14 }]);
  groups.push([
    { t: 'rule', w: colW, h: 24, fill: HAIR_MID, thick: 2 },
    /* measured with the same tracking it is painted with */
    ...breakLines(meta.source, 'mono500', 10.5, colW - 6, { spacing: 0.4 }).map((l) =>
      lineAtom(l.text, 'mono500', 10.5, MUTED, 17, { spacing: 0.4, base: 12 }),
    ),
  ]);
  return groups;
};

export const readingPage = (
  meta: { reading: string[]; source: string },
  pageNo: number,
  top = 300,
  kind: FrameKind = 'reading',
): ComposedPage => {
  const colW = GRID.colW;
  const groups = readingAtomGroups(meta, colW);
  const [first] = flow(groups, {
    startPage: pageNo,
    columns: 2,
    colW,
    frame: () => ({ kind, partIndex: 0, columns: 2, top, bottom: GRID.bottom }),
  });
  return first;
};

/** Widest title we can set — used to check contents alignment. */
export const widestTitle = (titles: string[]) =>
  Math.max(...titles.map((t) => width(t, 'display900', 30)));

/** Sources apparatus: one keep-together group per subject heading. */
export const sourceGroups = (
  groups: Array<{ group: string; items: string[] }>,
  colW: number,
): Atom[][] =>
  groups.map((g) => {
    const out: Atom[] = [
      { t: 'space', h: 10 },
      kickerAtom(g.group, VERMILION, 10.5),
      { t: 'space', h: 2 },
    ];
    g.items.forEach((item) => {
      const lines = breakLines(item, 'sans500', 12.5, colW - 14);
      lines.forEach((l) => out.push(lineAtom(l.text, 'sans500', 12.5, INK_SOFT, 17.5, { indent: 14, base: 13 })));
      out.push({ t: 'space', h: 5 });
    });
    return out;
  });
