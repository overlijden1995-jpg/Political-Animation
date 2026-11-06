import * as React from 'react';
import { handRect, handCircle } from '../theme/brush';
import { PALETTE } from '../theme/colors';

export type TransitionType = 'wipe' | 'iris' | 'panel';

interface TransitionProps {
  type?: TransitionType;
  /** 0..1 — 0 = fully covering screen, 1 = fully revealed */
  progress: number;
  width: number;
  height: number;
  color?: string;
}

export const Transition: React.FC<TransitionProps> = ({
  type = 'wipe',
  progress,
  width,
  height,
  color = PALETTE.paper,
}) => {
  const p = Math.min(Math.max(progress, 0), 1);

  if (type === 'iris') {
    // Circle reveals content from center outwards
    const r = Math.hypot(width, height) * (1 - p);
    return (
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
        <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
          <circle cx={width / 2} cy={height / 2} r={Math.max(r, 0)} fill={color} />
        </svg>
      </div>
    );
  }

  if (type === 'panel') {
    // A hand-drawn panel slides up from the bottom, covering the screen
    const panelH = height * (1 - p) + 60;
    return (
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: height - panelH,
          width,
          height: panelH,
          background: color,
          boxShadow: `0 20px 60px ${PALETTE.shadow}`,
          zIndex: 50,
        }}
      >
        <svg width={width} height={60} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
          <path
            d={handRect(0, 0, width, 60, { roughness: 1.5, seed: 61 })}
            fill="none"
            stroke={PALETTE.ink}
            strokeWidth="4"
          />
        </svg>
      </div>
    );
  }

  // 'wipe': a hand-drawn bar wipes across from left to right
  const wipeX = width * (1 - p);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        zIndex: 50,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: wipeX - 140,
          top: 0,
          width: 280,
          height: '100%',
          background: color,
          transform: `skewX(-12deg)`,
          transformOrigin: 'left center',
        }}
      />
      <svg width="280" height={height} style={{ position: 'absolute', left: wipeX - 140, top: 0, pointerEvents: 'none' }}>
        <path
          d={handRect(0, 0, 280, height, { roughness: 1.2, seed: 71 })}
          fill="none"
          stroke={PALETTE.ink}
          strokeWidth="5"
        />
      </svg>
    </div>
  );
};
