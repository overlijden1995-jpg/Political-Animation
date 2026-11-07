import * as React from 'react';
import { CRISP_TEXT, GRID, HAIR, PRINT, TYPE } from './tokens';
import { fitText } from './measure';

/* --------------------------------------------------------------- primitives */

/**
 * Typographic quotes. Straight marks are the single biggest "this was typed in
 * a browser" tell on a printed page; every string that reaches the page passes
 * through here first. Length is preserved (1 char → 1 char) so measured line
 * breaks and highlight offsets stay valid.
 */
export const smartQuotes = (text: string): string =>
  text
    .replace(/(\w)'(\w)/g, '$1\u2019$2')
    .replace(/(^|[\s(\[{—–])'/g, '$1\u2018')
    .replace(/'/g, '\u2019')
    .replace(/"([^"]*)"/g, '\u201C$1\u201D')
    .replace(/(^|[\s(\[{—–])"/g, '$1\u201C')
    .replace(/"/g, '\u201D');

/** Hairline rule on an integer coordinate — always exactly HAIR px. */
export const Rule: React.FC<{
  x: number;
  y: number;
  width: number;
  color?: string;
  thickness?: number;
  opacity?: number;
  style?: React.CSSProperties;
}> = ({ x, y, width, color = PRINT.ink, thickness = HAIR, opacity = 1, style }) => (
  <div
    style={{
      position: 'absolute',
      left: Math.round(x),
      top: Math.round(y),
      width: Math.round(width),
      height: thickness,
      background: color,
      opacity,
      ...style,
    }}
  />
);

/** Oversized display type that lays out its own lines (no browser wrapping). */
export interface FittedProps {
  text: string;
  family: string;
  weight: number;
  maxWidth: number;
  maxLines: number;
  maxSize: number;
  minSize?: number;
  letterSpacing?: number;
  /** Multiplier of font size. */
  lineHeight?: number;
  color?: string;
  align?: 'left' | 'right' | 'center';
  transform?: React.CSSProperties['textTransform'];
  style?: React.CSSProperties;
  /** Animate the block in over `dur` seconds after `delay`. */
  progress?: number;
}

export const Fitted: React.FC<FittedProps> = ({
  text,
  family,
  weight,
  maxWidth,
  maxLines,
  maxSize,
  minSize = 30,
  letterSpacing = 0,
  lineHeight = 1,
  color = PRINT.ink,
  align = 'left',
  transform,
  style,
  progress = 1,
}) => {
  const copy = smartQuotes(text);
  const fit = fitText({ text: copy, family, weight, maxWidth, maxLines, maxSize, minSize, letterSpacing });
  const clamped = Math.max(0, Math.min(1, progress));
  const lines = fit.lines.slice(0, maxLines);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
        opacity: clamped,
        transform: `translateY(${(1 - clamped) * 10}px)`,
        overflow: 'hidden',
        ...style,
      }}
    >
      {lines.map((line, i) => (
        <div
          key={`${i}-${line}`}
          style={{
            fontFamily: family,
            fontWeight: weight,
            fontSize: fit.size,
            lineHeight,
            ...(letterSpacing ? { letterSpacing } : {}),
            color,
            whiteSpace: 'nowrap',
            ...(transform ? { textTransform: transform } : {}),
            ...CRISP_TEXT,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
};

/** Small caps metadata line. */
export const Kicker: React.FC<{
  children: React.ReactNode;
  color?: string;
  size?: number;
  letterSpacing?: number;
  weight?: number;
  style?: React.CSSProperties;
}> = ({ children, color = PRINT.muted, size = 15, letterSpacing = 0.18, weight = 500, style }) => (
  <div
    style={{
      fontFamily: TYPE.mono,
      fontWeight: weight,
      fontSize: size,
      letterSpacing: `${letterSpacing}em`,
      textTransform: 'uppercase',
      color,
      whiteSpace: 'nowrap',
      ...CRISP_TEXT,
      ...style,
    }}
  >
    {typeof children === 'string' ? smartQuotes(children) : children}
  </div>
);

/** Body copy: measured, wrapped, and clipped so it can never push the grid. */
export const Copy: React.FC<{
  text: string;
  size: number;
  maxWidth: number;
  maxLines: number;
  color?: string;
  weight?: number;
  family?: string;
  lineHeight?: number;
  letterSpacing?: number;
  style?: React.CSSProperties;
}> = ({
  text,
  size,
  maxWidth,
  maxLines,
  color = PRINT.inkSoft,
  weight = 500,
  family = TYPE.sans,
  lineHeight = 1.38,
  letterSpacing = 0,
  style,
}) => {
  const lines = fitText({
    text: smartQuotes(text),
    family,
    weight,
    maxWidth,
    maxLines,
    maxSize: size,
    minSize: size,
    letterSpacing,
  }).lines.slice(0, maxLines);
  return (
    <div style={{ ...CRISP_TEXT, ...style }}>
      {lines.map((line, i) => (
        <div
          key={`${i}-${line}`}
          style={{
            fontFamily: family,
            fontWeight: weight,
            fontSize: size,
            lineHeight,
            letterSpacing,
            color,
            whiteSpace: 'nowrap',
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------- photo */

export const PhotoPlate: React.FC<{
  src: string;
  x?: number;
  y: number;
  width: number;
  height: number;
  /** Slow drift keeps a still frame from feeling like a dead web page. */
  zoom?: number;
  label?: string;
  priority?: boolean;
}> = ({ src, x = 0, y, width, height, zoom = 1, label, priority }) => (
  <div
    style={{
      position: 'absolute',
      left: Math.round(x),
      top: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
      overflow: 'hidden',
      background: PRINT.matte,
    }}
  >
    <img
      src={src}
      alt=""
      loading={priority ? 'eager' : 'lazy'}
      decoding="sync"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center 22%',
        filter: 'grayscale(1) contrast(1.14) brightness(1.02)',
        transform: `scale(${zoom})`,
        transformOrigin: 'center 30%',
        display: 'block',
      }}
    />
    {label && (
      <div style={{ position: 'absolute', left: 28, top: 26 }}>
        <Kicker size={13} color={PRINT.white} weight={700} style={{ textShadow: '0 0 8px rgba(0,0,0,0.85)' }}>
          {label}
        </Kicker>
      </div>
    )}
  </div>
);

/* ------------------------------------------------------------------- chrome */

export const RunningHead: React.FC<{ left: string; right: string; x?: number; width?: number }> = ({
  left,
  right,
  x = GRID.colX,
  width = GRID.colW,
}) => (
  <>
    <div
      style={{
        position: 'absolute',
        left: x,
        top: 44,
        width,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}
    >
      <Kicker size={14} color={PRINT.muted} letterSpacing={0.2}>
        {left}
      </Kicker>
      <Kicker size={14} color={PRINT.inkSoft} letterSpacing={0.2} weight={700}>
        {right}
      </Kicker>
    </div>
    <Rule x={x} y={76} width={width} color={PRINT.hair} />
  </>
);

/** Page number set like a print folio: big condensed figure, small total. */
export const Folio: React.FC<{ page: number; total: number; x?: number; y?: number; color?: string; muted?: string }> = ({
  page,
  total,
  x = 1848,
  y = 968,
  color = PRINT.ink,
  muted = PRINT.muted,
}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: y,
      width: x,
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'baseline',
      gap: 8,
      paddingRight: 0,
    }}
  >
    <div
      style={{
        fontFamily: TYPE.numeral,
        fontSize: 34,
        lineHeight: 1,
        color,
        ...CRISP_TEXT,
      }}
    >
      {String(page).padStart(2, '0')}
    </div>
    <div style={{ fontFamily: TYPE.mono, fontSize: 13, color: muted, letterSpacing: '0.14em' }}>
      / {String(total).padStart(2, '0')}
    </div>
  </div>
);
