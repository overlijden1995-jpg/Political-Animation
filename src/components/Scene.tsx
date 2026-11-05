import * as React from 'react';
import { Paper } from './Paper';

/**
 * Base scene wrapper: full-bleed paper background plus a centered content
 * layer. All scenes in ShortsPlayer and LongFormPlayer should render inside
 * this so the visual style stays consistent.
 */
interface SceneProps {
  children?: React.ReactNode;
  background?: string;
  grain?: boolean;
  vignette?: boolean;
}

export const Scene: React.FC<SceneProps> = ({ children, background, grain = true, vignette = true }) => {
  return (
    <Paper color={background} grain={grain} vignette={vignette}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
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
        }}
      >
        {children}
      </div>
    </Paper>
  );
};
