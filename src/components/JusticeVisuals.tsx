import * as React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { handRect, handLine, handCircle } from '../theme/brush';
import { PALETTE, FONT } from '../theme/colors';

const FPS = 30;

/* =========================================================================
   SHARED ANIMATION UTILITIES
   ========================================================================= */

/** Continuous idle float for organic, hand-drawn liveliness. */
const idleFloat = (frame: number, speed = 0.06, amount = 1.5) => Math.sin(frame * speed) * amount;
/** Continuous idle pulse scale. */
const idlePulse = (frame: number, speed = 0.1, amount = 0.05) => 1 + Math.sin(frame * speed) * amount;
/** Gentle drift for particles. */
const driftX = (frame: number, seed: number, speed = 0.04, amount = 2) => Math.sin(frame * speed + seed) * amount;
const driftY = (frame: number, seed: number, speed = 0.05, amount = 1.5) => Math.cos(frame * speed + seed) * amount;

/** Map scene progress (0..1) to a value range with easing. */
const prog = (progress: number, from: number, to: number) => from + (to - from) * progress;

/* =========================================================================
   SHARED SVG DEFS — filters, gradients, textures
   ========================================================================= */

export const Defs = () => (
  <defs>
    {/* Grain / paper texture filter */}
    <filter id="grain" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="4" stitchTiles="stitch" />
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0" />
      <feBlend mode="multiply" in2="SourceGraphic" />
    </filter>

    {/* Soft ink drop shadow */}
    <filter id="ink-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
      <feOffset dx="2" dy="5" result="offsetblur" />
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3" />
      </feComponentTransfer>
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* Glows */}
    <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
      <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.05  0 0 0 0 0.35  0 0 0 0 1  0 0 0 0.25 0" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
      <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.08  0 0 0 0 0.1  0 0 0 0.25 0" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
      <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.08  0 0 0 0 0.35  0 0 0 0 0.15  0 0 0 0.25 0" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* Gradients */}
    <linearGradient id="grad-paper" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#FBF9F2" />
      <stop offset="50%" stopColor="#F2EFE2" />
      <stop offset="100%" stopColor="#E9E5D4" />
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
    <linearGradient id="grad-green" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#36B37E" />
      <stop offset="100%" stopColor="#5CC98E" />
    </linearGradient>
    <radialGradient id="grad-vignette" cx="50%" cy="50%" r="70%">
      <stop offset="60%" stopColor="transparent" />
      <stop offset="100%" stopColor="rgba(31,26,20,0.14)" />
    </radialGradient>
  </defs>
);

