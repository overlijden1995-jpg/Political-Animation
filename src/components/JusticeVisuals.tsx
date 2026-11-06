import * as React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { handRect, handLine, handCircle } from '../theme/brush';
import { PALETTE, FONT } from '../theme/colors';

const FPS = 30;

/** Continuous idle float for organic, hand-drawn liveliness. */
const idleFloat = (frame: number, speed = 0.08, amount = 2.5) => Math.sin(frame * speed) * amount;
/** Continuous idle pulse scale. */
const idlePulse = (frame: number, speed = 0.12, amount = 0.05) => 1 + Math.sin(frame * speed) * amount;
/** Map scene progress (0..1) to a value range with easing. */
const prog = (progress: number, from: number, to: number) => from + (to - from) * progress;

/* =========================================================================
   SHARED SVG DECORATIONS
   ========================================================================= */

/** Reusable noise/grain filter + glow for polished hand-drawn look. */
export const Defs = () => (
  <defs>
    <filter id="grain" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="3" stitchTiles="stitch" />
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.04 0" />
      <feBlend mode="multiply" in2="SourceGraphic" />
    </filter>
    <filter id="ink-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
      <feOffset dx="2" dy="4" result="offsetblur" />
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.35" />
      </feComponentTransfer>
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
      <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.4  0 0 0 0 1  0 0 0 0.3 0" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
      <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.6  0 0 0 0 0.1  0 0 0 0 0.1  0 0 0 0.3 0" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <linearGradient id="grad-paper" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#FBF9F2" />
      <stop offset="100%" stopColor="#F1EDE0" />
    </linearGradient>
    <linearGradient id="grad-ink" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#1F1A14" />
      <stop offset="100%" stopColor="#4A4438" />
    </linearGradient>
    <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#0F62FE" />
      <stop offset="100%" stopColor="#3A86FF" />
    </linearGradient>
    <linearGradient id="grad-red" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#C93756" />
      <stop offset="100%" stopColor="#F28C8C" />
    </linearGradient>
  </defs>
);

/** A single hand-drawn particle floating upward (steam/dust/mote). */
interface MoteProps { frame: number; x: number; y: number; seed: number; size?: number; color?: string; speed?: number; }
export const Mote: React.FC<MoteProps> = ({ frame, x, y, seed, size = 3, color = PALETTE.inkFade, speed = 0.06 }) => {
  const floatY = idleFloat(frame, speed, 18);
  const floatX = Math.cos(frame * speed * 0.7 + seed) * 3;
  const opacity = 0.35 + Math.sin(frame * speed * 1.3 + seed) * 0.25;
  const scale = idlePulse(frame, speed, 0.3);
  return (
    <circle
      cx={x + floatX}
      cy={y + floatY}
      r={size * scale}
      fill={color}
      opacity={Math.max(0, Math.min(1, opacity))}
      style={{ filter: 'url(#grain)' }}
    />
  );
};

/* =========================================================================
   1. SCALES OF JUSTICE
   ========================================================================= */

