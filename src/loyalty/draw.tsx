import * as React from 'react';

/**
 * Print primitives for the exhibit sheets.
 *
 * Every diagram is pure SVG (no CSS classes, no foreignObject) so the exact
 * same markup can be drawn by the projector player *and* rasterised headlessly
 * by `scripts/loyalty_still.ts`. Nothing is typeset by a layout engine: each
 * string is placed at a known baseline.
 */

export const PAPER = '#F6F4EE';
export const PAPER_DEEP = '#EBE6DA';
export const INK = '#121212';
export const INK_SOFT = '#322E28';
export const MUTED = '#6B6559';
export const HAIR = 'rgba(18,18,18,0.16)';
export const HAIR_MID = 'rgba(18,18,18,0.34)';
export const HAIR_STRONG = 'rgba(18,18,18,0.66)';
export const VERMILION = '#C0241A';
export const COBALT = '#1F3A93';
export const YELLOW = '#F5D90A';

export const F = {
  display: '"League Spartan"',
  numeral: '"Anton"',
  mono: '"IBM Plex Mono"',
  sans: '"Plus Jakarta Sans"',
  serif: '"Instrument Serif"',
  serifBask: '"Libre Baskerville"',
} as const;

type Anchor = 'start' | 'middle' | 'end';

interface TxtProps {
  x: number;
  y: number;
  children: React.ReactNode;
  size?: number;
  fill?: string;
  font?: string;
  weight?: number;
  anchor?: Anchor;
  spacing?: number;
  italic?: boolean;
  opacity?: number;
  transform?: string;
}

/** One line of type, baseline-placed. */
export const Txt: React.FC<TxtProps> = ({
  x,
  y,
  children,
  size = 12,
  fill = INK,
  font = F.sans,
  weight = 500,
  anchor = 'start',
  spacing,
  italic,
  opacity,
  transform,
}) => (
  <text
    x={x}
    y={y}
    fontFamily={font}
    fontSize={size}
    fontWeight={weight}
    fill={fill}
    textAnchor={anchor}
    letterSpacing={spacing}
    fontStyle={italic ? 'italic' : undefined}
    opacity={opacity}
    transform={transform}
  >
    {children}
  </text>
);

/** Small caps metadata: mono, tracked out, muted. */
export const Kicker: React.FC<{ x: number; y: number; children: React.ReactNode; fill?: string; anchor?: Anchor; size?: number }> = ({
  x,
  y,
  children,
  fill = MUTED,
  anchor = 'start',
  size = 9,
}) => (
  <Txt x={x} y={y} size={size} fill={fill} font={F.mono} weight={700} spacing={1.6} anchor={anchor}>
    {children}
  </Txt>
);

export const Rule: React.FC<{ x1: number; y1: number; x2: number; y2: number; strong?: boolean; dash?: string; opacity?: number }> = ({
  x1,
  y1,
  x2,
  y2,
  strong,
  dash,
  opacity,
}) => (
  <line
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    stroke={strong ? HAIR_STRONG : HAIR}
    strokeWidth={2}
    strokeDasharray={dash}
    opacity={opacity}
  />
);

/** A framed panel: hairline box, uppercase caption in the top-left gutter. */
export const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  children?: React.ReactNode;
  title?: string;
  fill?: string;
  dashed?: boolean;
  titleRight?: string;
}> = ({ x, y, w, h, children, title, fill = 'none', dashed, titleRight }) => (
  <g>
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      fill={fill}
      stroke={HAIR_MID}
      strokeWidth={2}
      strokeDasharray={dashed ? '6 6' : undefined}
    />
    {title ? <Kicker x={x + 14} y={y + 22} size={10}>{title}</Kicker> : null}
    {titleRight ? (
      <Kicker x={x + w - 14} y={y + 22} size={10} anchor="end" fill={MUTED}>
        {titleRight}
      </Kicker>
    ) : null}
    {children}
  </g>
);