/** Single floating mote (steam / dust / sparkle). */
interface MoteProps { frame: number; x: number; y: number; seed: number; size?: number; color?: string; speed?: number; }
export const Mote: React.FC<MoteProps> = ({ frame, x, y, seed, size = 3, color = PALETTE.inkFade, speed = 0.06 }) => {
  const floatY = idleFloat(frame, speed, 16);
  const floatX = driftX(frame, seed, speed * 0.7, 3);
  const opacity = 0.3 + Math.sin(frame * speed * 1.3 + seed) * 0.25;
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

/** Decorative hand-drawn corner flourish. */
interface CornerFlourishProps { x: number; y: number; w: number; h: number; corner: 'tl' | 'tr' | 'bl' | 'br'; seed: number; }
export const CornerFlourish: React.FC<CornerFlourishProps> = ({ x, y, w, h, corner, seed }) => {
  const frame = useCurrentFrame();
  const float = idleFloat(frame, 0.05, 1);
  const sx = corner === 'tl' || corner === 'bl' ? x : x + w;
  const sy = corner === 'tl' || corner === 'tr' ? y : y + h;
  const dirX = corner === 'tl' || corner === 'bl' ? 1 : -1;
  const dirY = corner === 'tl' || corner === 'tr' ? 1 : -1;

  return (
    <g transform={`translate(${sx + float * 0.3}, ${sy + float * 0.3})`}>
      <path
        d={handLine(0, 0, 28 * dirX, 0, { roughness: 1.2, seed })}
        stroke={PALETTE.inkSoft}
        strokeWidth="2.5"
        fill="none"
        opacity={0.6}
      />
      <path
        d={handLine(0, 0, 0, 28 * dirY, { roughness: 1.2, seed: seed + 7 })}
        stroke={PALETTE.inkSoft}
        strokeWidth="2.5"
        fill="none"
        opacity={0.6}
      />
      <path
        d={handLine(8 * dirX, 8 * dirY, 18 * dirX, 18 * dirY, { roughness: 1.5, seed: seed + 13 })}
        stroke={PALETTE.accent}
        strokeWidth="2"
        fill="none"
        opacity={0.5 + 0.3 * Math.sin(frame * 0.04 + seed)}
      />
    </g>
  );
};

/** Ink splatter accent. */
interface InkSplatProps { cx: number; cy: number; seed: number; size?: number; color?: string; opacity?: number; }
export const InkSplat: React.FC<InkSplatProps> = ({ cx, cy, seed, size = 14, color = PALETTE.ink, opacity = 0.15 }) => {
  const frame = useCurrentFrame();
  const pulse = idlePulse(frame, 0.08, 0.12);
  return (
    <path
      d={handCircle(cx, cy, size * pulse, { roughness: 2.5, seed })}
      fill="none"
      stroke={color}
      strokeWidth="3"
      opacity={opacity * pulse}
      style={{ filter: 'url(#ink-shadow)' }}
    />
  );
};

/* =========================================================================
   1. SCALES OF JUSTICE — 4X intricate
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
  width = 460,
  height = 360,
}) => {
  const frame = useCurrentFrame();
  const cx = width / 2;
  const beamY = height * 0.38;
  const panY = height * 0.64;
  const panW = 104;

  let targetAngle = 0;
  if (tilt === 'accountability') targetAngle = -16;
  if (tilt === 'reform') targetAngle = 16;
  const angle = interpolate(frame, [0, FPS * 3], [0, targetAngle]);

  const bobL = idleFloat(frame, 0.09, 2);
  const bobR = idleFloat(frame, 0.09, -1.6);
  const beamSway = Math.sin(frame * 0.05) * 1;

  // Decorative border around the scales panel
  const border = handRect(10, 10, width - 20, height - 20, { roughness: 1.5, seed: 500 });

  // Floating motes
  const motes = [23, 57, 89, 121, 155].map((s, i) => (
    <Mote key={i} frame={frame} x={45 + i * 85} y={panY + 90} seed={s} size={3} color={PALETTE.inkFade} speed={0.05 + i * 0.01} />
  ));

  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height }}>
      <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        <Defs />
        {/* Decorative outer border */}
        <path d={border} fill="none" stroke={PALETTE.ink} strokeWidth="3" style={{ filter: 'url(#ink-shadow)' }} />
        {/* Corner flourishes */}
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="tl" seed={501} />
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="tr" seed={502} />
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="bl" seed={503} />
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="br" seed={504} />

        {/* Title underline */}
        <path d={handLine(width / 2 - 60, 46, width / 2 + 60, 46, { roughness: 1, seed: 505 })} stroke={PALETTE.accent} strokeWidth="3" fill="none" />

        {/* Stand */}
        <rect
          x={cx - 12}
          y={beamY}
          width={24}
          height={height * 0.48}
          fill="url(#grad-ink)"
          stroke={PALETTE.ink}
          strokeWidth="3.5"
          style={{ filter: 'url(#ink-shadow)' }}
        />
        <circle cx={cx} cy={beamY} r={18} fill="#1F1A14" stroke={PALETTE.ink} strokeWidth="4" />
        {/* Beam */}
        <g transform={`rotate(${angle + beamSway} ${cx} ${beamY})`}>
          <path
            d={handLine(55, beamY, width - 55, beamY, { roughness: 0.8, seed: 506 })}
            stroke="url(#grad-ink)"
            strokeWidth="7"
            fill="none"
            style={{ filter: 'url(#ink-shadow)' }}
          />
          {/* Chains */}
          {[-66, 66].map((cxOff) => (
            <path
              key={cxOff}
              d={handLine(cx + cxOff, beamY, cx + cxOff, panY - 12, { roughness: 0.5, seed: 510 + cxOff })}
              stroke={PALETTE.inkSoft}
              strokeWidth="3"
              fill="none"
            />
          ))}
        </g>
        {/* Left pan: Accountability */}
        <g transform={`rotate(${angle + beamSway} ${cx} ${beamY})`}>
          <line x1={cx - 66} y1={beamY} x2={cx - 66} y2={panY + bobL} stroke={PALETTE.ink} strokeWidth="3.5" />
          <rect
            x={cx - 66 - panW / 2}
            y={panY + bobL}
            width={panW}
            height={58}
            rx={12}
            fill="url(#grad-blue)"
            stroke={PALETTE.ink}
            strokeWidth="4"
            style={{ filter: 'url(#glow-blue)' }}
          />
          <InkSplat cx={cx - 66} cy={panY + bobL + 30} seed={520} size={10} color={PALETTE.accent} opacity={0.2} />
          <text
            x={cx - 66}
            y={panY + 38 + bobL}
            fontFamily="system-ui, sans-serif"
            fontSize={16}
            fontWeight={900}
            fill="#FFFFFF"
            textAnchor="middle"
            letterSpacing="0.04em"
          >
            Accountability
          </text>
          <text x={cx - 66} y={panY + 56 + bobL} fontFamily="system-ui, sans-serif" fontSize={12} fill="#3A86FF" textAnchor="middle">Justice</text>
        </g>
        {/* Right pan: Reform */}
        <g transform={`rotate(${angle + beamSway} ${cx} ${beamY})`}>
          <line x1={cx + 66} y1={beamY} x2={cx + 66} y2={panY + bobR} stroke={PALETTE.ink} strokeWidth="3.5" />
          <rect
            x={cx + 66 - panW / 2}
            y={panY + bobR}
            width={panW}
            height={58}
            rx={12}
            fill="url(#grad-red)"
            stroke={PALETTE.ink}
            strokeWidth="4"
            style={{ filter: 'url(#glow-red)' }}
          />
          <InkSplat cx={cx + 66} cy={panY + bobR + 30} seed={530} size={10} color={PALETTE.accent} opacity={0.2} />
          <text
            x={cx + 66}
            y={panY + 38 + bobR}
            fontFamily="system-ui, sans-serif"
            fontSize={16}
            fontWeight={900}
            fill="#FFFFFF"
            textAnchor="middle"
            letterSpacing="0.04em"
          >
            Reform
          </text>
          <text x={cx + 66} y={panY + 56 + bobR} fontFamily="system-ui, sans-serif" fontSize={12} fill="#F28C8C" textAnchor="middle">Bipartisanship</text>
        </g>
        {/* Labels */}
        <text x={cx - 66} y={beamY - 22} fontFamily="system-ui, sans-serif" fontSize={14} fill={PALETTE.textMuted} textAnchor="middle" fontWeight={800}>Justice</text>
        <text x={cx + 66} y={beamY - 22} fontFamily="system-ui, sans-serif" fontSize={14} fill={PALETTE.textMuted} textAnchor="middle" fontWeight={800}>Bipartisanship</text>
        {motes}
      </svg>
    </div>
  );
};

