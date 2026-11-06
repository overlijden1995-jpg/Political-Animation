import * as React from 'react';
import { handRect, handLine, handCircle } from '../theme/brush';
import { PALETTE } from '../theme/colors';

/**
 * Scales of Justice metaphor — hand-drawn balance scale.
 * Left pan: "Accountability" (blue), Right pan: "Bipartisan Reform" (red).
 * Can tilt to show which side weighs more.
 */
interface ScalesProps {
  /** Which side is heavier: 'accountability' | 'reform' | 'balanced' */
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
  width = 400,
  height = 300,
}) => {
  const fulcrumX = width / 2;
  const beamY = height * 0.35;
  const panY = height * 0.6;
  const panW = 90;

  // Tilt angle based on which side is heavier
  let angle = 0;
  if (tilt === 'accountability') angle = -10; // left down
  if (tilt === 'reform') angle = 10; // right down

  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height }}>
      <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        {/* Stand */}
        <rect x={fulcrumX - 8} y={beamY} width={16} height={height * 0.55} fill={PALETTE.inkSoft} />
        {/* Fulcrum circle */}
        <circle cx={fulcrumX} cy={beamY} r={14} fill={PALETTE.ink} stroke={PALETTE.ink} strokeWidth="3" />
        {/* Beam */}
        <path
          d={handLine(40, beamY, width - 40, beamY, { roughness: 1, seed: 501 })}
          stroke={PALETTE.ink}
          strokeWidth="5"
          fill="none"
          transform={`rotate(${angle} ${fulcrumX} ${beamY})`}
        />
        {/* Left pan: Accountability */}
        <g transform={`rotate(${angle} ${fulcrumX} ${beamY})`}>
          <line
            x1={fulcrumX - 60}
            y1={beamY}
            x2={fulcrumX - 60}
            y2={panY}
            stroke={PALETTE.ink}
            strokeWidth="3"
          />
          <rect
            x={fulcrumX - 60 - panW / 2}
            y={panY}
            width={panW}
            height={50}
            rx={8}
            fill="#E4EEFF"
            stroke={PALETTE.ink}
            strokeWidth="3"
          />
          <text
            x={fulcrumX - 60}
            y={panY + 32}
            fontFamily="system-ui, sans-serif"
            fontSize={14}
            fontWeight={800}
            fill={PALETTE.ink}
            textAnchor="middle"
          >
            Accountability
          </text>
        </g>
        {/* Right pan: Reform */}
        <g transform={`rotate(${angle} ${fulcrumX} ${beamY})`}>
          <line
            x1={fulcrumX + 60}
            y1={beamY}
            x2={fulcrumX + 60}
            y2={panY}
            stroke={PALETTE.ink}
            strokeWidth="3"
          />
          <rect
            x={fulcrumX + 60 - panW / 2}
            y={panY}
            width={panW}
            height={50}
            rx={8}
            fill="#FCE9E9"
            stroke={PALETTE.ink}
            strokeWidth="3"
          />
          <text
            x={fulcrumX + 60}
            y={panY + 32}
            fontFamily="system-ui, sans-serif"
            fontSize={14}
            fontWeight={800}
            fill={PALETTE.ink}
            textAnchor="middle"
          >
            Reform
          </text>
        </g>
        {/* Labels above */}
        <text x={fulcrumX - 60} y={beamY - 15} fontFamily="system-ui, sans-serif" fontSize={13} fill={PALETTE.textMuted} textAnchor="middle">Justice</text>
        <text x={fulcrumX + 60} y={beamY - 15} fontFamily="system-ui, sans-serif" fontSize={13} fill={PALETTE.textMuted} textAnchor="middle">Bipartisanship</text>
      </svg>
    </div>
  );
};

/**
 * Cancer metaphor — cells misbehaving, one cell growing abnormally
 * representing corruption metastasizing through institutions.
 */
