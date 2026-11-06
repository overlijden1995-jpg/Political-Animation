import * as React from 'react';
import { handLine } from '../theme/brush';
import { PALETTE, FONT, LAYOUT } from '../theme/colors';

interface LowerThirdProps {
  name: string;
  role: string;
  x?: number;
  y?: number;
  width?: number;
  accent?: string;
  /** 0..1 appear animation progress */
  appear?: number;
}

export const LowerThird: React.FC<LowerThirdProps> = ({
  name,
  role,
  x = 60,
  y = 860,
  width = 520,
  accent = PALETTE.accent,
  appear = 1,
}) => {
  const barWidth = width * 0.22 * appear;
  const translate = (1 - appear) * 40;
  const opacity = appear;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        opacity,
        transform: `translateY(${translate}px)`,
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 14,
          width: barWidth,
          height: 10,
          background: accent,
          borderRadius: 4,
        }}
      />
      <svg
        width={width}
        height={6}
        style={{ position: 'absolute', left: 0, top: 40, pointerEvents: 'none' }}
      >
        <path
          d={handLine(0, 0, width, 0, { roughness: 1.5, seed: 51 })}
          stroke={PALETTE.inkSoft}
          strokeWidth="2"
          fill="none"
          opacity={0.6}
        />
      </svg>
      <div
        style={{
          position: 'relative',
          fontFamily: FONT.heading,
          fontSize: 26,
          fontWeight: 800,
          color: PALETTE.ink,
          lineHeight: 1.15,
          marginBottom: 4,
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontFamily: FONT.body,
          fontSize: 18,
          color: PALETTE.textMuted,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {role}
      </div>
    </div>
  );
};
