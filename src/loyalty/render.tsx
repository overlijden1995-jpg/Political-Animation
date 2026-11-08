import * as React from 'react';
import {
  COBALT,
  HAIR,
  HAIR_MID,
  INK,
  INK_SOFT,
  MUTED,
  PAPER,
  PAPER_DEEP,
  STAGE,
  VERMILION,
  type Atom,
} from './compose';
import { GRID } from './compose';
import { DIAGRAMS } from './diagrams';
import { METHOD, PARTS, SOURCES, STANDING } from './article';
import { breakLines, fitSize, width } from './measure';
import type { Book, BookPage } from './book';

/**
 * The press.
 *
 * A page is a pure function of its composed atoms: every string arrives with a
 * face, a size, a measured advance and a baseline, so nothing here can reflow.
 */

const F = {
  display: '"League Spartan", "Archivo Black", Impact, sans-serif',
  numeral: '"Anton", "League Spartan", Impact, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, monospace',
  sans: '"Plus Jakarta Sans", system-ui, sans-serif',
  serif: '"Instrument Serif", Georgia, serif',
  bask: '"Libre Baskerville", Georgia, serif',
} as const;

const FACE_CSS: Record<string, { fontFamily: string; fontWeight: number; fontStyle?: string }> = {
  display900: { fontFamily: F.display, fontWeight: 900 },
  display700: { fontFamily: F.display, fontWeight: 700 },
  numeral: { fontFamily: F.numeral, fontWeight: 400 },
  mono500: { fontFamily: F.mono, fontWeight: 500 },
  mono700: { fontFamily: F.mono, fontWeight: 700 },
  sans500: { fontFamily: F.sans, fontWeight: 500 },
  sans700: { fontFamily: F.sans, fontWeight: 700 },
  sans800: { fontFamily: F.sans, fontWeight: 800 },
  serif400: { fontFamily: F.bask, fontWeight: 400 },
  serifIt: { fontFamily: F.bask, fontWeight: 400, fontStyle: 'italic' },
  instrument: { fontFamily: F.serif, fontWeight: 400, fontStyle: 'italic' },
  grotesk: { fontFamily: F.sans, fontWeight: 500 },
};

const HEAD_RULE = 112;
const FOOT_RULE = 866;

// ─────────────────────────────────────────────────────────────────────────────
// atoms
// ─────────────────────────────────────────────────────────────────────────────

const Line: React.FC<{
  a: Extract<Atom, { t: 'line' }>;
  x: number;
  y: number;
}> = ({ a, x, y }) => {
  const face = FACE_CSS[a.face] ?? FACE_CSS.sans500;
  return (
    <text
      x={x + (a.indent ?? 0)}
      y={y + a.base}
      fontFamily={face.fontFamily}
      fontWeight={face.fontWeight}
      fontStyle={face.fontStyle}
      fontSize={a.size}
      fill={a.fill}
      letterSpacing={a.spacing}
      style={{ whiteSpace: 'pre' }}
    >
      {a.text}
    </text>
  );
};

const Panel: React.FC<{ a: Extract<Atom, { t: 'panel' }>; x: number; y: number; colW: number }> = ({ a, x, y, colW }) => (
  <g>
    <rect x={x} y={y} width={colW} height={a.h} fill={a.fill} />
    {a.bar ? <rect x={x} y={y} width={4} height={a.h} fill={a.bar} /> : null}
    <rect x={x} y={y} width={colW} height={a.h} fill="none" stroke={a.stroke} strokeWidth={1.5} />
    {a.lines.map((l, i) => {
      const face = FACE_CSS[l.face] ?? FACE_CSS.sans500;
      return (
        <text
          key={i}
          x={x + a.pad + 6}
          y={y + a.pad + 15 + i * a.lineH}
          fontFamily={face.fontFamily}
          fontWeight={face.fontWeight}
          fontSize={l.size}
          fill={l.fill}
        >
          {l.text}
        </text>
      );
    })}
  </g>
);