/* =========================================================================
   2. CANCER METAPHOR — 4X intricate
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
  width = 460,
  height = 360,
}) => {
  const frame = useCurrentFrame();
  const cx = width / 2;
  const cy = height / 2 + 8;

  const stageMap: Record<string, number> = { healthy: 0, misbehaving: 1, tumor: 2, metastasis: 3 };
  const stageNum = stageMap[stage] ?? 0;
  const progress = Math.min(Math.max(stageNum / 3, 0), 1);

  // Border
  const border = handRect(10, 10, width - 20, height - 20, { roughness: 1.5, seed: 600 });

  // Cells with independent pulse
  const cells = Array.from({ length: 30 }).map((_, i) => {
    const sx = 50 + (i % 6) * 62;
    const sy = 65 + Math.floor(i / 6) * 60;
    const pulse = idlePulse(frame, 0.1 + i * 0.02, 0.08 + i * 0.02);
    const float = idleFloat(frame, 0.07 + i * 0.01, 1.2);
    const isHealthy = stage === 'healthy' || stage === 'misbehaving';
    return { sx, sy, pulse, float, isHealthy, i };
  });

  const tumorScale = interpolate(progress, [0, 1], [0, 1]);
  const tumorOpacity = interpolate(progress, [0, 0.4], [0, 1]);

  const metaCells = [
    { x: 68, y: 108, seed: 670 },
    { x: 352, y: 88, seed: 680 },
    { x: 88, y: 248, seed: 690 },
    { x: 362, y: 228, seed: 700 },
    { x: 120, y: 150, seed: 710 },
    { x: 310, y: 260, seed: 720 },
  ];

  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height }}>
      <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        <Defs />
        <path d={border} fill="none" stroke={PALETTE.ink} strokeWidth="3" style={{ filter: 'url(#ink-shadow)' }} />
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="tl" seed={601} />
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="tr" seed={602} />
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="bl" seed={603} />
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="br" seed={604} />

        <path d={handLine(width / 2 - 70, 46, width / 2 + 70, 46, { roughness: 1, seed: 605 })} stroke={PALETTE.accent} strokeWidth="3" fill="none" />

        {/* Background tissue cells */}
        {cells.map(({ sx, sy, pulse, float, isHealthy, i }) => (
          <g key={i} transform={`translate(${sx + float * 0.4}, ${sy + float}) scale(${pulse})`}>
            <path
              d={handCircle(0, 0, 15, { roughness: 1, seed: 610 + i })}
              fill={isHealthy ? 'url(#grad-paper)' : '#FCE9E9'}
              stroke={isHealthy ? PALETTE.inkSoft : '#C93756'}
              strokeWidth={isHealthy ? 2.5 : 3.5}
              style={{ filter: 'url(#grain)' }}
            />
            <circle cx={0} cy={0} r={3.5} fill="#1F1A14" opacity={0.4} />
          </g>
        ))}

        {/* Misbehaving cell */}
        {(stage === 'misbehaving' || stage === 'tumor' || stage === 'metastasis') && (
          <g transform={`scale(${idlePulse(frame, 0.1, 0.14)}) translate(${cx - 66}, ${cy})`}>
            <path
              d={handCircle(0, 0, 24 * tumorScale, { roughness: 1.5, seed: 650 })}
              fill="#F5E6E8"
              stroke="#C93756"
              strokeWidth="4.5"
              style={{ filter: 'url(#glow-red)', opacity: tumorOpacity }}
            />
            <text x={0} y={5} fontFamily="system-ui, sans-serif" fontSize={11} fill="#C93756" textAnchor="middle" fontWeight={900}>X</text>
          </g>
        )}

        {/* Tumor mass */}
        {(stage === 'tumor' || stage === 'metastasis') && (
          <g transform={`scale(${tumorScale}) translate(${cx + 44}, ${cy + 22})`}>
            <path
              d={handCircle(0, 0, 52 * tumorScale, { roughness: 2, seed: 660 })}
              fill="url(#grad-red)"
              stroke={PALETTE.ink}
              strokeWidth="5"
              style={{ filter: 'url(#glow-red)', opacity: tumorOpacity }}
            />
            <text x={0} y={7} fontFamily="system-ui, sans-serif" fontSize={14} fill="#FFFFFF" textAnchor="middle" fontWeight={900}>CORRUPTION</text>
          </g>
        )}

        {/* Metastasis spreading cells */}
        {stage === 'metastasis' && (
          <>
            {metaCells.map(({ x: mx, y: my, seed }, i) => {
              const driftX = Math.sin(frame * 0.04 + seed * 0.1) * 9 * progress;
              const driftY = Math.cos(frame * 0.05 + seed * 0.1) * 7 * progress;
              const scale = 0.55 + 0.45 * progress + Math.sin(frame * 0.06 + i) * 0.09;
              return (
                <path
                  key={i}
                  d={handCircle(mx + driftX, my + driftY, 18 * scale, { roughness: 1.8, seed })}
                  fill="url(#grad-red)"
                  stroke={PALETTE.ink}
                  strokeWidth="3.5"
                  style={{ filter: 'url(#glow-red)', opacity: 0.8 + 0.2 * Math.sin(frame * 0.05 + i) }}
                />
              );
            })}
          </>
        )}

        {/* Stage labels */}
        {stage === 'healthy' && (
          <text x={cx} y={height - 24} fontFamily="system-ui, sans-serif" fontSize={14} fill={PALETTE.textMuted} textAnchor="middle" fontWeight={800}>Healthy institutions</text>
        )}
        {stage === 'misbehaving' && (
          <text x={cx} y={height - 24} fontFamily="system-ui, sans-serif" fontSize={14} fill={PALETTE.textMuted} textAnchor="middle" fontWeight={800}>Corruption begins — one cell misbehaves</text>
        )}
        {stage === 'tumor' && (
          <text x={cx} y={height - 24} fontFamily="system-ui, sans-serif" fontSize={14} fill={PALETTE.textMuted} textAnchor="middle" fontWeight={800}>Tumor forms — corruption grows unchecked</text>
        )}
        {stage === 'metastasis' && (
          <text x={cx} y={height - 24} fontFamily="system-ui, sans-serif" fontSize={14} fill={PALETTE.textMuted} textAnchor="middle" fontWeight={800}>Metastasis — corruption spreads through the body</text>
        )}
      </svg>
    </div>
  );
};