interface ScalesProps {
  tilt?: 'accountability' | 'reform' | 'balanced';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export const ScalesOfJustice: React.FC<ScalesProps> = ({
  tilt = 'balanced',
  x = 0,
  y = 0,
  width = 420,
  height = 340,
}) => {
  const frame = useCurrentFrame();
  const cx = width / 2;
  const beamY = height * 0.36;
  const panY = height * 0.62;
  const panW = 96;

  // Tilt angle driven by which side is heavier
  let targetAngle = 0;
  if (tilt === 'accountability') targetAngle = -14;
  if (tilt === 'reform') targetAngle = 14;
  // Smooth spring toward target
  const angle = interpolate(frame, [0, FPS * 3], [0, targetAngle]);

  // Idle bobbing for both pans
  const bobL = idleFloat(frame, 0.09, 1.5);
  const bobR = idleFloat(frame, 0.09, -1.2);
  const beamSway = Math.sin(frame * 0.05) * 0.8;

  // Floating dust motes around the scales
  const motes = [23, 57, 89, 121].map((s, i) => (
    <Mote key={i} frame={frame} x={40 + i * 90} y={panY + 70} seed={s} size={2.5} color={PALETTE.inkFade} speed={0.05 + i * 0.01} />
  ));

  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height }}>
      <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        <Defs />
        {/* Stand */}
        <rect
          x={cx - 10}
          y={beamY}
          width={20}
          height={height * 0.5}
          fill="url(#grad-ink)"
          stroke={PALETTE.ink}
          strokeWidth="3"
          style={{ filter: 'url(#ink-shadow)' }}
        />
        <circle cx={cx} cy={beamY} r={16} fill="#1F1A14" stroke={PALETTE.ink} strokeWidth="3" />
        {/* Beam */}
        <g transform={`rotate(${angle + beamSway} ${cx} ${beamY})`}>
          <path
            d={handLine(50, beamY, width - 50, beamY, { roughness: 0.8, seed: 501 })}
            stroke="url(#grad-ink)"
            strokeWidth="6"
            fill="none"
            style={{ filter: 'url(#ink-shadow)' }}
          />
          {/* Chains hanging from beam */}
          {[-60, 60].map((cxOff) => (
            <path
              key={cxOff}
              d={handLine(cx + cxOff, beamY, cx + cxOff, panY - 10, { roughness: 0.5, seed: 510 + cxOff })}
              stroke={PALETTE.inkSoft}
              strokeWidth="2.5"
              fill="none"
            />
          ))}
        </g>
        {/* Left pan: Accountability */}
        <g transform={`rotate(${angle + beamSway} ${cx} ${beamY})`}>
          <line x1={cx - 60} y1={beamY} x2={cx - 60} y2={panY + bobL} stroke={PALETTE.ink} strokeWidth="3" />
          <rect
            x={cx - 60 - panW / 2}
            y={panY + bobL}
            width={panW}
            height={52}
            rx={10}
            fill="url(#grad-blue)"
            stroke={PALETTE.ink}
            strokeWidth="3.5"
            style={{ filter: 'url(#glow-blue)' }}
          />
          <text
            x={cx - 60}
            y={panY + 34 + bobL}
            fontFamily="system-ui, sans-serif"
            fontSize={15}
            fontWeight={900}
            fill="#FFFFFF"
            textAnchor="middle"
            letterSpacing="0.04em"
          >
            Accountability
          </text>
          <text x={cx - 60} y={panY + 52 + bobL} fontFamily="system-ui, sans-serif" fontSize={11} fill="#3A86FF" textAnchor="middle">Justice</text>
        </g>
        {/* Right pan: Reform */}
        <g transform={`rotate(${angle + beamSway} ${cx} ${beamY})`}>
          <line x1={cx + 60} y1={beamY} x2={cx + 60} y2={panY + bobR} stroke={PALETTE.ink} strokeWidth="3" />
          <rect
            x={cx + 60 - panW / 2}
            y={panY + bobR}
            width={panW}
            height={52}
            rx={10}
            fill="url(#grad-red)"
            stroke={PALETTE.ink}
            strokeWidth="3.5"
            style={{ filter: 'url(#glow-red)' }}
          />
          <text
            x={cx + 60}
            y={panY + 34 + bobR}
            fontFamily="system-ui, sans-serif"
            fontSize={15}
            fontWeight={900}
            fill="#FFFFFF"
            textAnchor="middle"
            letterSpacing="0.04em"
          >
            Reform
          </text>
          <text x={cx + 60} y={panY + 52 + bobR} fontFamily="system-ui, sans-serif" fontSize={11} fill="#F28C8C" textAnchor="middle">Bipartisanship</text>
        </g>
        {/* Labels above */}
        <text x={cx - 60} y={beamY - 18} fontFamily="system-ui, sans-serif" fontSize={13} fill={PALETTE.textMuted} textAnchor="middle" fontWeight={800}>Justice</text>
        <text x={cx + 60} y={beamY - 18} fontFamily="system-ui, sans-serif" fontSize={13} fill={PALETTE.textMuted} textAnchor="middle" fontWeight={800}>Bipartisanship</text>
        {motes}
      </svg>
    </div>
  );
};