const KV: React.FC<{ a: Extract<Atom, { t: 'kv' }>; x: number; y: number; colW: number }> = ({ a, x, y, colW }) => (
  <g>
    <rect x={x} y={y} width={colW} height={a.h} fill="none" stroke={HAIR_MID} strokeWidth={2} />
    <rect x={x} y={y} width={colW} height={4} fill={INK} />
    <text x={x + a.pad} y={y + 26} fontFamily={F.mono} fontWeight={700} fontSize={10.5} fill={VERMILION} letterSpacing={1.4}>
      {a.title.toUpperCase()}
    </text>
    {(() => {
      let cy = y + 26 + 10;
      return a.rows.map((r, i) => {
        const valX = x + a.pad + a.keyW;
        const lines = breakLines(r.value, 'sans700', 14.5, colW - a.pad * 2 - a.keyW);
        const top = cy + 6;
        const node = (
          <g key={i}>
            <text x={x + a.pad} y={top + 12} fontFamily={F.mono} fontWeight={700} fontSize={9.5} fill={MUTED} letterSpacing={0.6}>
              {r.key.toUpperCase()}
            </text>
            {lines.map((l, k) => (
              <text key={k} x={valX} y={top + 12 + k * a.lineH} fontFamily={F.sans} fontWeight={700} fontSize={14.5} fill={INK}>
                {l.text}
              </text>
            ))}
          </g>
        );
        cy = top + Math.max(1, lines.length) * a.lineH + 8;
        return node;
      });
    })()}
  </g>
);

