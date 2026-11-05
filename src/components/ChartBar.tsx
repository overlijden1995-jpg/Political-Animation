import * as React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { handRect, handLine } from '../theme/brush';
import { PALETTE, FONT } from '../theme/colors';

interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

interface ChartBarProps {
  data: BarDatum[];
  /** Maximum value of the axis (for scaling bar lengths) */
  maxValue: number;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  /** Frames over which bars grow from 0 to value */
  animateFrom?: number;
  animateTo?: number;
  showValues?: boolean;
}

export const ChartBar: React.FC<ChartBarProps> = ({
  data,
  maxValue,
  width = 600,
  height = 300,
  x = 0,
  y = 0,
  animateFrom,
  animateTo,
  showValues = true,
}) => {
  const frame = useCurrentFrame();
  const barW = width / data.length - 28;
  const baseY = height - 56;

  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height }}>
      {/* Axis */}
      <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        <path
          d={handLine(40, baseY, width - 20, baseY, { roughness: 0.8, seed: 81 })}
          stroke={PALETTE.inkSoft}
          strokeWidth="2.5"
          fill="none"
        />
        {/* Gridlines */}
        {[0.25, 0.5, 0.75, 1].map((t) => {
          const gy = baseY - t * (height - 90);
          return (
            <path
              key={t}
              d={handLine(40, gy, width - 20, gy, { roughness: 0.6, seed: 82 })}
              stroke="#E8E2D2"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              fill="none"
            />
          );
        })}
      </svg>

      {data.map((datum, i) => {
        const cx = 60 + i * (barW + 28) + barW / 2;
        let progress = 1;
        if (animateFrom != null && animateTo != null) {
          progress = interpolate(frame, [animateFrom, animateTo], [0, 1]);
          progress = Math.min(Math.max(progress, 0), 1);
        }
        const barH = (datum.value / maxValue) * (height - 90) * progress;
        const color = datum.color ?? PALETTE.accent;

        return (
          <React.Fragment key={datum.label}>
            <svg width={barW} height={height} style={{ position: 'absolute', left: cx - barW / 2, top: 0, overflow: 'visible' }}>
              <path
                d={handRect(0, baseY - barH, barW, barH, { roughness: 1.1, seed: 90 + i })}
                fill={color}
                stroke={PALETTE.ink}
                strokeWidth="2"
              />
              {/* Hatch texture inside the bar */}
              {Array.from({ length: Math.max(2, Math.floor(barH / 14)) }).map((_, j) => (
                <path
                  key={j}
                  d={handLine(6, baseY - barH + j * 16, barW - 6, baseY - barH + j * 16, {
                    roughness: 0.5,
                    seed: 100 + i * 13 + j,
                  })}
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="1.2"
                  fill="none"
                />
              ))}
            </svg>
            {showValues && (
              <div
                style={{
                  position: 'absolute',
                  left: cx - barW / 2,
                  top: baseY - barH - 30,
                  width: barW,
                  textAlign: 'center',
                  fontFamily: FONT.body,
                  fontSize: 14,
                  fontWeight: 800,
                  color: PALETTE.ink,
                  opacity: progress,
                  pointerEvents: 'none',
                  transform: `scale(${progress})`,
                  transformOrigin: 'center',
                }}
              >
                {datum.value}
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                left: cx - barW / 2,
                top: baseY + 8,
                width: barW,
                textAlign: 'center',
                fontFamily: FONT.body,
                fontSize: 13,
                color: PALETTE.textMuted,
                fontWeight: 600,
                pointerEvents: 'none',
              }}
            >
              {datum.label}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