/* =========================================================================
   2. CANCER METAPHOR
   ========================================================================= */

interface CancerProps {
  stage?: 'healthy' | 'misbehaving' | 'tumor' | 'metastasis';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export const CancerMetaphor: React.FC<CancerProps> = ({
  stage = 'healthy',
  x = 0,
  y = 0,
  width = 420,
  height = 340,
}) => {
  const frame = useCurrentFrame();
  const cx = width / 2;
  const cy = height / 2 + 10;

  // Stage progress: 0..4 mapped to 0..1
  const stageMap: Record<string, number> = { healthy: 0, misbehaving: 1, tumor: 2, metastasis: 3 };
  const stageNum = stageMap[stage] ?? 0;
  const progress = Math.min(Math.max(stageNum / 3, 0), 1);

  // Cells pulse independently
  const cells = Array.from({ length: 24 }).map((_, i) => {
    const sx = 55 + (i % 6) * 62;
    const sy = 70 + Math.floor(i / 6) * 62;
    const pulse = idlePulse(frame, 0.1 + i * 0.02, 0.08 + i * 0.02);
    const float = idleFloat(frame, 0.07 + i * 0.01, 1.5);
    const isHealthy = stage === 'healthy' || stage === 'misbehaving';
    return {
      sx, sy, pulse, float, isHealthy,
    };
  });

  // Tumor growth scale driven by progress
  const tumorScale = interpolate(progress, [0, 1], [0, 1]);
  const tumorOpacity = interpolate(progress, [0, 0.4], [0, 1]);

  // Metastasis cells drift outward
  const metaCells = [
    { x: 70, y: 110, seed: 670 },
    { x: 350, y: 90, seed: 680 },
    { x: 90, y: 250, seed: 690 },
    { x: 360, y: 230, seed: 700 },
  ];

  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height }}>
      <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        <Defs />
        {/* Background tissue cells */}
        {cells.map(({ sx, sy, pulse, float, isHealthy }, i) => (
          <g key={i} transform={`translate(${sx + float * 0.5}, ${sy + float}) scale(${pulse})`}>
            <path
              d={handCircle(0, 0, 14, { roughness: 1, seed: 600 + i })}
              fill={isHealthy ? 'url(#grad-paper)' : '#FCE9E9'}
              stroke={isHealthy ? PALETTE.inkSoft : '#C93756'}
              strokeWidth={isHealthy ? 2 : 3}
              style={{ filter: 'url(#grain)' }}
            />
            <circle cx={0} cy={0} r={3} fill="#1F1A14" opacity={0.35} />
          </g>
        ))}

        {/* Misbehaving cell (starts growing red) */}
        {(stage === 'misbehaving' || stage === 'tumor' || stage === 'metastasis') && (
          <g transform={`scale(${idlePulse(frame, 0.1, 0.12)}) translate(${cx - 60}, ${cy})`}>
            <path
              d={handCircle(0, 0, 22 * tumorScale, { roughness: 1.5, seed: 650 })}
              fill="#F5E6E8"
              stroke="#C93756"
              strokeWidth="4"
              style={{ filter: 'url(#glow-red)', opacity: tumorOpacity }}
            />
            <text x={0} y={4} fontFamily="system-ui, sans-serif" fontSize={10} fill="#C93756" textAnchor="middle" fontWeight={800}>X</text>
          </g>
        )}

        {/* Tumor mass */}
        {(stage === 'tumor' || stage === 'metastasis') && (
          <g transform={`scale(${tumorScale}) translate(${cx + 40}, ${cy + 20})`}>
            <path
              d={handCircle(0, 0, 48 * tumorScale, { roughness: 2, seed: 660 })}
              fill="url(#grad-red)"
              stroke={PALETTE.ink}
              strokeWidth="4"
              style={{ filter: 'url(#glow-red)', opacity: tumorOpacity }}
            />
            <text x={0} y={6} fontFamily="system-ui, sans-serif" fontSize={13} fill="#FFFFFF" textAnchor="middle" fontWeight={900}>CORRUPTION</text>
          </g>
        )}

        {/* Metastasis spreading cells */}
        {stage === 'metastasis' && (
          <>
            {metaCells.map(({ x: mx, y: my, seed }, i) => {
              const driftX = Math.sin(frame * 0.04 + seed * 0.1) * 8 * progress;
              const driftY = Math.cos(frame * 0.05 + seed * 0.1) * 6 * progress;
              const scale = 0.6 + 0.4 * progress + Math.sin(frame * 0.06 + i) * 0.08;
              return (
                <path
                  key={i}
                  d={handCircle(mx + driftX, my + driftY, 16 * scale, { roughness: 1.8, seed })}
                  fill="url(#grad-red)"
                  stroke={PALETTE.ink}
                  strokeWidth="3"
                  style={{ filter: 'url(#glow-red)', opacity: 0.85 + 0.15 * Math.sin(frame * 0.05 + i) }}
                />
              );
            })}
          </>
        )}

        {/* Stage labels */}
        {stage === 'healthy' && (
          <text x={cx} y={height - 26} fontFamily="system-ui, sans-serif" fontSize={13} fill={PALETTE.textMuted} textAnchor="middle" fontWeight={800}>Healthy institutions</text>
        )}
        {stage === 'misbehaving' && (
          <text x={cx} y={height - 26} fontFamily="system-ui, sans-serif" fontSize={13} fill={PALETTE.textMuted} textAnchor="middle" fontWeight={800}>Corruption begins — one cell misbehaves</text>
        )}
        {stage === 'tumor' && (
          <text x={cx} y={height - 26} fontFamily="system-ui, sans-serif" fontSize={13} fill={PALETTE.textMuted} textAnchor="middle" fontWeight={800}>Tumor forms — corruption grows unchecked</text>
        )}
        {stage === 'metastasis' && (
          <text x={cx} y={height - 26} fontFamily="system-ui, sans-serif" fontSize={13} fill={PALETTE.textMuted} textAnchor="middle" fontWeight={800}>Metastasis — corruption spreads through the body</text>
        )}
      </svg>
    </div>
  );
};