interface CancerProps {
  /** Stage: 'healthy' | 'misbehaving' | 'tumor' | 'metastasis' */
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
  width = 400,
  height = 300,
}) => {
  const cx = width / 2;
  const cy = height / 2;

  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height }}>
      <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        {/* Background tissue - healthy cells */}
        {['healthy', 'misbehaving', 'tumor', 'metastasis'].includes(stage) ||
          stage === 'healthy' ? (
            <>
              {Array.from({ length: 20 }).map((_, i) => {
                const sx = 60 + (i % 5) * 70;
                const sy = 80 + Math.floor(i / 5) * 70;
                const isHealthy = stage === 'healthy' || stage === 'misbehaving';
                return (
                  <path
                    key={i}
                    d={handCircle(sx, sy, 14, { roughness: 1, seed: 600 + i })}
                    fill={isHealthy ? '#C9D6EA' : '#FCE9E9'}
                    stroke={PALETTE.ink}
                    strokeWidth="3"
                  />
                );
              })}
            </>
          ) : null}

        {/* Misbehaving cell (red, starting to grow) */}
        {(stage === 'misbehaving' || stage === 'tumor' || stage === 'metastasis') && (
          <path
            d={handCircle(cx - 60, cy, 22, { roughness: 1.5, seed: 650 })}
            fill="#F5E6E8"
            stroke={PALETTE.ink}
            strokeWidth="3"
          />
        )}

        {/* Tumor (large red mass) */}
        {(stage === 'tumor' || stage === 'metastasis') && (
          <path
            d={handCircle(cx + 40, cy + 20, 45, { roughness: 2, seed: 660 })}
            fill="#C93756"
            stroke={PALETTE.ink}
            strokeWidth="3"
          />
        )}

        {/* Metastasis - smaller cells spreading */}
        {stage === 'metastasis' && (
          <>
            <path d={handCircle(80, 120, 18, { roughness: 1.8, seed: 670 })} fill="#C93756" stroke={PALETTE.ink} strokeWidth="3" />
            <path d={handCircle(320, 80, 16, { roughness: 1.8, seed: 680 })} fill="#C93756" stroke={PALETTE.ink} strokeWidth="3" />
            <path d={handCircle(100, 240, 20, { roughness: 1.8, seed: 690 })} fill="#C93756" stroke={PALETTE.ink} strokeWidth="3" />
            <path d={handCircle(340, 220, 17, { roughness: 1.8, seed: 700 })} fill="#C93756" stroke={PALETTE.ink} strokeWidth="3" />
          </>
        )}

        {/* Labels */}
        {stage === 'healthy' && (
          <text x={cx} y={height - 30} fontFamily="system-ui, sans-serif" fontSize={14} fill={PALETTE.textMuted} textAnchor="middle">Healthy institutions</text>
        )}
        {stage === 'misbehaving' && (
          <text x={cx} y={height - 30} fontFamily="system-ui, sans-serif" fontSize={14} fill={PALETTE.textMuted} textAnchor="middle">Corruption begins — one cell misbehaves</text>
        )}
        {stage === 'tumor' && (
          <text x={cx} y={height - 30} fontFamily="system-ui, sans-serif" fontSize={14} fill={PALETTE.textMuted} textAnchor="middle">Tumor forms — corruption grows unchecked</text>
        )}
        {stage === 'metastasis' && (
          <text x={cx} y={height - 30} fontFamily="system-ui, sans-serif" fontSize={14} fill={PALETTE.textMuted} textAnchor="middle">Metastasis — corruption spreads through the body</text>
        )}
      </svg>
    </div>
  );
};

