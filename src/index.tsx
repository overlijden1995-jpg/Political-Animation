import * as React from 'react';
import { registerRoot } from 'remotion';
import { ShortsPlayer } from './compositions/ShortsPlayer';
import { LongFormPlayer } from './compositions/LongFormPlayer';
import { Article2026Midterms } from './compositions/Article2026Midterms';
import { JusticeComposition } from './compositions/JusticeComposition';

/**
 * Remotion only accepts a single `registerRoot()` call, so every composition
 * wrapper (each of which renders its own <Composition />) is mounted from one
 * virtual root component.
 */
const RemotionRoot: React.FC = () => {
  return (
    <>
      <ShortsPlayer />
      <LongFormPlayer />
      <Article2026Midterms />
      <JusticeComposition />
    </>
  );
};

registerRoot(RemotionRoot);
