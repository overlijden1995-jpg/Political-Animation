import * as React from 'react';
import { handLine } from '../theme/brush';
import { PALETTE, FONT } from '../theme/colors';

export interface CaptionWord {
  text: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
}

interface CaptionsProps {
  /** Word-level captions, typically produced by the caption agent */
  captions: CaptionWord[];
  /** Current playhead time in seconds */
  time: number;
  /** How many words to show at once (1-3) */
  window?: number;
  fontSize?: number;
  y?: number; // absolute offset from bottom, default 140
  align?: 'center' | 'left' | 'right';
}

export const Captions: React.FC<CaptionsProps> = ({
  captions,
  time,
  window = 2,
  fontSize = 46,
  y = 140,
  align = 'center',
}) => {
  const active = captions.filter((c) => time >= c.start && time <= c.end);

  // Build a rolling window of up to `window` words around the active ones
  const idx = captions.findIndex((c) => time >= c.start && time <= c.end);
  let startIdx = idx === -1 ? Math.max(0, captions.length - window) : Math.max(0, idx - Math.floor(window / 2));
  startIdx = Math.min(startIdx, Math.max(0, captions.length - window));
  const windowWords = captions.slice(startIdx, startIdx + window);

  const highlight = windowWords.find((w) => time >= w.start && time <= w.end);

  const text = windowWords.map((w) => w.text).join(' ');
  const charOffsets: number[] = [0];
  windowWords.forEach((w, i) => {
    if (i > 0) charOffsets.push(charOffsets[i] + 1); // space
    charOffsets.push(charOffsets[i] + w.text.length);
  });

  const highlightRange = highlight
    ? {
        from: charOffsets[windowWords.indexOf(highlight) * 2],
        to: charOffsets[windowWords.indexOf(highlight) * 2 + 1],
      }
    : null;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: y,
        display: 'flex',
        justifyContent: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
        padding: '0 60px',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        filter: 'drop-shadow(0 4px 12px rgba(31,26,20,0.25))',
      }}
    >
      <div
        style={{
          fontFamily: FONT.heading,
          fontSize,
          fontWeight: 800,
          color: PALETTE.ink,
          textAlign: align,
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          lineHeight: 1.25,
          position: 'relative',
          display: 'inline-block',
        }}
      >
        {highlightRange ? (
          <>
            <span style={{ color: PALETTE.textMuted, fontWeight: 600 }}>
              {text.slice(0, highlightRange.from)}
            </span>
            <span
              style={{
                color: PALETTE.accent,
                background: 'rgba(15,98,254,0.18)',
                borderRadius: 6,
                padding: '2px 6px',
                margin: '0 -2px',
              }}
            >
              {text.slice(highlightRange.from, highlightRange.to)}
            </span>
            <span style={{ color: PALETTE.textMuted, fontWeight: 600 }}>
              {text.slice(highlightRange.to)}
            </span>
          </>
        ) : (
          <span style={{ color: PALETTE.textMuted, fontWeight: 600 }}>{text}</span>
        )}
      </div>
      {highlight && (
        <svg
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -34,
            transform: 'translateX(-50%)',
            width: 220,
            height: 26,
            pointerEvents: 'none',
          }}
        >
          <path
            d={handLine(0, 0, 200, 0, { roughness: 2.2, seed: 41, bow: 0.3 })}
            stroke={PALETTE.accent}
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      )}
    </div>
  );
};