/**
 * Ice Cream Machine metaphor — government as an ice cream machine.
 * Can be 'working' or 'broken'. When broken, no ice cream can be served.
 */
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
  width = 400,
  height = 300,
}) => {
  const cx = width / 2;
  const machineTop = height * 0.35;
  const machineBottom = height * 0.85;

  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height }}>
      <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        {/* Machine body */}
        <rect
          x={cx - 100}
          y={machineTop}
          width={200}
          height={machineBottom - machineTop}
          rx={16}
          fill={state === 'broken' ? '#F5E6E8' : '#E4EEFF'}
          stroke={PALETTE.ink}
          strokeWidth="4"
        />
        <path
          d={handRect(cx - 100, machineTop, 200, machineBottom - machineTop, { roughness: 1.2, seed: 801 })}
          fill="none"
          stroke={PALETTE.ink}
          strokeWidth="3"
        />
        {/* Dispenser spout */}
        <rect x={cx - 20} y={machineTop - 30} width={40} height={30} fill="#C9D6EA" stroke={PALETTE.ink} strokeWidth="3" />
        <path
          d={handLine(cx - 20, machineTop - 30, cx + 20, machineTop - 30, { roughness: 0.8, seed: 802 })}
          stroke={PALETTE.ink}
          strokeWidth="3"
          fill="none"
        />
        {/* Ice cream swirl (only when working) */}
        {state === 'working' && (
          <path
            d={`M ${cx - 15} ${machineTop - 30} Q ${cx} ${machineTop - 50} ${cx + 15} ${machineTop - 30} Q ${cx} ${machineTop - 35} ${cx - 15} ${machineTop - 30} Z`}
            fill="#FDF0D5"
            stroke={PALETTE.ink}
            strokeWidth="2.5"
          />
        )}
        {/* Crack lines when broken */}
        {state === 'broken' && (
          <>
            <path d={handLine(cx - 60, machineTop + 40, cx - 20, machineTop + 80, { roughness: 1.5, seed: 810 })} stroke="#C93756" strokeWidth="4" fill="none" />
            <path d={handLine(cx + 20, machineTop + 100, cx + 60, machineTop + 60, { roughness: 1.5, seed: 811 })} stroke="#C93756" strokeWidth="4" fill="none" />
            <path d={handRect(cx - 30, machineBottom - 40, 60, 30, { roughness: 1, seed: 812 })} fill="none" stroke="#C93756" strokeWidth="3" />
          </>
        )}
        {/* Fixing wrench */}
        {state === 'fixing' && (
          <>
            <path d={handLine(cx - 40, machineBottom + 20, cx - 10, machineBottom + 50, { roughness: 0.8, seed: 820 })} stroke={PALETTE.inkSoft} strokeWidth="5" fill="none" />
            <circle cx={cx - 45} cy={machineBottom + 15} r={8} fill="none" stroke={PALETTE.inkSoft} strokeWidth="3" />
          </>
        )}
        {/* Labels */}
        <text x={cx} y={machineTop - 45} fontFamily="system-ui, sans-serif" fontSize={14} fill={PALETTE.textMuted} textAnchor="middle">The Government</text>
        {state === 'working' && (
          <text x={cx} y={machineBottom + 40} fontFamily="system-ui, sans-serif" fontSize={14} fill="#36B37E" textAnchor="middle" fontWeight={800}>Serves ice cream</text>
        )}
        {state === 'broken' && (
          <text x={cx} y={machineBottom + 40} fontFamily="system-ui, sans-serif" fontSize={14} fill="#C93756" textAnchor="middle" fontWeight={800}>Broken — serves nothing</text>
        )}
        {state === 'fixing' && (
          <text x={cx} y={machineBottom + 40} fontFamily="system-ui, sans-serif" fontSize={14} fill="#0F62FE" textAnchor="middle" fontWeight={800}>Fixing the machine first</text>
        )}
      </svg>
    </div>
  );
};

/**
 * Contrast panel: Obama/McCain vs Trump.
 * Left side: graceful statesman (McCain/Obama era), Right side: robber baron (Trump era).
 */
interface LegacyContrastProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export const LegacyContrast: React.FC<LegacyContrastProps> = ({
  x = 0,
  y = 0,
  width = 400,
  height = 300,
}) => {
  const mid = width / 2;

  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height }}>
      {/* Divider line */}
      <path
        d={handLine(mid, 20, mid, height - 60, { roughness: 0.8, seed: 901 })}
        stroke={PALETTE.inkSoft}
        strokeWidth="3"
        fill="none"
        strokeDasharray="6 6"
      />

      {/* Left: Obama/McCain era */}
      <rect x={20} y={60} width={mid - 40} height={height - 140} rx={12} fill="#E4EEFF" stroke={PALETTE.ink} strokeWidth="3" />
      <path
        d={handRect(20, 60, mid - 40, height - 140, { roughness: 1, seed: 902 })}
        fill="none"
        stroke={PALETTE.ink}
        strokeWidth="2"
      />
      <text x={20 + (mid - 40) / 2} y={100} fontFamily="system-ui, sans-serif" fontSize={15} fontWeight={800} fill="#0F62FE" textAnchor="middle">Then</text>
      <text x={20 + (mid - 40) / 2} y={130} fontFamily="system-ui, sans-serif" fontSize={12} fill={PALETTE.textMuted} textAnchor="middle">Graceful concession — McCain defends Obama</text>
      <text x={20 + (mid - 40) / 2} y={155} fontFamily="system-ui, sans-serif" fontSize={12} fill={PALETTE.textMuted} textAnchor="middle">Unity when disunity was self-inflicted</text>

      {/* Right: Trump era */}
      <rect x={mid + 20} y={60} width={mid - 40} height={height - 140} rx={12} fill="#FCE9E9" stroke={PALETTE.ink} strokeWidth="3" />
      <path
        d={handRect(mid + 20, 60, mid - 40, height - 140, { roughness: 1, seed: 903 })}
        fill="none"
        stroke={PALETTE.ink}
        strokeWidth="2"
      />
      <text x={mid + 20 + (mid - 40) / 2} y={100} fontFamily="system-ui, sans-serif" fontSize={15} fontWeight={800} fill="#C93756" textAnchor="middle">Now</text>
      <text x={mid + 20 + (mid - 40) / 2} y={130} fontFamily="system-ui, sans-serif" fontSize={12} fill={PALETTE.textMuted} textAnchor="middle">Patriotic disgrace — corrupt robber baron</text>
      <text x={mid + 20 + (mid - 40) / 2} y={155} fontFamily="system-ui, sans-serif" fontSize={12} fill={PALETTE.textMuted} textAnchor="middle">"Trump is not America"</text>

      {/* Bottom label */}
      <text x={width / 2} y={height - 20} fontFamily="system-ui, sans-serif" fontSize={13} fontWeight={800} fill={PALETTE.ink} textAnchor="middle">A moment of patriotic disgrace, not policy dialectics</text>
    </div>
  );
};