/* =========================================================================
   3. ICE CREAM MACHINE — 4X intricate
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
  width = 460,
  height = 360,
}) => {
  const frame = useCurrentFrame();
  const cx = width / 2;
  const machineTop = height * 0.38;
  const machineBottom = height * 0.88;

  // Steam rising when working
  const steam = [0, 1, 2, 3].map((i) => (
    <Mote key={i} frame={frame} x={cx - 16 + i * 11} y={machineTop - 48 - i * 22} seed={800 + i} size={4 + i} color="#E8E2D2" speed={0.07 + i * 0.015} />
  ));

  // Swirl bounce when working
  const swirlY = idleFloat(frame, 0.1, 2.5);
  const swirlScale = idlePulse(frame, 0.1, 0.07);

  // Crack draw-on progress when broken
  const crackProgress = state === 'broken' ? Math.min(frame / (FPS * 1.8), 1) : 0;
  const dripY = idleFloat(frame, 0.15, 5) + (state === 'broken' ? 10 : 0);

  // Wrench rotation when fixing
  const wrenchRot = state === 'fixing' ? (frame * 4.5) % 360 : 0;

  const border = handRect(10, 10, width - 20, height - 20, { roughness: 1.5, seed: 800 });

  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height }}>
      <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        <Defs />
        <path d={border} fill="none" stroke={PALETTE.ink} strokeWidth="3" style={{ filter: 'url(#ink-shadow)' }} />
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="tl" seed={801} />
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="tr" seed={802} />
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="bl" seed={803} />
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="br" seed={804} />

        <path d={handLine(width / 2 - 72, 46, width / 2 + 72, 46, { roughness: 1, seed: 805 })} stroke={PALETTE.accent} strokeWidth="3" fill="none" />

        {/* Machine body */}
        <rect
          x={cx - 120}
          y={machineTop}
          width={240}
          height={machineBottom - machineTop}
          rx={20}
          fill={state === 'broken' ? '#FDF3F4' : state === 'fixing' ? '#EFF6FD' : 'url(#grad-paper)'}
          stroke={PALETTE.ink}
          strokeWidth="5"
          style={{ filter: 'url(#ink-shadow)' }}
        />
        <path
          d={handRect(cx - 120, machineTop, 240, machineBottom - machineTop, { roughness: 0.9, seed: 806 })}
          fill="none"
          stroke="url(#grad-ink)"
          strokeWidth="3"
        />
        {/* Control panel buttons */}
        {Array.from({ length: 5 }).map((_, i) => (
          <circle
            key={i}
            cx={cx - 70 + i * 35}
            cy={machineTop + 46}
            r={10}
            fill={state === 'working' ? '#36B37E' : '#C9D6EA'}
            stroke={PALETTE.ink}
            strokeWidth="3"
            opacity={state === 'working' ? 0.75 + 0.25 * Math.sin(frame * 0.1 + i) : 0.55}
          />
        ))}
        {/* Dispenser spout */}
        <rect x={cx - 28} y={machineTop - 38} width={56} height={38} rx={8} fill="#C9D6EA" stroke={PALETTE.ink} strokeWidth="3.5" />
        <path d={handLine(cx - 28, machineTop - 38, cx + 28, machineTop - 38, { roughness: 0.6, seed: 807 })} stroke={PALETTE.ink} strokeWidth="3.5" fill="none" />

        {/* Ice cream swirl (working only) */}
        {state === 'working' && (
          <g transform={`translate(${cx}, ${machineTop - 34 + swirlY}) scale(${swirlScale})`}>
            <path
              d={`M -20 0 Q 0 -26 20 0 Q 0 -12 -20 0 Z`}
              fill="url(#grad-blue)"
              stroke={PALETTE.ink}
              strokeWidth="3.5"
              style={{ filter: 'url(#glow-blue)' }}
            />
            {/* Sprinkles */}
            {Array.from({ length: 8 }).map((_, i) => (
              <rect
                key={i}
                x={-14 + i * 7}
                y={-10}
                width={4.5}
                height={2.5}
                rx={1.5}
                fill="#F28C8C"
                opacity={0.65 + 0.35 * Math.sin(frame * 0.1 + i)}
              />
            ))}
          </g>
        )}

        {/* Cracks when broken */}
        {state === 'broken' && (
          <>
            <path
              d={handLine(cx - 72, machineTop + 55, cx - 22, machineTop + 98 * crackProgress, { roughness: 1.5, seed: 810 })}
              stroke="#C93756"
              strokeWidth="6"
              fill="none"
              strokeDasharray={interpolate(crackProgress, [0, 1], ['0', '120, 120'])}
            />
            <path
              d={handLine(cx + 22, machineTop + 122 * crackProgress, cx + 72, machineTop + 78, { roughness: 1.5, seed: 811 })}
              stroke="#C93756"
              strokeWidth="6"
              fill="none"
              strokeDasharray={interpolate(crackProgress, [0, 1], ['0', '120, 120'])}
            />
            <path d={handRect(cx - 36, machineBottom - 50, 72, 38, { roughness: 1, seed: 812 })} fill="none" stroke="#C93756" strokeWidth="4.5" />
            {/* Drip */}
            <path d={handLine(cx, machineTop - 2, cx, machineTop + 32 + dripY, { roughness: 0.8, seed: 820 })} stroke="#C93756" strokeWidth="4.5" fill="none" />
            <circle cx={cx} cy={machineTop + 34 + dripY} r={8} fill="url(#grad-red)" stroke={PALETTE.ink} strokeWidth="2.5" />
          </>
        )}
        {/* Wrench when fixing */}
        {state === 'fixing' && (
          <g transform={`rotate(${wrenchRot} ${cx - 50} ${machineBottom + 18})`}>
            <path d={handLine(cx - 50, machineBottom + 18, cx - 18, machineBottom + 62, { roughness: 0.8, seed: 830 })} stroke={PALETTE.inkSoft} strokeWidth="7" fill="none" />
            <circle cx={cx - 55} cy={machineBottom + 13} r={12} fill="none" stroke={PALETTE.inkSoft} strokeWidth="4.5" />
          </g>
        )}
        {/* Labels */}
        <text x={cx} y={machineTop - 52} fontFamily="system-ui, sans-serif" fontSize={15} fill={PALETTE.textMuted} textAnchor="middle" fontWeight={800}>The Government</text>
        {state === 'working' && (
          <text x={cx} y={machineBottom + 48} fontFamily="system-ui, sans-serif" fontSize={15} fill="#36B37E" textAnchor="middle" fontWeight={900}>Serves ice cream</text>
        )}
        {state === 'broken' && (
          <text x={cx} y={machineBottom + 48} fontFamily="system-ui, sans-serif" fontSize={15} fill="#C93756" textAnchor="middle" fontWeight={900}>Broken — serves nothing</text>
        )}
        {state === 'fixing' && (
          <text x={cx} y={machineBottom + 48} fontFamily="system-ui, sans-serif" fontSize={15} fill="#0F62FE" textAnchor="middle" fontWeight={900}>Fixing the machine first</text>
        )}
        {state === 'working' && steam}
      </svg>
    </div>
  );
};

