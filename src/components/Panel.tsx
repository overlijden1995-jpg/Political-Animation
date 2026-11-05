import * as React from 'react';
import { handRect } from '../theme/brush';
import { PALETTE, LAYOUT } from '../theme/colors';

/**
 * Comic-strip panel: a card with an inked, hand-drawn border that never quite
 * meets at the corners. Panels can tilt slightly for a hand-laid feel.
 */
interface PanelProps {
  children?: React.ReactNode;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;        // degrees, slight tilt
  borderColor?: string;
  fill?: string;
  dashed?: boolean;
  borderWidth?: number;
  shadow?: boolean;
  radius?: number;
}

export const Panel: React.FC<PanelProps> = ({
  children,
  x = 0,
  y = 0,
  width = 400,
  height = 300,
  rotation = 0,
  borderColor = PALETTE.ink,
  fill = PALETTE.paperAlt,
  dashed = false,
  borderWidth = LAYOUT.inkWidth,
  shadow = true,
  radius = LAYOUT.panelRadius,
}) => {
  const border = handRect(0, 0, width, height, {
    roughness: 1.2,
    seed: 11,
    close: true,
  });

  return (
    <div
      style={{
      position: 'absolute',
      left: x,
      top: y,
      width,
      height,
      transform: `rotate(${rotation}deg)`,
      transformOrigin: `${width / 2}px ${height / 2}px`,
      boxShadow: shadow ? `0 10px 30px ${PALETTE.shadow}` : 'none',
      borderRadius: radius,
      overflow: 'hidden',
    }}
    >
      {/* Card fill */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: fill,
          borderRadius: radius,
          pointerEvents: 'none',
        }}
      />
      {/* Hand-drawn ink border drawn over the card */}
      <svg
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >
        <path
          d={border}
          fill="none"
          stroke={borderColor}
          strokeWidth={borderWidth}
          strokeDasharray={dashed ? '6 6' : 'none'}
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: Math.max(borderWidth * 2, 12),
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
    </div>
  );
};