/* =========================================================================
   3. ICE CREAM MACHINE
   ========================================================================= */

interface IceCreamMachineProps {
  state?: 'working' | 'broken' | 'fixing';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export const IceCreamMachine: React.FC<IceCreamMachineProps> = ({
  state = 'working',
  x = 0,
  y = 0,
  width = 420,
  height = 340,
}) => {
  const frame = useCurrentFrame();
  const cx = width / 2;
  const machineTop = height * 0.36;
  const machineBottom = height * 0.86;

  // Steam rising when working
  const steam = [0, 1, 2].map((i) => (
    <Mote key={i} frame={frame} x={cx - 12 + i * 12} y={machineTop - 40 - i * 20} seed={800 + i} size={4 + i} color="#E8E2D2" speed={0.07 + i * 0.02} />
  ));

  // Swirl bounce when working
  const swirlY = idleFloat(frame, 0.1, 2);
  const swirlScale = idlePulse(frame, 0.1, 0.06);

  // Crack draw-on progress when broken
  const crackProgress = state === 'broken' ? Math.min(frame / (FPS * 2), 1) : 0;
  const dripY = idleFloat(frame, 0.15, 4) + (state === 'broken' ? 8 : 0);

  // Wrench rotation when fixing
  const wrenchRot = state === 'fixing' ? (frame * 4) % 360 : 0;

  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height }}>
      <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        <Defs />
        {/* Machine body */}
        <rect
          x={cx - 110}
          y={machineTop}
          width={220}
          height={machineBottom - machineTop}
          rx={18}
          fill={state === 'broken' ? '#FDF3F4' : state === 'fixing' ? '#E4EEFF' : 'url(#grad-paper)'}
          stroke={PALETTE.ink}
          strokeWidth="4"
          style={{ filter: 'url(#ink-shadow)' }}
        />
        <path
          d={handRect(cx - 110, machineTop, 220, machineBottom - machineTop, { roughness: 1, seed: 801 })}
          fill="none"
          stroke="url(#grad-ink)"
          strokeWidth="3"
        />
        {/* Control panel buttons */}
        {Array.from({ length: 4 }).map((_, i) => (
          <circle
            key={i}
            cx={cx - 60 + i * 40}
            cy={machineTop + 40}
            r={9}
            fill={state === 'working' ? '#36B37E' : '#C9D6EA'}
            stroke={PALETTE.ink}
            strokeWidth="2.5"
            opacity={state === 'working' ? 0.8 + 0.2 * Math.sin(frame * 0.1 + i) : 0.6}
          />
        ))}
        {/* Dispenser spout */}
        <rect x={cx - 24} y={machineTop - 34} width={48} height={34} rx={6} fill="#C9D6EA" stroke={PALETTE.ink} strokeWidth="3" />
        <path
          d={handLine(cx - 24, machineTop - 34, cx + 24, machineTop - 34, { roughness: 0.6, seed: 802 })}
          stroke={PALETTE.ink}
          strokeWidth="3"
          fill="none"
        />
        {/* Ice cream swirl (working only) */}
        {state === 'working' && (
          <g transform={`translate(${cx}, ${machineTop - 30 + swirlY}) scale(${swirlScale})`}>
            <path
              d={`M -18 0 Q 0 -22 18 0 Q 0 -10 -18 0 Z`}
              fill="url(#grad-blue)"
              stroke={PALETTE.ink}
              strokeWidth="3"
              style={{ filter: 'url(#glow-blue)' }}
            />
            {/* Sprinkles */}
            {Array.from({ length: 6 }).map((_, i) => (
              <rect
                key={i}
                x={-12 + i * 8}
                y={-8}
                width={4}
                height={2}
                rx={1}
                fill="#F28C8C"
                opacity={0.7 + 0.3 * Math.sin(frame * 0.1 + i)}
              />
            ))}
          </g>
        )}
        {/* Cracks when broken */}
        {state === 'broken' && (
          <>
            <path
              d={handLine(cx - 65, machineTop + 50, cx - 20, machineTop + 90 * crackProgress, { roughness: 1.5, seed: 810 })}
              stroke="#C93756"
              strokeWidth="5"
              fill="none"
              strokeDasharray={interpolate(crackProgress, [0, 1], ['0', '100, 100'])}
            />
            <path
              d={handLine(cx + 20, machineTop + 110 * crackProgress, cx + 65, machineTop + 70, { roughness: 1.5, seed: 811 })}
              stroke="#C93756"
              strokeWidth="5"
              fill="none"
              strokeDasharray={interpolate(crackProgress, [0, 1], ['0', '100, 100'])}
            />
            <path d={handRect(cx - 32, machineBottom - 45, 64, 34, { roughness: 1, seed: 812 })} fill="none" stroke="#C93756" strokeWidth="4" />
            {/* Drip from spout */}
            <path
              d={handLine(cx, machineTop, cx, machineTop + 28 + dripY, { roughness: 0.8, seed: 820 })}
              stroke="#C93756"
              strokeWidth="4"
              fill="none"
            />
            <circle cx={cx} cy={machineTop + 30 + dripY} r={7} fill="url(#grad-red)" stroke={PALETTE.ink} strokeWidth="2" />
          </>
        )}
        {/* Wrench when fixing */}
        {state === 'fixing' && (
          <g transform={`rotate(${wrenchRot} ${cx - 45} ${machineBottom + 15})`}>
            <path d={handLine(cx - 45, machineBottom + 15, cx - 15, machineBottom + 55, { roughness: 0.8, seed: 830 })} stroke={PALETTE.inkSoft} strokeWidth="6" fill="none" />
            <circle cx={cx - 50} cy={machineBottom + 10} r={10} fill="none" stroke={PALETTE.inkSoft} strokeWidth="4" />
          </g>
        )}
        {/* Labels */}
        <text x={cx} y={machineTop - 48} fontFamily="system-ui, sans-serif" fontSize={14} fill={PALETTE.textMuted} textAnchor="middle" fontWeight={800}>The Government</text>
        {state === 'working' && (
          <text x={cx} y={machineBottom + 44} fontFamily="system-ui, sans-serif" fontSize={14} fill="#36B37E" textAnchor="middle" fontWeight={900}>Serves ice cream</text>
        )}
        {state === 'broken' && (
          <text x={cx} y={machineBottom + 44} fontFamily="system-ui, sans-serif" fontSize={14} fill="#C93756" textAnchor="middle" fontWeight={900}>Broken — serves nothing</text>
        )}
        {state === 'fixing' && (
          <text x={cx} y={machineBottom + 44} fontFamily="system-ui, sans-serif" fontSize={14} fill="#0F62FE" textAnchor="middle" fontWeight={900}>Fixing the machine first</text>
        )}
        {state === 'working' && steam}
      </svg>
    </div>
  );
};

