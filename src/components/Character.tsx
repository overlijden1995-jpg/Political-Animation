import * as React from 'react';
import { useCurrentFrame } from 'remotion';
import { handCircle, handLine } from '../theme/brush';
import { PALETTE, FONT } from '../theme/colors';

export type Emotion = 'neutral' | 'happy' | 'worried' | 'sad' | 'angry' | 'shocked';
export type Direction = 'left' | 'right';

interface CharacterProps {
  x: number;
  y: number;
  scale?: number;
  emotion?: Emotion;
  direction?: Direction;
  /** Current Remotion frame — drives blinking and idle breathing */
  frame?: number;
  skinTone?: string;
  shirtColor?: string;
}

const SKIN = '#F0C9A6';
const SHIRT = '#0F62FE';

/** Blink cycle: eyes closed for 3 frames every 90 frames. */
const blink = (frame: number) => (frame % 90) >= 87 && (frame % 90) < 90;

const mouthPath = (emotion: Emotion, cx: number, cy: number, w: number) => {
  const r = w / 2;
  switch (emotion) {
    case 'happy':
      return `M ${cx - r * 0.6} ${cy} Q ${cx} ${cy + r * 0.5} ${cx + r * 0.6} ${cy}`;
    case 'sad':
      return `M ${cx - r * 0.6} ${cy} Q ${cx} ${cy - r * 0.5} ${cx + r * 0.6} ${cy}`;
    case 'angry':
      return `M ${cx - r * 0.5} ${cy + r * 0.15} L ${cx + r * 0.5} ${cy + r * 0.15}`;
    case 'shocked':
      return handCircle(cx, cy, r * 0.35, { roughness: 1, seed: 5 });
    case 'worried':
      return `M ${cx - r * 0.45} ${cy} Q ${cx} ${cy + r * 0.3} ${cx + r * 0.45} ${cy} M ${cx - r * 0.2} ${cy - r * 0.15} L ${cx + r * 0.2} ${cy - r * 0.15}`;
    default:
      return `M ${cx - r * 0.4} ${cy + r * 0.05} L ${cx + r * 0.4} ${cy + r * 0.05}`;
  }
};

const browPath = (emotion: Emotion, cx: number, cy: number, side: 'left' | 'right') => {
  const sign = side === 'left' ? -1 : 1;
  const baseX = cx + sign * 18;
  switch (emotion) {
    case 'angry':
      return handLine(baseX, cy - 8, baseX + sign * 10, cy + 2, { roughness: 0.6, seed: 7 });
    case 'worried':
      return handLine(baseX, cy - 6, baseX + sign * 6, cy - 10, { roughness: 0.6, seed: 8 });
    case 'sad':
      return handLine(baseX, cy - 4, baseX + sign * 10, cy + 2, { roughness: 0.6, seed: 9 });
    default:
      return handLine(baseX, cy - 6, baseX + sign * 8, cy - 4, { roughness: 0.6, seed: 10 });
  }
};

export const Character: React.FC<CharacterProps> = ({
  x = 0,
  y = 0,
  scale = 1,
  emotion = 'neutral',
  direction = 'right',
  frame = 0,
  skinTone = SKIN,
  shirtColor = SHIRT,
}) => {
  const closed = blink(frame);
  // Gentle idle breathing bob
  const bob = Math.sin(frame * 0.12) * 1.5;
  const lookX = direction === 'right' ? 4 : -4;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + bob,
        transform: `scale(${scale})`,
        transformOrigin: 'center',
      }}
    >
      <svg width="260" height="360" style={{ overflow: 'visible' }}>
        {/* Drop shadow */}
        <ellipse cx="130" cy="330" rx="60" ry="14" fill="#000" opacity={0.12} />

        {/* Legs */}
        <rect x="90" y="250" width="22" height="70" rx="8" fill="#6B5B4B" />
        <rect x="148" y="250" width="22" height="70" rx="8" fill="#6B5B4B" />
        {/* Shoes */}
        <path d="M 85 320 Q 95 330 115 322 L 120 322 Q 130 330 125 320 Z" fill="#3D3228" />
        <path d="M 145 320 Q 155 330 175 322 L 180 322 Q 190 330 185 320 Z" fill="#3D3228" />

        {/* Torso */}
        <path
          d="M 90 180 Q 90 250 130 260 L 170 260 Q 210 250 210 180 Z"
          fill={shirtColor}
          stroke={PALETTE.ink}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <rect x="115" y="130" width="30" height="22" rx="6" fill={skinTone} /> {/* neck */}

        {/* Arms */}
        <line x1="100" y1="200" x2="55" y2="250" stroke="#6B5B4B" strokeWidth="14" strokeLinecap="round" />
        <line x1="160" y1="200" x2="205" y2="250" stroke="#6B5B4B" strokeWidth="14" strokeLinecap="round" />
        <circle cx="48" cy="252" r="9" fill={skinTone} stroke={PALETTE.ink} strokeWidth="2" />
        <circle cx="212" cy="252" r="9" fill={skinTone} stroke={PALETTE.ink} strokeWidth="2" />

        {/* Head */}
        <circle cx="130" cy="100" r="50" fill={skinTone} stroke={PALETTE.ink} strokeWidth="2.5" />
        {/* Hair */}
        <path
          d="M 88 85 Q 130 55 172 85 L 172 105 Q 130 100 88 105 Z"
          fill="#4A3A2E"
          stroke={PALETTE.inkSoft}
          strokeWidth="2"
        />

        {/* Ears */}
        <circle cx="84" cy="105" r="8" fill={skinTone} stroke={PALETTE.ink} strokeWidth="2" />
        <circle cx="176" cy="105" r="8" fill={skinTone} stroke={PALETTE.ink} strokeWidth="2" />

        {/* Eyes */}
        <g stroke={PALETTE.ink} strokeWidth="2.5" strokeLinecap="round">
          {closed ? (
            <>
              <line x1="104" y1="95" x2="120" y2="95" />
              <line x1="140" y1="95" x2="156" y2="95" />
            </>
          ) : (
            <>
              <circle cx="112" cy="95" r="13" fill={PALETTE.white} />
              <circle cx="148" cy="95" r="13" fill={PALETTE.white} />
              <circle cx={112 + lookX * 0.35} cy="95" r="4.5" fill={PALETTE.ink} />
              <circle cx={148 + lookX * 0.35} cy="95" r="4.5" fill={PALETTE.ink} />
            </>
          )}
        </g>

        {/* Brows */}
        <g>{browPath(emotion, 130, 78, 'left')}</g>
        <g>{browPath(emotion, 130, 78, 'right')}</g>

        {/* Mouth */}
        <path d={mouthPath(emotion, 130, 118, 20)} fill="none" stroke={PALETTE.ink} strokeWidth="2.5" strokeLinecap="round" />

        {/* Cheek blush when happy/shocked */}
        {(emotion === 'happy' || emotion === 'shocked') && (
          <>
            <circle cx="98" cy="112" r="6" fill="#F28C8C" opacity={0.55} />
            <circle cx="162" cy="112" r="6" fill="#F28C8C" opacity={0.55} />
          </>
        )}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: x - 40 * scale,
          top: y + 350 * scale + bob,
          width: 120 * scale,
          textAlign: 'center',
          fontFamily: FONT.body,
          fontSize: 14 * scale,
          color: PALETTE.textMuted,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