/* =========================================================================
   4. LEGACY CONTRAST (Obama/McCain vs Trump) — 4X intricate
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
  width = 460,
  height = 360,
}) => {
  const frame = useCurrentFrame();
  const mid = width / 2;

  const enter = Math.min(frame / (FPS * 0.8), 1);
  const leftX = 20 - (1 - enter) * 70;
  const rightX = mid + 20 + (1 - enter) * 70;
  const opacity = enter;

  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height, opacity }}>
      <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        <Defs />
        {/* Border */}
        <path d={handRect(10, 10, width - 20, height - 20, { roughness: 1.5, seed: 900 })} fill="none" stroke={PALETTE.ink} strokeWidth="3" />
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="tl" seed={901} />
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="tr" seed={902} />
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="bl" seed={903} />
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="br" seed={904} />

        {/* Divider line */}
        <path
          d={handLine(mid, 34, mid, height - 76, { roughness: 0.6, seed: 905 })}
          stroke={PALETTE.inkSoft}
          strokeWidth="3.5"
          fill="none"
          strokeDasharray={`6 6`}
          style={{ strokeDashoffset: interpolate(enter, [0, 1], [240, 0]) }}
        />

        {/* Left panel: Then */}
        <rect
          x={leftX}
          y={74}
          width={mid - 44}
          height={height - 154}
          rx={16}
          fill="#EFF6FD"
          stroke={PALETTE.ink}
          strokeWidth="4"
          style={{ filter: 'url(#ink-shadow)', opacity }}
        />
        <path d={handRect(leftX, 74, mid - 44, height - 154, { roughness: 0.8, seed: 906 })} fill="none" stroke="url(#grad-ink)" strokeWidth="2.5" />
        <circle cx={leftX + (mid - 44) / 2} cy={118} r={30} fill="#FFFFFF" stroke="#0F62FE" strokeWidth="5" />
        <text x={leftX + (mid - 44) / 2} y={123} fontFamily="system-ui, sans-serif" fontSize={14} fill="#0F62FE" textAnchor="middle" fontWeight={900}>O/M</text>
        <text x={leftX + (mid - 44) / 2} y={156} fontFamily="system-ui, sans-serif" fontSize={16} fontWeight={900} fill="#0F62FE" textAnchor="middle" opacity={enter}>Then</text>
        <text
          x={leftX + (mid - 44) / 2}
          y={188}
          fontFamily="system-ui, sans-serif"
          fontSize={13}
          fill={PALETTE.textMuted}
          textAnchor="middle"
          opacity={enter}
          style={{ filter: 'url(#grain)' }}
        >
          Graceful concession — McCain defends Obama
        </text>
        <text x={leftX + (mid - 44) / 2} y={210} fontFamily="system-ui, sans-serif" fontSize={12} fill={PALETTE.textMuted} textAnchor="middle" opacity={enter} style={{ filter: 'url(#grain)' }}>Unity when disunity was self-inflicted</text>

        {/* Right panel: Now */}
        <rect
          x={rightX}
          y={74}
          width={mid - 44}
          height={height - 154}
          rx={16}
          fill="#FDF3F4"
          stroke={PALETTE.ink}
          strokeWidth="4"
          style={{ filter: 'url(#ink-shadow)', opacity }}
        />
        <path d={handRect(rightX, 74, mid - 44, height - 154, { roughness: 0.8, seed: 907 })} fill="none" stroke="url(#grad-ink)" strokeWidth="2.5" />
        <circle cx={rightX + (mid - 44) / 2} cy={118} r={30} fill="#FFFFFF" stroke="#C93756" strokeWidth="5" />
        <text x={rightX + (mid - 44) / 2} y={123} fontFamily="system-ui, sans-serif" fontSize={14} fill="#C93756" textAnchor="middle" fontWeight={900}>DJT</text>
        <text x={rightX + (mid - 44) / 2} y={156} fontFamily="system-ui, sans-serif" fontSize={16} fontWeight={900} fill="#C93756" textAnchor="middle" opacity={enter}>Now</text>
        <text
          x={rightX + (mid - 44) / 2}
          y={188}
          fontFamily="system-ui, sans-serif"
          fontSize={13}
          fill={PALETTE.textMuted}
          textAnchor="middle"
          opacity={enter}
          style={{ filter: 'url(#grain)' }}
        >
          Patriotic disgrace — corrupt robber baron
        </text>
        <text x={rightX + (mid - 44) / 2} y={210} fontFamily="system-ui, sans-serif" fontSize={12} fill={PALETTE.textMuted} textAnchor="middle" opacity={enter} style={{ filter: 'url(#grain)' }}>“Trump is not America”</text>

        {/* Bottom label */}
        <text
          x={width / 2}
          y={height - 26}
          fontFamily="system-ui, sans-serif"
          fontSize={14}
          fontWeight={900}
          fill={PALETTE.ink}
          textAnchor="middle"
          opacity={enter}
        >
          A moment of patriotic disgrace, not policy dialectics
        </text>
        {/* Pulsing alert dot on right */}
        <circle
          cx={rightX + (mid - 44) - 28}
          cy={88}
          r={7 + Math.sin(frame * 0.15) * 2.5}
          fill="#C93756"
          opacity={0.65 + 0.35 * Math.sin(frame * 0.1)}
        />
      </svg>
    </div>
  );
};