const Column: React.FC<{ atoms: Atom[]; x: number; y: number; colW: number }> = ({ atoms, x, y, colW }) => {
  let cy = y;
  return (
    <g>
      {atoms.map((a, i) => {
        const at = cy;
        cy += a.h;
        if (a.t === 'line')
          return (
            <g key={i}>
              {a.fill === VERMILION && a.size < 13 ? (
                <Line a={a} x={x} y={at} />
              ) : (
                <Line a={a} x={x} y={at} />
              )}
              {a.size >= 18 && a.face === 'display900' ? (
                <rect x={x} y={at + a.h - 8} width={width(a.text, 'display900', a.size, a.spacing)} height={2} fill={HAIR} />
              ) : null}
            </g>
          );
        if (a.t === 'rule') return <rect key={i} x={x} y={at + 4} width={a.w} height={a.thick ?? 2} fill={a.fill} />;
        if (a.t === 'space') return null;
        if (a.t === 'panel') return <Panel key={i} a={a} x={x} y={at} colW={colW} />;
        if (a.t === 'kv') return <KV key={i} a={a} x={x} y={at} colW={colW} />;
        return null;
      })}
    </g>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// furniture
// ─────────────────────────────────────────────────────────────────────────────

const Chrome: React.FC<{ page: BookPage; total: number }> = ({ page, total }) => (
  <g>
    <line x1={GRID.margin} y1={HEAD_RULE} x2={GRID.right} y2={HEAD_RULE} stroke={HAIR} strokeWidth={2} />
    <text x={GRID.margin} y={HEAD_RULE - 14} fontFamily={F.mono} fontWeight={700} fontSize={9.5} fill={MUTED} letterSpacing={1.6}>
      {page.section}
    </text>
    <text
      x={GRID.right}
      y={HEAD_RULE - 14}
      fontFamily={F.mono}
      fontWeight={700}
      fontSize={9.5}
      fill={MUTED}
      letterSpacing={1.4}
      textAnchor="end"
    >
      {page.strap}
    </text>
    <text x={GRID.right} y={66} fontFamily={F.mono} fontWeight={700} fontSize={9.5} fill={INK} letterSpacing={1.4} textAnchor="end">
      {`${String(page.frame.pageNo).padStart(3, '0')} / ${String(total).padStart(3, '0')}`}
    </text>
    <line x1={GRID.margin} y1={FOOT_RULE} x2={GRID.right} y2={FOOT_RULE} stroke={HAIR} strokeWidth={2} />
    <text x={GRID.margin} y={FOOT_RULE + 22} fontFamily={F.mono} fontWeight={500} fontSize={9} fill={MUTED} letterSpacing={1.2}>
      THE LOYALTY MACHINE · NOV 2026
    </text>
    <text x={GRID.right} y={FOOT_RULE + 22} fontFamily={F.mono} fontWeight={700} fontSize={9.5} fill={INK} letterSpacing={1.4} textAnchor="end">
      {String(page.frame.pageNo).padStart(3, '0')} / {String(total).padStart(3, '0')}
    </text>
  </g>
);

/** Just the foot: used on pages that carry their own running head. */
const FootOnly: React.FC<{ page: BookPage; total: number }> = ({ page, total }) => (
  <g>
    <line x1={GRID.margin} y1={FOOT_RULE} x2={GRID.right} y2={FOOT_RULE} stroke={HAIR} strokeWidth={2} />
    <text x={GRID.margin} y={FOOT_RULE + 22} fontFamily={F.mono} fontWeight={500} fontSize={9} fill={MUTED} letterSpacing={1.2}>
      THE LOYALTY MACHINE · NOV 2026
    </text>
    <text x={GRID.right} y={FOOT_RULE + 22} fontFamily={F.mono} fontWeight={700} fontSize={9.5} fill={INK} letterSpacing={1.4} textAnchor="end">
      {String(page.frame.pageNo).padStart(3, '0')} / {String(total).padStart(3, '0')}
    </text>
  </g>
);

// ─────────────────────────────────────────────────────────────────────────────
// special pages
// ─────────────────────────────────────────────────────────────────────────────

const Cover: React.FC = () => {
  const W = GRID.right - GRID.margin;
  const title = STANDING.title.toUpperCase();
  const size = fitSize(title, 'display900', W, 40, 128, -2);
  const subLines = breakLines(STANDING.subtitle, 'serifIt', 23, W - 340);
  return (
    <g>
      <rect x={24} y={24} width={STAGE.w - 48} height={STAGE.h - 48} fill="none" stroke={HAIR_MID} strokeWidth={2} />
      <text x={GRID.margin} y={116} fontFamily={F.mono} fontWeight={700} fontSize={10.5} fill={VERMILION} letterSpacing={3}>
        {STANDING.edition.toUpperCase()}
      </text>
      <text x={GRID.right} y={116} fontFamily={F.mono} fontWeight={700} fontSize={10.5} fill={MUTED} letterSpacing={2.4} textAnchor="end">
        {STANDING.dateline}
      </text>

      <text x={GRID.margin} y={236} fontFamily={F.numeral} fontSize={120} fill={INK}>
        01
      </text>
      <text x={GRID.margin + 130} y={200} fontFamily={F.mono} fontWeight={700} fontSize={10} fill={MUTED} letterSpacing={2.2}>
        LINK ANALYSIS · THIRTY-SIX FIGURES · TEN PLATES
      </text>
      <text x={GRID.margin + 130} y={230} fontFamily={F.sans} fontWeight={500} fontSize={13.5} fill={INK_SOFT}>
        Donald Trump, his court, his cabinet and his money wing, mapped from
      </text>
      <text x={GRID.margin + 130} y={250} fontFamily={F.sans} fontWeight={500} fontSize={13.5} fill={INK_SOFT}>
        November 2024 to the promotion of Stephen Miller on 9 November 2026.
      </text>

      <text x={GRID.margin} y={420} fontFamily={F.display} fontWeight={900} fontSize={size} fill={INK} letterSpacing={-2}>
        {title}
      </text>
      <rect x={GRID.margin} y={448} width={W} height={6} fill={VERMILION} />

      {subLines.map((l, i) => (
        <text key={i} x={GRID.margin} y={500 + i * 34} fontFamily={F.serif} fontStyle="italic" fontSize={23} fill={INK_SOFT}>
          {l.text}
        </text>
      ))}

      <line x1={GRID.margin} y1={648} x2={GRID.right} y2={648} stroke={HAIR} strokeWidth={2} />
      {[
        ['THE ARGUMENT', 'The chief of staff is the only office where access and authority become one, and the new one wrote the policy the country just rejected.'],
        ['THE METHOD', 'Four indices — access, formal authority, loyalty, brokerage — scored 0–100 across 36 figures, with 10 measured diagrams.'],
        ['THE EVIDENCE', 'Reporting from NYT, Reuters, AP, Bloomberg, NBC, Politico, Semafor, BBC, Forbes and congressional correspondence, 2024–2026.'],
      ].map(([k, v], i) => {
        const x = GRID.margin + i * ((W + 40) / 3);
        const lines = breakLines(v, 'sans500', 12.5, (W + 40) / 3 - 30);
        return (
          <g key={k}>
            <text x={x} y={678} fontFamily={F.mono} fontWeight={700} fontSize={9.5} fill={VERMILION} letterSpacing={1.8}>
              {k}
            </text>
            {lines.map((l, j) => (
              <text key={j} x={x} y={700 + j * 17} fontFamily={F.sans} fontWeight={500} fontSize={12.5} fill={INK_SOFT}>
                {l.text}
              </text>
            ))}
          </g>
        );
      })}

      <line x1={GRID.margin} y1={812} x2={GRID.right} y2={812} stroke={HAIR} strokeWidth={2} />
      <text x={GRID.margin} y={838} fontFamily={F.mono} fontWeight={500} fontSize={9.5} fill={MUTED} letterSpacing={1.2}>
        {STANDING.byline.toUpperCase()}
      </text>
      <text x={GRID.right} y={838} fontFamily={F.mono} fontWeight={700} fontSize={9.5} fill={MUTED} letterSpacing={1.6} textAnchor="end">
        VERSION {STANDING.version} · SWISS BROADSHEET
      </text>
    </g>
  );
};

const Contents: React.FC<{ book: Book }> = ({ book }) => {
  const rows = [
    { n: 'METHOD', t: 'Method and caveats', d: 'How the indices work, and what this book does not claim.', f: 3 },
    ...PARTS.map((p) => ({
      n: p.numeral,
      t: p.title,
      d: p.standfirst,
      f: book.pages.find((pg) => pg.frame.kind === 'partOpen' && pg.section.startsWith(p.numeral))?.frame.pageNo ?? 0,
    })),
    {
      n: 'APP',
      t: 'Sources and apparatus',
      d: 'Every citation, grouped by subject, plus the colophon.',
      f: book.pages.find((pg) => pg.frame.kind === 'sources')?.frame.pageNo ?? 0,
    },
  ];

  return (
    <g>
      <text x={GRID.margin} y={176} fontFamily={F.mono} fontWeight={700} fontSize={10} fill={VERMILION} letterSpacing={3}>
        THE ARGUMENT, IN SIX PARTS
      </text>
      <text x={GRID.margin} y={232} fontFamily={F.display} fontWeight={900} fontSize={52} fill={INK} letterSpacing={-1}>
        CONTENTS
      </text>
      <line x1={GRID.margin} y1={258} x2={GRID.right} y2={258} stroke={INK} strokeWidth={3} />

      {rows.map((row, i) => {
        const y = 306 + i * 62;
        const stand = breakLines(row.d, 'sans500', 11.5, 640);
        return (
          <g key={row.t}>
            <line x1={GRID.margin} y1={y + 22} x2={GRID.right} y2={y + 22} stroke={HAIR} strokeWidth={1} />
            <text x={GRID.margin} y={y} fontFamily={F.mono} fontWeight={700} fontSize={10} fill={VERMILION} letterSpacing={1.8}>
              {row.n}
            </text>
            <text x={GRID.margin + 96} y={y} fontFamily={F.display} fontWeight={700} fontSize={22} fill={INK}>
              {row.t}
            </text>
            {stand.map((l, j) => (
              <text key={j} x={560} y={y - 2 + j * 15} fontFamily={F.sans} fontWeight={500} fontSize={11.5} fill={MUTED}>
                {l.text}
              </text>
            ))}
            <text x={GRID.right} y={y} fontFamily={F.mono} fontWeight={700} fontSize={12} fill={INK} textAnchor="end" letterSpacing={1}>
              {String(row.f).padStart(3, '0')}
            </text>
          </g>
        );
      })}

      <text x={GRID.margin} y={GRID.bottom - 68} fontFamily={F.mono} fontWeight={700} fontSize={10} fill={MUTED} letterSpacing={2}>
        THE TEN PLATES
      </text>
      <line x1={GRID.margin} y1={GRID.bottom - 54} x2={GRID.right} y2={GRID.bottom - 54} stroke={HAIR_MID} strokeWidth={1} />
      {DIAGRAMS.map((d, i) => {
        const col = i % 5;
        const row = Math.floor(i / 5);
        const x = GRID.margin + col * 295;
        const y = GRID.bottom - 26 + row * 44;
        return (
          <g key={d.id}>
            <text x={x} y={y} fontFamily={F.numeral} fontSize={20} fill={VERMILION}>
              {d.numeral}
            </text>
            <text x={x + 26} y={y - 2} fontFamily={F.mono} fontWeight={700} fontSize={9.6} fill={INK} letterSpacing={0.8}>
              {d.title.toUpperCase()}
            </text>
            <text x={x + 26} y={y + 9} fontFamily={F.sans} fontWeight={500} fontSize={9} fill={MUTED}>
              {d.kind.replace('DUAL-LANE ', '').toLowerCase()}
            </text>
          </g>
        );
      })}
    </g>
  );
};

const Plate: React.FC<{ id: string; pageNo: number }> = ({ id, pageNo }) => {
  const d = DIAGRAMS.find((x) => x.id === id) ?? DIAGRAMS[0];
  const Comp = d.Comp;
  const W = GRID.right - GRID.margin;
  const titleSize = fitSize(d.title.toUpperCase(), 'display900', W * 0.55, 26, 40, -0.4);
  const dekLines = breakLines(d.dek, 'sans500', 11.5, 620, { maxLines: 1 });
  return (
    <g>
      <text x={GRID.margin} y={44} fontFamily={F.mono} fontWeight={700} fontSize={10} fill={VERMILION} letterSpacing={2.6}>
        {`FIG. ${d.numeral} · ${d.kind}`}
      </text>
      <text x={GRID.margin} y={94} fontFamily={F.display} fontWeight={900} fontSize={titleSize} fill={INK} letterSpacing={-0.4}>
        {d.title.toUpperCase()}
      </text>
      {dekLines.map((l, i) => (
        <text key={i} x={GRID.right} y={76 + i * 17} fontFamily={F.sans} fontWeight={500} fontSize={11.5} fill={MUTED} textAnchor="end">
          {l.text}
        </text>
      ))}
      <text x={GRID.right} y={44} fontFamily={F.mono} fontWeight={700} fontSize={9.5} fill={INK} letterSpacing={1.6} textAnchor="end">
        {`${String(pageNo).padStart(3, '0')} / ${String(TOTAL_PAGES).padStart(3, '0')}`}
      </text>
      <line x1={GRID.margin} y1={112} x2={GRID.right} y2={112} stroke={INK} strokeWidth={3} />
      <Comp />
    </g>
  );
};

/**
 * The page facing a plate. It carries a quiet running head — not the plate
 * title, which belongs to the figure — so the analysis reads as a page of the
 * book rather than a second cover.
 */
const Facing: React.FC<{ strap: string; pageNo: number }> = ({ strap, pageNo }) => {
  const m = /FIG\. (\d\d) · (.+)/.exec(strap);
  const d = m ? DIAGRAMS.find((x) => x.numeral === m[1]) : undefined;
  const readNo = (Number(m?.[1] ?? '0') - 1) * 4 + 1;
  return (
    <g>
      <text x={GRID.margin} y={44} fontFamily={F.mono} fontWeight={700} fontSize={9.6} fill={VERMILION} letterSpacing={2.6}>
        {d ? `READING · FIG. ${d.numeral} · ${d.kind}` : 'READING'}
      </text>
      <text x={GRID.right} y={44} fontFamily={F.mono} fontWeight={700} fontSize={9.5} fill={INK} letterSpacing={1.6} textAnchor="end">
        {`${String(pageNo).padStart(3, '0')} / ${String(TOTAL_PAGES).padStart(3, '0')}`}
      </text>
      <line x1={GRID.margin} y1={68} x2={GRID.right} y2={68} stroke={HAIR_MID} strokeWidth={2} />

      {d ? (
        <text x={GRID.margin} y={140} fontFamily={F.display} fontWeight={900} fontSize={34} fill={INK} letterSpacing={-0.4}>
          {`WHAT FIG. ${d.numeral} SHOWS`}
        </text>
      ) : null}
      {d ? (
        <text x={GRID.margin} y={174} fontFamily={F.serif} fontWeight={400} fontStyle="italic" fontSize={17} fill={INK_SOFT}>
          {d.question}
        </text>
      ) : null}
      <text x={GRID.right} y={174} fontFamily={F.mono} fontWeight={700} fontSize={8.6} fill={MUTED} letterSpacing={1.4} textAnchor="end">
        {`ANALYSIS ${readNo} · FOUR NOTES`}
      </text>
      <line x1={GRID.margin} y1={196} x2={GRID.right} y2={196} stroke={INK} strokeWidth={3} />
    </g>
  );
};

const Colophon: React.FC = () => (
  <g>
    <text x={GRID.margin} y={200} fontFamily={F.mono} fontWeight={700} fontSize={10} fill={VERMILION} letterSpacing={3}>
      COLOPHON
    </text>
    <text x={GRID.margin} y={262} fontFamily={F.display} fontWeight={900} fontSize={52} fill={INK} letterSpacing={-1}>
      HOW THIS WAS MADE
    </text>
    <line x1={GRID.margin} y1={286} x2={GRID.right} y2={286} stroke={INK} strokeWidth={3} />

    {[
      [
        'TYPESETTING',
        'No layout engine touched this book. Every paragraph was broken against real glyph advances read from the TTF files themselves, and every line is painted with a measured baseline. The browser cannot reflow a page, and neither can the PDF.',
      ],
      [
        'THE ENGINE',
        'This is the same Remotion + Vite press that produces the Bad Actors episodes: a manifest of content, a compositor, a measured legibility gate, and two renderers that must agree. Ten diagrams are drawn as pure SVG, so the projector player and the headless proof renderer produce the same picture to the pixel.',
      ],
      [
        'THE FACES',
        'League Spartan (display) · Anton (numerals) · Plus Jakarta Sans (text) · IBM Plex Mono (metadata) · Libre Baskerville (quotations) · Instrument Serif (editorial).',
      ],
      [
        'THE STOCK',
        'Eggshell #F6F4EE, carbon #121212, signal vermilion #C0241A, cobalt #1F3A93. Hairlines exactly two pixels. No cards, no shadows, no rounding.',
      ],
      [
        'THE LIMITS',
        'Indices are judgements, not measurements. Several factual claims rest on anonymous sourcing in a single outlet and are labelled as reported. This is an analysis of a moment — 8 November 2026 — and it will date.',
      ],
    ].map(([k, v], i) => {
      const y = 340 + i * 96;
      const lines = breakLines(v, 'sans500', 15.5, GRID.right - GRID.margin - 300);
      return (
        <g key={k}>
          <line x1={GRID.margin} y1={y - 22} x2={GRID.right} y2={y - 22} stroke={HAIR} strokeWidth={1} />
          <text x={GRID.margin} y={y} fontFamily={F.mono} fontWeight={700} fontSize={10} fill={VERMILION} letterSpacing={1.8}>
            {k}
          </text>
          {lines.map((l, j) => (
            <text key={j} x={GRID.margin + 240} y={y + j * 22} fontFamily={F.sans} fontWeight={500} fontSize={15.5} fill={INK_SOFT}>
              {l.text}
            </text>
          ))}
        </g>
      );
    })}
  </g>
);

// ─────────────────────────────────────────────────────────────────────────────
// part opener
// ─────────────────────────────────────────────────────────────────────────────

const PartOpening: React.FC<{ partIndex: number; pageNo: number }> = ({ partIndex, pageNo }) => {
  const part = PARTS[partIndex];
  if (!part) return null;
  const W = GRID.right - GRID.margin;
  const size = fitSize(part.title.toUpperCase(), 'display900', W, 44, 92, -1.4);
  const stand = breakLines(part.standfirst, 'serifIt', 21, W - 430);
  const plates = (part.plates ?? []).map((n) => DIAGRAMS.find((d) => d.numeral === n)).filter(Boolean);

  return (
    <g>
      {/* the numeral is a mark, not a title: a red slab anchored to the rule */}
      <rect x={GRID.margin} y={168} width={7} height={64} fill={VERMILION} />
      <text x={GRID.margin + 26} y={214} fontFamily={F.mono} fontWeight={700} fontSize={10.5} fill={VERMILION} letterSpacing={3}>
        {`PART ${part.numeral} OF VI`}
      </text>

      <text x={GRID.margin} y={312} fontFamily={F.display} fontWeight={900} fontSize={size} fill={INK} letterSpacing={-1.4}>
        {part.title.toUpperCase()}
      </text>
      <line x1={GRID.margin} y1={340} x2={GRID.right} y2={340} stroke={INK} strokeWidth={1} />

      {stand.map((l, i) => (
        <text key={i} x={GRID.margin} y={392 + i * 32} fontFamily={F.serif} fontStyle="italic" fontSize={21} fill={INK_SOFT}>
          {l.text}
        </text>
      ))}

      {plates.length ? (
        <g>
          <line x1={GRID.margin} y1={GRID.bottom - 58} x2={GRID.right} y2={GRID.bottom - 58} stroke={HAIR_MID} strokeWidth={1} />
          <text x={GRID.margin} y={GRID.bottom - 36} fontFamily={F.mono} fontWeight={700} fontSize={9.2} fill={MUTED} letterSpacing={1.8}>
            PLATES IN THIS PART
          </text>
          {plates.map((d, i) => (
            <g key={d!.id}>
              <text x={GRID.margin + 190 + i * 300} y={GRID.bottom - 36} fontFamily={F.mono} fontWeight={700} fontSize={9.2} fill={VERMILION} letterSpacing={1.2}>
                {d!.numeral}
              </text>
              <text x={GRID.margin + 214 + i * 300} y={GRID.bottom - 36} fontFamily={F.mono} fontWeight={700} fontSize={9.2} fill={INK} letterSpacing={1.2}>
                {d!.title.toUpperCase()}
              </text>
            </g>
          ))}
        </g>
      ) : null}
    </g>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// page
// ─────────────────────────────────────────────────────────────────────────────

export const renderPage = (page: BookPage, book: Book, total: number): React.ReactElement => {
  const { frame } = page;
  const isPlate = frame.kind === 'plate';
  const kind = frame.kind;

  if (kind === 'cover') {
    return (
      <g>
        <rect width={STAGE.w} height={STAGE.h} fill={PAPER} />
        <Cover />
      </g>
    );
  }

  return (
    <g>
      <rect width={STAGE.w} height={STAGE.h} fill={PAPER} />
      {isPlate ? (
        <Plate id={plateForPage(page)} pageNo={frame.pageNo} />
      ) : kind === 'reading' ? (
        <>
          <Facing strap={page.strap} pageNo={frame.pageNo} />
          {page.cols.map((atoms, ci) => {
            const colW = GRID.colW;
            const x = GRID.margin + ci * (colW + GRID.gutter);
            return <Column key={ci} atoms={atoms} x={x} y={frame.top} colW={colW} />;
          })}
          <FootOnly page={page} total={total} />
        </>
      ) : kind === 'contents' ? (
        <>
          <Contents book={book} />
          <Chrome page={page} total={total} />
        </>
      ) : kind === 'sources' || kind === 'method' ? (
        <>
          <text x={GRID.margin} y={176} fontFamily={F.mono} fontWeight={700} fontSize={10} fill={VERMILION} letterSpacing={3}>
            {kind === 'sources' ? 'APPARATUS' : 'PREFACE'}
          </text>
          <text x={GRID.margin} y={232} fontFamily={F.display} fontWeight={900} fontSize={48} fill={INK} letterSpacing={-0.8}>
            {kind === 'sources' ? 'SOURCES' : 'METHOD'}
          </text>
          <line x1={GRID.margin} y1={252} x2={GRID.right} y2={252} stroke={INK} strokeWidth={3} />
          <text x={GRID.right} y={232} fontFamily={F.mono} fontWeight={700} fontSize={9.6} fill={MUTED} letterSpacing={1.4} textAnchor="end">
            {kind === 'sources' ? 'GROUPED BY SUBJECT · 2025–2026' : 'FOUR INDICES · ZERO MEASUREMENTS'}
          </text>
          {page.cols.map((atoms, ci) => {
            const colW = GRID.colW;
            const x = GRID.margin + ci * (colW + GRID.gutter);
            return <Column key={ci} atoms={atoms} x={x} y={frame.top} colW={colW} />;
          })}
          <Chrome page={page} total={total} />
        </>
      ) : kind === 'colophon' ? (
        <>
          <Colophon />
          <Chrome page={page} total={total} />
        </>
      ) : (
        <>
          {kind === 'partOpen' ? <PartOpening partIndex={frame.partIndex} pageNo={frame.pageNo} /> : null}
          {page.cols.map((atoms, ci) => {
            const colW = frame.columns === 1 ? GRID.right - GRID.margin : GRID.colW;
            const x =
              frame.columns === 1
                ? GRID.margin
                : GRID.margin + ci * (colW + GRID.gutter);
            return <Column key={ci} atoms={atoms} x={x} y={frame.top} colW={colW} />;
          })}
          <Chrome page={page} total={total} />
        </>
      )}
    </g>
  );
};

/** plates are addressed by their FIG. number, which is stable across builds */
const plateForPage = (page: BookPage): string => {
  const m = /FIG\. (\d\d)/.exec(page.strap);
  if (m) {
    const d = DIAGRAMS.find((x) => x.numeral === m[1]);
    if (d) return d.id;
  }
  return DIAGRAMS[0].id;
};

let TOTAL_PAGES = 45;
export const setTotalPages = (n: number) => {
  TOTAL_PAGES = n;
};

export const BookPageSvg: React.FC<{ book: Book; index: number }> = ({ book, index }) => {
  const page = book.pages[Math.max(0, Math.min(index, book.pages.length - 1))];
  return (
    <svg viewBox={`0 0 ${STAGE.w} ${STAGE.h}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {renderPage(page, book, book.pages.length)}
    </svg>
  );
};

void METHOD;
void PAPER_DEEP;
void COBALT;
void SOURCES;
