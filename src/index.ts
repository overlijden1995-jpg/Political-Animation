import * as React from 'react';
import { registerRoot } from 'remotion';
import { BadActorsLookbook } from './compositions/BadActorsLookbook';
import { BadActorsJDVance } from './compositions/BadActorsEpisode';
import { ShortsPlayer } from './compositions/ShortsPlayer';
import { LongFormPlayer } from './compositions/LongFormPlayer';
import { Article2026Midterms } from './compositions/Article2026Midterms';
import { JusticeComposition } from './compositions/JusticeComposition';

const RemotionRoot: React.FC = () =>
  React.createElement(
    React.Fragment,
    null,
    React.createElement(BadActorsLookbook),
    React.createElement(BadActorsJDVance),
    React.createElement(ShortsPlayer),
    React.createElement(LongFormPlayer),
    React.createElement(Article2026Midterms),
    React.createElement(JusticeComposition),
  );

registerRoot(RemotionRoot);
