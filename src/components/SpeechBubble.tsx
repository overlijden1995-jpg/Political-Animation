import * as React from 'react';
import { handCircle, handLine, handRect } from '../theme/brush';
import { PALETTE, FONT } from '../theme/colors';

/**
 * Hand-drawn comic speech bubble with a tail pointing at a character. Text is
 * set in a comic-friendly font stack with all-caps emphasis feel.
 */
interface SpeechBubbleProps {
  x: number;           // bubble center x
  y: number;           // bubble center y
  text: string;
  targetX?: number;    // who the tail points at (defaults to bubble x)
  targetY?: number;    // defaults to bubble y - radius
  width?: number;
  fill?: string;
  stroke?: string;
  fontSize?: number;
  textColor?: string;
  tail?: boolean;
  shake?: number;      // degrees of wobble for "shouting" frames
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  x,
  y,
  text,
  targetX = x,
  targetY = y - 60,
  width = 260,
  fill = PALETTE.white,
  stroke = PALETTE.ink,
  fontSize = 24,
  textColor = PALETTE.text,
  tail = true,
  shake = 0,
}) => {
  const rx = width / 2;
  const ry = Math.min(width / 2.6, 110);
  const bubbleX = x - rx;
  const bubbleY = y - ry;

  const border = handRect(bubbleX, bubbleY, width, ry * 2, { roughness: 1.4, seed: 21, close: true });

  const tailPath = tail
    ? handLine(
        x,
        bubbleY + ry * 2,
        targetX,
        targetY,
        { roughness: 1.8, seed: 31, bow: 0.15 },
      )
    : '';

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        transform: shake ? `rotate(${shake}deg)` : undefined,
        transformOrigin: `${x}px ${y}px`,
      }}
    >
      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        <path
          d={border}
          fill={fill}
          stroke={stroke}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        {tail && (
          <path
            d={tailPath}
            fill="none"
            stroke={stroke}
            strokeWidth={3}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: bubbleX + 18,
          top: bubbleY + 10,
          width: width - 36,
          height: ry * 2 - 20,
          fontFamily: FONT.heading,
          fontSize,
          fontWeight: 700,
          color: textColor,
          lineHeight: 1.35,
          textAlign: 'center',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
          maxHeight: ry * 2 - 20,
        }}
      >
        {text}
      </div>
    </div>
  );
};
