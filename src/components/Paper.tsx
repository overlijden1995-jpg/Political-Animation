import * as React from 'react';
import { PALETTE } from '../theme/colors';

/**
 * Paper background with a subtle hand-made texture (SVG turbulence noise) and
 * a soft vignette. Use as the base layer of every scene.
 */
interface PaperProps {
  children?: React.ReactNode;
  color?: string;
  grain?: boolean;        // texture noise overlay
  vignette?: boolean;     // darkened corners
  deckle?: boolean;       // rough, torn-paper edges on all sides
}

export const Paper: React.FC<PaperProps> = ({
  children,
  color = PALETTE.paper,
  grain = true,
  vignette = true,
  deckle = false,
}) => {
  const style: React.CSSProperties = {
    backgroundColor: color,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  };

  return (
    <div style={style}>
      {grain && (
        <svg
          width="100%"
          height="100%"
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          <defs>
            <filter id="paper-grain" x="0%" y="0%" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0" />
              <feBlend mode="multiply" in2="SourceGraphic" />
            </filter>
            <filter id="deckle" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="turbulence" baseFrequency="0.015" numOctaves="2" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
          <rect width="100%" height="100%" filter={deckle ? 'url(#deckle)' : 'url(#paper-grain)'} />
        </svg>
      )}
      {vignette && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at center, transparent 60%, rgba(31,26,20,0.12) 100%)',
            pointerEvents: 'none',
          }}
        />
      )}
      {children}
    </div>
  );
};
