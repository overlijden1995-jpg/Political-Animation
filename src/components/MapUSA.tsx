import * as React from 'react';
import { handLine } from '../theme/brush';
import { PALETTE } from '../theme/colors';

/**
 * Stylized, hand-drawn map of the United States for politics explainers.
 * The mainland is split into 8 regions; Alaska and Hawaii sit as insets.
 * Regions can be colored individually (e.g. by party) and highlighted.
 */
export type USRegion =
  | 'west'
  | 'mountain'
  | 'midwest'
  | 'south'
  | 'northeast'
  | 'texas'
  | 'florida'
  | 'alaska'
  | 'hawaii';

const jitterPoly = (points: number[][], seed = 0, amount = 1.6) => {
  return points.map(([x, y], i) => {
    const t = seed * 0.01 + i * 0.1;
    // Deterministic pseudo noise without RNG: reuse sin-based hash
    const nx = Math.sin(seed * 137.5 + i * 12.9898 + t) * 43758.5453123;
    const ny = Math.cos(seed * 89.1 + i * 78.233 + t) * 43758.5453123;
    const dx = (nx - Math.floor(nx)) * amount - amount / 2;
    const dy = (ny - Math.floor(ny)) * amount - amount / 2;
    return [x + dx, y + dy] as [number, number];
  });
};

const poly = (points: [number, number][]) => points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

// Regions drawn inside a 1000x560 viewBox (mainland approx 60..860 x, 90..470 y)
const REGIONS: Record<USRegion, [number, number][]> = {
  west: jitterPoly([
    [70, 300], [125, 275], [150, 135], [200, 135], [205, 300], [170, 345], [120, 325], [85, 310],
  ]),
  mountain: jitterPoly([
    [170, 135], [330, 145], [355, 270], [305, 305], [265, 325], [205, 300], [195, 135],
  ], 7),
  midwest: jitterPoly([
    [330, 145], [560, 155], [590, 320], [470, 330], [355, 270], [350, 145],
  ], 11),
  south: jitterPoly([
    [470, 330], [700, 345], [725, 425], [585, 440], [520, 400], [590, 320], [470, 330],
  ], 11),
  northeast: jitterPoly([
    [640, 165], [825, 175], [815, 260], [745, 280], [705, 300], [640, 260], [635, 165],
  ], 7),
  texas: jitterPoly([
    [470, 260], [645, 280], [620, 395], [525, 430], [470, 330],
  ], 11),
  florida: jitterPoly([
    [725, 395], [795, 425], [820, 450], [770, 465], [725, 425],
  ], 7),
  alaska: jitterPoly([
    [850, 485], [945, 460], [940, 515], [860, 545], [845, 495],
  ], 5),
  hawaii: jitterPoly([
    [885, 528], [915, 528], [905, 542], [875, 542], [880, 532],
  ], 5),
};

const REGION_LABELS: Record<USRegion, [number, number]> = {
  west: [130, 230],
  mountain: [250, 200],
  midwest: [440, 225],
  south: [580, 370],
  northeast: [730, 210],
  texas: [555, 335],
  florida: [765, 425],
  alaska: [898, 500],
  hawaii: [895, 530],
};

interface RegionFill {
  [key: string]: string;
}

interface MapUSAProps {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  /** Default fill for regions not in regionColors */
  fill?: string;
  /** Per-region fill overrides */
  regionColors?: RegionFill;
  /** Region id to emphasize (stroke gets thicker + glow) */
  highlighted?: string;
  /** Show region labels */
  labels?: boolean;
}

const DEFAULT_FILL = '#C9D6EA';
const STROKE = PALETTE.ink;

export const MapUSA: React.FC<MapUSAProps> = ({
  width = 700,
  height = 392,
  x = 0,
  y = 0,
  fill = DEFAULT_FILL,
  regionColors,
  highlighted,
  labels = true,
}) => {
  const scaleX = width / 1000;
  const scaleY = height / 560;

  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height }}>
      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
      >
        {Object.entries(REGIONS).map(([id, points]) => {
          const key = id as USRegion;
          const isHighlighted = highlighted === key;
          const scaled = points.map(([px, py]) => [px * scaleX, py * scaleY]);
          return (
            <path
              key={key}
              d={`M ${scaled.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' L ')} Z`}
              fill={regionColors?.[key] ?? fill}
              stroke={STROKE}
              strokeWidth={isHighlighted ? 4 : 2.5}
              strokeLinejoin="round"
              opacity={isHighlighted ? 1 : 0.9}
              filter={isHighlighted ? 'drop-shadow(0 0 10px rgba(15,98,254,0.6))' : undefined}
            />
          );
        })}
        {labels && (
          <g fill={PALETTE.ink} fontFamily="system-ui, sans-serif" fontSize={13 * Math.min(scaleX, scaleY)} textAnchor="middle">
            {Object.entries(REGION_LABELS).map(([id, [lx, ly]]) => (
              <text
                key={id}
                x={lx * scaleX}
                y={ly * scaleY}
                fontWeight={700}
                fill={highlighted === (id as USRegion) ? PALETTE.accent : PALETTE.textMuted}
              >
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </text>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
};