/**
 * Shield of Power — represents institutions shielding corrupt figures from justice.
 * A shield with cracks forming, justice trying to penetrate.
 */
interface ShieldProps {
  /** 'intact' | 'cracking' | 'broken' */
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
  width = 300,
  height = 300,
}) => {
  const cx = width / 2;
  const topY = height * 0.25;

  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height }}>
      <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        {/* Shield outline */}
        <path
          d={`M ${cx} ${topY} Q ${cx + 100} ${topY} ${cx + 90} ${topY + 40} L ${cx + 90} ${topY + 120} Q ${cx + 70} ${topY + 180} ${cx} ${topY + 200} Q ${cx - 70} ${topY + 180} ${cx - 90} ${topY + 120} L ${cx - 90} ${topY + 40} Q ${cx - 100} ${topY} ${cx} ${topY} Z`}
          fill={state === 'broken' ? '#F5E6E8' : '#E4EEFF'}
          stroke={PALETTE.ink}
          strokeWidth="4"
        />
        <path
          d={`M ${cx} ${topY} Q ${cx + 100} ${topY} ${cx + 90} ${topY + 40} L ${cx + 90} ${topY + 120} Q ${cx + 70} ${topY + 180} ${cx} ${topY + 200} Q ${cx - 70} ${topY + 180} ${cx - 90} ${topY + 120} L ${cx - 90} ${topY + 40} Q ${cx - 100} ${topY} ${cx} ${topY} Z`}
          fill="none"
          stroke={PALETTE.ink}
          strokeWidth="2.5"
        />
        {/* Power symbol inside */}
        <text x={cx} y={topY + 130} fontFamily="system-ui, sans-serif" fontSize={40} fill={PALETTE.inkSoft} textAnchor="middle">⚡</text>
        {/* Cracks */}
        {state === 'cracking' && (
          <>
            <path d={handLine(cx - 20, topY + 60, cx - 40, topY + 110, { roughness: 1.2, seed: 910 })} stroke="#C93756" strokeWidth="4" fill="none" />
            <path d={handLine(cx + 30, topY + 70, cx + 50, topY + 130, { roughness: 1.2, seed: 911 })} stroke="#C93756" strokeWidth="4" fill="none" />
          </>
        )}
        {state === 'broken' && (
          <>
            <path d={handLine(cx - 30, topY + 50, cx - 50, topY + 130, { roughness: 1.5, seed: 920 })} stroke="#C93756" strokeWidth="5" fill="none" />
            <path d={handLine(cx + 40, topY + 60, cx + 70, topY + 140, { roughness: 1.5, seed: 921 })} stroke="#C93756" strokeWidth="5" fill="none" />
            <path d={handLine(cx - 20, topY + 140, cx + 30, topY + 160, { roughness: 1.5, seed: 922 })} stroke="#C93756" strokeWidth="5" fill="none" />
          </>
        )}
        {/* Justice hammer trying to penetrate */}
        {state !== 'intact' && (
          <>
            <path d={handLine(cx, topY + 210, cx, topY + 240, { roughness: 0.8, seed: 930 })} stroke="#36B37E" strokeWidth="6" fill="none" strokeLinecap="round" />
            <rect x={cx - 12} y={topY + 240} width={24} height={16} fill="#36B37E" stroke={PALETTE.ink} strokeWidth="2" />
          </>
        )}
        {/* Labels */}
        <text x={cx} y={topY - 15} fontFamily="system-ui, sans-serif" fontSize={13} fill={PALETTE.textMuted} textAnchor="middle">The Shielding of Power</text>
        {state === 'intact' && (
          <text x={cx} y={topY + 260} fontFamily="system-ui, sans-serif" fontSize={12} fill={PALETTE.textMuted} textAnchor="middle">Justice cannot penetrate</text>
        )}
        {state === 'cracking' && (
          <text x={cx} y={topY + 260} fontFamily="system-ui, sans-serif" fontSize={12} fill="#F5A623" textAnchor="middle" fontWeight={800}>Justice begins to crack the shield</text>
        )}
        {state === 'broken' && (
          <text x={cx} y={topY + 260} fontFamily="system-ui, sans-serif" fontSize={12} fill="#36B37E" textAnchor="middle" fontWeight={800}>Justice breaks through</text>
        )}
      </svg>
    </div>
  );
};