/* =========================================================================
   5. SHIELD OF POWER — 4X intricate
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
  width = 360,
  height = 360,
}) => {
  const frame = useCurrentFrame();
  const cx = width / 2;
  const topY = height * 0.25;

  const crackProgress = state === 'cracking' ? Math.min(frame / (FPS * 1.4), 1) : state === 'broken' ? 1 : 0;
  const shieldGlow = state === 'broken' ? 0.5 + 0.5 * Math.sin(frame * 0.1) : 0;
  const hammerPulse = state !== 'intact' ? 1 + Math.sin(frame * 0.1) * 0.18 : 1;

  const border = handRect(10, 10, width - 20, height - 20, { roughness: 1.5, seed: 950 });

  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height }}>
      <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        <Defs />
        <path d={border} fill="none" stroke={PALETTE.ink} strokeWidth="3" style={{ filter: 'url(#ink-shadow)' }} />
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="tl" seed={951} />
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="tr" seed={952} />
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="bl" seed={953} />
        <CornerFlourish x={22} y={22} w={width - 44} h={height - 44} corner="br" seed={954} />

        <path d={handLine(width / 2 - 76, 46, width / 2 + 76, 46, { roughness: 1, seed: 955 })} stroke={PALETTE.accent} strokeWidth="3" fill="none" />

        {/* Power rays behind shield when broken */}
        {state === 'broken' && (
          <>
            {Array.from({ length: 10 }).map((_, i) => {
              const angle = (i / 10) * Math.PI * 2;
              const r1 = 44 + 18 * Math.sin(frame * 0.05 + i);
              const r2 = 108 + 28 * Math.sin(frame * 0.07 + i);
              return (
                <path
                  key={i}
                  d={`M ${cx + Math.cos(angle) * r1} ${topY + height * 0.55 + Math.sin(angle) * r1} L ${cx + Math.cos(angle) * r2} ${topY + height * 0.55 + Math.sin(angle) * r2}`}
                  stroke="#36B37E"
                  strokeWidth="3.5"
                  opacity={0.5 + 0.3 * Math.sin(frame * 0.08 + i)}
                  strokeLinecap="round"
                />
              );
            })}
          </>
        )}
        {/* Shield body */}
        <path
          d={`M ${cx} ${topY} Q ${cx + 120} ${topY} ${cx + 110} ${topY + 48} L ${cx + 110} ${topY + 144} Q ${cx + 86} ${topY + 218} ${cx} ${topY + 242} Q ${cx - 86} ${topY + 218} ${cx - 110} ${topY + 144} L ${cx - 110} ${topY + 48} Q ${cx - 120} ${topY} ${cx} ${topY} Z`}
          fill={state === 'broken' ? '#FDF3F4' : 'url(#grad-paper)'}
          stroke={PALETTE.ink}
          strokeWidth="6"
          style={{
            filter: state === 'broken' ? 'url(#glow-red)' : 'url(#ink-shadow)',
            opacity: 0.95 + shieldGlow * 0.12,
          }}
        />
        <path
          d={`M ${cx} ${topY} Q ${cx + 120} ${topY} ${cx + 110} ${topY + 48} L ${cx + 110} ${topY + 144} Q ${cx + 86} ${topY + 218} ${cx} ${topY + 242} Q ${cx - 86} ${topY + 218} ${cx - 110} ${topY + 144} L ${cx - 110} ${topY + 48} Q ${cx - 120} ${topY} ${cx} ${topY} Z`}
          fill="none"
          stroke="url(#grad-ink)"
          strokeWidth="3.5"
        />
        {/* Inner power symbol */}
        <text
          x={cx}
          y={topY + 154}
          fontFamily="system-ui, sans-serif"
          fontSize={48}
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
              d={handLine(cx - 24, topY + 72, cx - 44, topY + 132 * crackProgress, { roughness: 1.2, seed: 960 })}
              stroke="#C93756"
              strokeWidth="6"
              fill="none"
              strokeDasharray={interpolate(crackProgress, [0, 1], ['0', '220, 220'])}
            />
            <path
              d={handLine(cx + 34, topY + 82, cx + 54, topY + 154 * crackProgress, { roughness: 1.2, seed: 961 })}
              stroke="#C93756"
              strokeWidth="6"
              fill="none"
              strokeDasharray={interpolate(crackProgress, [0, 1], ['0', '220, 220'])}
            />
          </>
        )}
        {state === 'broken' && (
          <>
            <path
              d={handLine(cx - 34, topY + 60, cx - 54, topY + 158, { roughness: 1.5, seed: 970 })}
              stroke="#C93756"
              strokeWidth="7"
              fill="none"
            />
            <path
              d={handLine(cx + 44, topY + 72, cx + 74, topY + 168, { roughness: 1.5, seed: 971 })}
              stroke="#C93756"
              strokeWidth="7"
              fill="none"
            />
            <path
              d={handLine(cx - 22, topY + 168, cx + 32, topY + 192, { roughness: 1.5, seed: 972 })}
              stroke="#C93756"
              strokeWidth="7"
              fill="none"
            />
          </>
        )}
        {/* Justice hammer striking */}
        {state !== 'intact' && (
          <g transform={`translate(${cx}, ${topY + 252}) scale(${hammerPulse})`}>
            <path d={handLine(0, 0, 0, 36, { roughness: 0.6, seed: 980 })} stroke="#36B37E" strokeWidth="8" fill="none" strokeLinecap="round" />
            <rect x={-16} y={36} width={32} height={20} fill="#36B37E" stroke={PALETTE.ink} strokeWidth="3.5" />
          </g>
        )}
        {/* Label */}
        <text x={cx} y={topY - 18} fontFamily="system-ui, sans-serif" fontSize={14} fill={PALETTE.textMuted} textAnchor="middle" fontWeight={800}>The Shielding of Power</text>
        {state === 'intact' && (
          <text x={cx} y={topY + 272} fontFamily="system-ui, sans-serif" fontSize={13} fill={PALETTE.textMuted} textAnchor="middle">Justice cannot penetrate</text>
        )}
        {state === 'cracking' && (
          <text x={cx} y={topY + 272} fontFamily="system-ui, sans-serif" fontSize={13} fill="#F5A623" textAnchor="middle" fontWeight={900}>Justice begins to crack the shield</text>
        )}
        {state === 'broken' && (
          <text x={cx} y={topY + 272} fontFamily="system-ui, sans-serif" fontSize={13} fill="#36B37E" textAnchor="middle" fontWeight={900}>Justice breaks through</text>
        )}
      </svg>
    </div>
  );
};

/* =========================================================================
   6. BALANCE SCENE DECORATION — floating ink blot + page corner
   ========================================================================= */

export const PageDecorator: React.FC<{ frame: number; x: number; y: number; w: number; h: number; seed: number }> = ({
  frame, x, y, w, h, seed,
}) => {
  const float = idleFloat(frame, 0.05, 1.2);
  return (
    <g transform={`translate(${x + float * 0.3}, ${y + float * 0.3})`}>
      <path d={handRect(0, 0, w, h, { roughness: 1.8, seed })} fill="none" stroke={PALETTE.ink} strokeWidth="2.5" opacity={0.55} />
      <InkSplat cx={w * 0.12} cy={h * 0.88} seed={seed + 200} size={12} color={PALETTE.inkSoft} opacity={0.18} />
      <InkSplat cx={w * 0.88} cy={h * 0.12} seed={seed + 210} size={10} color={PALETTE.inkSoft} opacity={0.16} />
    </g>
  );
};