/* =========================================================================
   4. LEGACY CONTRAST (Obama/McCain vs Trump)
   ========================================================================= */

interface LegacyContrastProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export const LegacyContrast: React.FC<LegacyContrastProps> = ({
  x = 0,
  y = 0,
  width = 420,
  height = 340,
}) => {
  const frame = useCurrentFrame();
  const mid = width / 2;

  // Entrance: panels slide in
  const enter = Math.min(frame / (FPS * 0.8), 1);
  const leftX = 20 - (1 - enter) * 60;
  const rightX = mid + 20 + (1 - enter) * 60;
  const opacity = enter;

  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height, opacity }}>
      <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        <Defs />
        {/* Divider line that draws on */}
        <path
          d={handLine(mid, 30, mid, height - 70, { roughness: 0.6, seed: 901 })}
          stroke={PALETTE.inkSoft}
          strokeWidth="3"
          fill="none"
          strokeDasharray={`6 6`}
          style={{ strokeDashoffset: interpolate(enter, [0, 1], [200, 0]) }}
        />

        {/* Left panel: Then */}
        <rect
          x={leftX}
          y={70}
          width={mid - 40}
          height={height - 150}
          rx={14}
          fill="#EFF6FD"
          stroke={PALETTE.ink}
          strokeWidth="3.5"
          style={{ filter: 'url(#ink-shadow)', opacity }}
        />
        <path
          d={handRect(leftX, 70, mid - 40, height - 150, { roughness: 0.8, seed: 902 })}
          fill="none"
          stroke="url(#grad-ink)"
          strokeWidth="2"
        />
        <circle cx={leftX + (mid - 40) / 2} cy={112} r={26} fill="#FFFFFF" stroke="#0F62FE" strokeWidth="4" />
        <text x={leftX + (mid - 40) / 2} y={116} fontFamily="system-ui, sans-serif" fontSize={13} fill="#0F62FE" textAnchor="middle" fontWeight={900}>O/M</text>
        <text x={leftX + (mid - 40) / 2} y={150} fontFamily="system-ui, sans-serif" fontSize={15} fontWeight={900} fill="#0F62FE" textAnchor="middle" opacity={enter}>Then</text>
        <text
          x={leftX + (mid - 40) / 2}
          y={180}
          fontFamily="system-ui, sans-serif"
          fontSize={12}
          fill={PALETTE.textMuted}
          textAnchor="middle"
          opacity={enter}
          style={{ filter: 'url(#grain)' }}
        >
          Graceful concession — McCain defends Obama
        </text>
        <text x={leftX + (mid - 40) / 2} y={200} fontFamily="system-ui, sans-serif" fontSize={11} fill={PALETTE.textMuted} textAnchor="middle" opacity={enter} style={{ filter: 'url(#grain)' }}>Unity when disunity was self-inflicted</text>

        {/* Right panel: Now */}
        <rect
          x={rightX}
          y={70}
          width={mid - 40}
          height={height - 150}
          rx={14}
          fill="#FDF3F4"
          stroke={PALETTE.ink}
          strokeWidth="3.5"
          style={{ filter: 'url(#ink-shadow)', opacity }}
        />
        <path
          d={handRect(rightX, 70, mid - 40, height - 150, { roughness: 0.8, seed: 903 })}
          fill="none"
          stroke="url(#grad-ink)"
          strokeWidth="2"
        />
        <circle cx={rightX + (mid - 40) / 2} cy={112} r={26} fill="#FFFFFF" stroke="#C93756" strokeWidth="4" />
        <text x={rightX + (mid - 40) / 2} y={116} fontFamily="system-ui, sans-serif" fontSize={13} fill="#C93756" textAnchor="middle" fontWeight={900}>DJT</text>
        <text x={rightX + (mid - 40) / 2} y={150} fontFamily="system-ui, sans-serif" fontSize={15} fontWeight={900} fill="#C93756" textAnchor="middle" opacity={enter}>Now</text>
        <text
          x={rightX + (mid - 40) / 2}
          y={180}
          fontFamily="system-ui, sans-serif"
          fontSize={12}
          fill={PALETTE.textMuted}
          textAnchor="middle"
          opacity={enter}
          style={{ filter: 'url(#grain)' }}
        >
          Patriotic disgrace — corrupt robber baron
        </text>
        <text x={rightX + (mid - 40) / 2} y={200} fontFamily="system-ui, sans-serif" fontSize={11} fill={PALETTE.textMuted} textAnchor="middle" opacity={enter} style={{ filter: 'url(#grain)' }}>“Trump is not America”</text>

        {/* Bottom label */}
        <text
          x={width / 2}
          y={height - 24}
          fontFamily="system-ui, sans-serif"
          fontSize={13}
          fontWeight={900}
          fill={PALETTE.ink}
          textAnchor="middle"
          opacity={enter}
        >
          A moment of patriotic disgrace, not policy dialectics
        </text>
        {/* Pulsing alert dot on right */}
        <circle
          cx={rightX + (mid - 40) - 24}
          cy={82}
          r={6 + Math.sin(frame * 0.15) * 2}
          fill="#C93756"
          opacity={0.7 + 0.3 * Math.sin(frame * 0.1)}
        />
      </svg>
    </div>
  );
};

