import * as React from 'react';
import {
  Audio,
  Composition,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { BAD_ACTORS_EP01_JD_VANCE } from '../data/badActorsJDVance';
import type { BadActorsEpisode as BadActorsEpisodeData } from '../agents/badActorsAgent';
import { compileDeck } from '../slides/deck';
import { DeckStage } from '../slides/DeckStage';
import { loadDeckFonts } from '../slides/fonts';

const FPS = 30;
const W = 1920;
const H = 1080;

export interface BadActorsEpisodeProps {
  episode?: BadActorsEpisodeData;
  /** Burn the narration in as a typographic caption line. */
  captions?: boolean;
}

/**
 * Remotion shell for the Swiss Broadsheet deck.
 *
 * All layout, timing and typography live in `src/slides` so the exact same
 * deck can be projected in the browser player and encoded to MP4 without the
 * two drifting apart. This component only supplies the frame clock and the
 * audio track.
 */
export const BadActorsScene: React.FC<BadActorsEpisodeProps> = ({
  episode = BAD_ACTORS_EP01_JD_VANCE,
  captions = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const deck = React.useMemo(() => compileDeck(episode), [episode]);

  // Real typefaces must be live before the first frame is painted and measured.
  const [fontHandle] = React.useState(() => delayRender('Loading deck typefaces'));
  React.useEffect(() => {
    let done = false;
    loadDeckFonts().finally(() => {
      if (done) return;
      done = true;
      continueRender(fontHandle);
    });
  }, [fontHandle]);

  return (
    <>
      {episode.audioSrc ? <Audio src={staticFile(episode.audioSrc)} /> : null}
      <DeckStage deck={deck} time={frame / fps} showCaptions={captions} />
    </>
  );
};

export const BadActorsJDVance: React.FC = () => (
  <Composition
    id="BadActorsJDVance"
    component={BadActorsScene}
    durationInFrames={BAD_ACTORS_EP01_JD_VANCE.durationSeconds * FPS}
    fps={FPS}
    width={W}
    height={H}
    defaultProps={{ episode: BAD_ACTORS_EP01_JD_VANCE, captions: true }}
  />
);