export const Legend: React.FC<{
  x: number;
  y: number;
  items: Array<{ label: string; color: string; kind?: 'dot' | 'line' | 'square' | 'dash' }>;
  gap?: number;
}> = ({ x, y, items, gap = 0 }) => {
  // measured advance: never let a legend item run into the next one
  let cursor = x;
  const pos = items.map((it) => {
    const at = cursor;
    cursor += widthOf(it.label, 8.6) + (gap || 30);
    return at;
  });
  return (
  <g>
    {items.map((it, i) => {
      const cx = pos[i];
      const kind = it.kind ?? 'dot';
      return (
        <g key={it.label}>
          {kind === 'dot' ? <circle cx={cx + 4} cy={y - 3.5} r={4.5} fill={it.color} /> : null}
          {kind === 'square' ? <rect x={cx - 1} y={y - 8} width={9} height={9} fill={it.color} /> : null}
          {kind === 'line' ? <line x1={cx - 4} y1={y - 4} x2={cx + 12} y2={y - 4} stroke={it.color} strokeWidth={2.5} /> : null}
          {kind === 'dash' ? (
            <line x1={cx - 4} y1={y - 4} x2={cx + 12} y2={y - 4} stroke={it.color} strokeWidth={2.5} strokeDasharray="5 4" />
          ) : null}
          <Txt x={cx + 18} y={y} size={8.6} font={F.mono} weight={700} fill={MUTED} spacing={0.8}>
            {it.label}
          </Txt>
        </g>
      );
    })}
  </g>
  );
};

/**
 * Advance of a tracked mono label. IBM Plex Mono sets every glyph at 0.6 em, so
 * the measurement is exact for this face without loading the TTF.
 */
const widthOf = (text: string, size: number, spacing = 0.8): number =>
  text.length * size * 0.6 + Math.max(0, text.length - 1) * spacing;

/** Callout: a hairline leader from a point to a text block. */
export const Callout: React.FC<{
  x: number;
  y: number;
  tx: number;
  ty: number;
  title: string;
  body?: string[];
  anchor?: Anchor;
  color?: string;
  width?: number;
}> = ({ x, y, tx, ty, title, body = [], anchor = 'start', color = INK, width = 190 }) => {
  const dir = anchor === 'end' ? -1 : 1;
  return (
    <g>
      <circle cx={x} cy={y} r={3} fill={color} />
      <polyline
        points={`${x},${y} ${tx},${ty}`}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        opacity={0.55}
      />
      <line x1={tx} y1={ty} x2={tx + dir * 10} y2={ty} stroke={color} strokeWidth={1.4} opacity={0.55} />
      <Txt x={tx + dir * 14} y={ty + 3} size={10.5} font={F.mono} weight={700} fill={color} spacing={0.6} anchor={anchor}>
        {title}
      </Txt>
      {body.map((line, i) => (
        <Txt
          key={line}
          x={tx + dir * 14}
          y={ty + 18 + i * 13}
          size={10}
          font={F.sans}
          weight={500}
          fill={MUTED}
          anchor={anchor}
        >
          {clip(line, width / 5.4)}
        </Txt>
      ))}
    </g>
  );
};

/** Crude but deterministic truncation — diagrams never rely on wrap. */
export const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, Math.max(0, max - 1))}…` : s);

/** Arrowhead marker definitions, injected once per sheet. */
export const Defs: React.FC = () => (
  <defs>
    {[
      ['ink', INK],
      ['verm', VERMILION],
      ['cob', COBALT],
      ['mut', MUTED],
      ['strong', HAIR_STRONG],
    ].map(([id, col]) => (
      <marker key={id} id={`arw-${id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill={col} />
      </marker>
    ))}
  </defs>
);

/** Thin bar, drawn from a baseline. */
export const Bar: React.FC<{ x: number; y: number; w: number; h: number; fill?: string; opacity?: number }> = ({
  x,
  y,
  w,
  h,
  fill = INK,
  opacity = 1,
}) => <rect x={x} y={y - h} width={Math.max(w, 0.6)} height={Math.max(h, 0.6)} fill={fill} opacity={opacity} />;

export const dot = (cx: number, cy: number, r: number, fill: string) => (
  <circle cx={cx} cy={cy} r={Math.max(r, 1)} fill={fill} />
);

/** Deterministic pseudo-random for texture — same seed, same picture. */
export const seeded = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
};