/* =========================================================================
   5. SHIELD OF POWER
   ========================================================================= */

interface ShieldProps {
  state?: 'intact' | 'cracking' | 'broken';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export const ShieldOfPower: React.FC<ShieldProps> = ({
  state = 'intact',
  x = 0,
  y = 0,
  width = 320,
  height = 340,
}) => {
  const frame = useCurrentFrame();
  const cx = width / 2;
  const topY = height * 0.24;

  // Crack draw-on progress
  const crackProgress = state === 'cracking' ? Math.min(frame / (FPS * 1.5), 1) : state === 'broken' ? 1 : 0;
  // Shield glow when broken
  const shieldGlow = state === 'broken' ? 0.6 + 0.4 * Math.sin(frame * 0.1) : 0;
  // Justice hammer pulse
  const hammerPulse = state !== 'intact' ? 1 + Math.sin(frame * 0.1) * 0.15 : 1;

  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height }}>
      <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        <Defs />
        {/* Power rays behind shield when broken */}
        {state === 'broken' && (
          <>
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              const r1 = 40 + 20 * Math.sin(frame * 0.05 + i);
              const r2 = 100 + 30 * Math.sin(frame * 0.07 + i);
              return (
                <path
                  key={i}
                  d={`M ${cx + Math.cos(angle) * r1} ${topY + height * 0.5 + Math.sin(angle) * r1} L ${cx + Math.cos(angle) * r2} ${topY + height * 0.5 + Math.sin(angle) * r2}`}
                  stroke="#36B37E"
                  strokeWidth="3"
                  opacity={0.5 + 0.3 * Math.sin(frame * 0.08 + i)}
                  strokeLinecap="round"
                />
              );
            })}
          </>
        )}
        {/* Shield body */}
        <path
          d={`M ${cx} ${topY} Q ${cx + 110} ${topY} ${cx + 100} ${topY + 44} L ${cx + 100} ${topY + 132} Q ${cx + 78} ${topY + 200} ${cx} ${topY + 222} Q ${cx - 78} ${topY + 200} ${cx - 100} ${topY + 132} L ${cx - 100} ${topY + 44} Q ${cx - 110} ${topY} ${cx} ${topY} Z`}
          fill={state === 'broken' ? '#FDF3F4' : 'url(#grad-paper)'}
          stroke={PALETTE.ink}
          strokeWidth="5"
          style={{
            filter: state === 'broken' ? 'url(#glow-red)' : 'url(#ink-shadow)',
            opacity: 0.95 + shieldGlow * 0.1,
          }}
        />
        <path
          d={`M ${cx} ${topY} Q ${cx + 110} ${topY} ${cx + 100} ${topY + 44} L ${cx + 100} ${topY + 132} Q ${cx + 78} ${topY + 200} ${cx} ${topY + 222} Q ${cx - 78} ${topY + 200} ${cx - 100} ${topY + 132} L ${cx - 100} ${topY + 44} Q ${cx - 110} ${topY} ${cx} ${topY} Z`}
          fill="none"
          stroke="url(#grad-ink)"
          strokeWidth="3"
        />
        {/* Inner power symbol */}
        <text
          x={cx}
          y={topY + 142}
          fontFamily="system-ui, sans-serif"
          fontSize={44}
          fill={PALETTE.inkSoft}
          textAnchor="middle"
          style={{ filter: 'url(#grain)' }}
        >
          ⚡
        </text>
        {/* Cracks */}
        {state === 'cracking' && (
          <>
            <path
              d={handLine(cx - 22, topY + 66, cx - 42, topY + 120 * crackProgress, { roughness: 1.2, seed: 910 })}
              stroke="#C93756"
              strokeWidth="5"
              fill="none"
              strokeDasharray={interpolate(crackProgress, [0, 1], ['0', '200, 200'])}
            />
            <path
              d={handLine(cx + 32, topY + 76, cx + 52, topY + 142 * crackProgress, { roughness: 1.2, seed: 911 })}
              stroke="#C93756"
              strokeWidth="5"
              fill="none"
              strokeDasharray={interpolate(crackProgress, [0, 1], ['0', '200, 200'])}
            />
          </>
        )}
        {state === 'broken' && (
          <>
            <path
              d={handLine(cx - 32, topY + 54, cx - 52, topY + 144, { roughness: 1.5, seed: 920 })}
              stroke="#C93756"
              strokeWidth="6"
              fill="none"
            />
            <path
              d={handLine(cx + 42, topY + 66, cx + 72, topY + 154, { roughness: 1.5, seed: 921 })}
              stroke="#C93756"
              strokeWidth="6"
              fill="none"
            />
            <path
              d={handLine(cx - 20, topY + 154, cx + 30, topY + 176, { roughness: 1.5, seed: 922 })}
              stroke="#C93756"
              strokeWidth="6"
              fill="none"
            />
          </>
        )}
        {/* Justice hammer striking */}
        {state !== 'intact' && (
          <g transform={`translate(${cx}, ${topY + 232}) scale(${hammerPulse})`}>
            <path d={handLine(0, 0, 0, 32, { roughness: 0.6, seed: 930 })} stroke="#36B37E" strokeWidth="7" fill="none" strokeLinecap="round" />
            <rect x={-14} y={32} width={28} height={18} fill="#36B37E" stroke={PALETTE.ink} strokeWidth="3" />
          </g>
        )}
        {/* Label */}
        <text x={cx} y={topY - 16} fontFamily="system-ui, sans-serif" fontSize={13} fill={PALETTE.textMuted} textAnchor="middle" fontWeight={800}>The Shielding of Power</text>
        {state === 'intact' && (
          <text x={cx} y={topY + 252} fontFamily="system-ui, sans-serif" fontSize={12} fill={PALETTE.textMuted} textAnchor="middle">Justice cannot penetrate</text>
        )}
        {state === 'cracking' && (
          <text x={cx} y={topY + 252} fontFamily="system-ui, sans-serif" fontSize={12} fill="#F5A623" textAnchor="middle" fontWeight={900}>Justice begins to crack the shield</text>
        )}
        {state === 'broken' && (
          <text x={cx} y={topY + 252} fontFamily="system-ui, sans-serif" fontSize={12} fill="#36B37E" textAnchor="middle" fontWeight={900}>Justice breaks through</text>
        )}
      </svg>
    </div>
  );
};
