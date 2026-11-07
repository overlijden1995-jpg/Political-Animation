import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Composition,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  BAD_ACTORS_APPEARANCES,
  type BadActorsAppearanceSpec,
} from '../data/badActorsAppearances';

const SLOT_FRAMES = 150; // 5.0s per appearance @ 30fps (0..71 Slide A, 72..77 Snappy Transition, 78..149 Slide B)

const snapOutQuint = (t: number): number => {
  const c = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - c, 5);
};

const snapInOutExpo = (t: number): number => {
  const c = Math.max(0, Math.min(1, t));
  if (c === 0 || c === 1) return c;
  return c < 0.5
    ? 0.5 * Math.pow(2, 20 * c - 10)
    : 1 - 0.5 * Math.pow(2, -20 * c + 10);
};

const FontFaces: React.FC = () => {
  const css = `
    @font-face { font-family: 'ArchivoBlack'; src: url('${staticFile('bad-actors/fonts/ArchivoBlack_400Regular.ttf')}') format('truetype'); font-weight: 900; }
    @font-face { font-family: 'PlayfairDisplay'; src: url('${staticFile('bad-actors/fonts/PlayfairDisplay_900Black.ttf')}') format('truetype'); font-weight: 900; font-style: normal; }
    @font-face { font-family: 'PlayfairDisplay'; src: url('${staticFile('bad-actors/fonts/PlayfairDisplay_900Black_Italic.ttf')}') format('truetype'); font-weight: 900; font-style: italic; }
    @font-face { font-family: 'Oswald'; src: url('${staticFile('bad-actors/fonts/Oswald_700Bold.ttf')}') format('truetype'); font-weight: 700; }
    @font-face { font-family: 'Syne'; src: url('${staticFile('bad-actors/fonts/Syne_800ExtraBold.ttf')}') format('truetype'); font-weight: 800; }
    @font-face { font-family: 'Anton'; src: url('${staticFile('bad-actors/fonts/Anton_400Regular.ttf')}') format('truetype'); font-weight: 400; }
    @font-face { font-family: 'Fraunces'; src: url('${staticFile('bad-actors/fonts/Fraunces_900Black.ttf')}') format('truetype'); font-weight: 900; }
    @font-face { font-family: 'LeagueSpartan'; src: url('${staticFile('bad-actors/fonts/LeagueSpartan_900Black.ttf')}') format('truetype'); font-weight: 900; }
    @font-face { font-family: 'BodoniModa'; src: url('${staticFile('bad-actors/fonts/BodoniModa_900Black.ttf')}') format('truetype'); font-weight: 900; font-style: normal; }
    @font-face { font-family: 'BodoniModa'; src: url('${staticFile('bad-actors/fonts/BodoniModa_900Black_Italic.ttf')}') format('truetype'); font-weight: 900; font-style: italic; }
    @font-face { font-family: 'InstrumentSerif'; src: url('${staticFile('bad-actors/fonts/InstrumentSerif_400Regular_Italic.ttf')}') format('truetype'); font-weight: 400; font-style: italic; }
    @font-face { font-family: 'LibreBaskerville'; src: url('${staticFile('bad-actors/fonts/LibreBaskerville_400Regular.ttf')}') format('truetype'); font-weight: 400; }
    @font-face { font-family: 'LibreBaskerville'; src: url('${staticFile('bad-actors/fonts/LibreBaskerville_700Bold.ttf')}') format('truetype'); font-weight: 700; }
    @font-face { font-family: 'PlusJakartaSans'; src: url('${staticFile('bad-actors/fonts/PlusJakartaSans_800ExtraBold.ttf')}') format('truetype'); font-weight: 800; }
    @font-face { font-family: 'PlusJakartaSans'; src: url('${staticFile('bad-actors/fonts/PlusJakartaSans_500Medium.ttf')}') format('truetype'); font-weight: 500; }
    @font-face { font-family: 'SpaceGrotesk'; src: url('${staticFile('bad-actors/fonts/SpaceGrotesk_700Bold.ttf')}') format('truetype'); font-weight: 700; }
    @font-face { font-family: 'SpaceGrotesk'; src: url('${staticFile('bad-actors/fonts/SpaceGrotesk_500Medium.ttf')}') format('truetype'); font-weight: 500; }
    @font-face { font-family: 'IBMPlexMono'; src: url('${staticFile('bad-actors/fonts/IBMPlexMono_700Bold.ttf')}') format('truetype'); font-weight: 700; }
  `;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};

const PaperGrainOverlay: React.FC = () => (
  <svg
    width="1920"
    height="1080"
    style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      opacity: 0.085,
      mixBlendMode: 'multiply',
    }}
  >
    <filter id="eggshell-rag">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.82"
        numOctaves={3}
        stitchTiles="stitch"
      />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="1920" height="1080" filter="url(#eggshell-rag)" />
  </svg>
);

const AppearanceSlideCard: React.FC<{
  spec: BadActorsAppearanceSpec;
  variant: 'A' | 'B';
  animSec: number;
}> = ({ spec, variant, animSec }) => {
  const enter = snapOutQuint(animSec / 0.16);
  const photoFilter =
    spec.photoStyle === 'silver-bw' || spec.photoStyle === 'halftone-ink'
      ? 'grayscale(100%) contrast(132%) brightness(98%)'
      : spec.photoStyle === 'sepia-press'
        ? 'grayscale(100%) sepia(18%) contrast(125%)'
        : 'saturate(72%) contrast(108%)';

  // For Slide A, show the exact pixel-accurate 1080p rendered board; for Slide B, render live kinetic typeset layout
  if (variant === 'A') {
    return (
      <AbsoluteFill style={{ backgroundColor: spec.paperHex }}>
        <Img
          src={staticFile(`bad-actors/appearances/${spec.id}.png`)}
          style={{
            width: 1920,
            height: 1080,
            transform: `scale(${interpolate(enter, [0, 1], [1.025, 1])})`,
          }}
        />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: spec.paperHex,
        color: spec.inkHex,
        padding: '64px 88px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top crisp broadsheet rule + stamp */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `3px solid ${spec.inkHex}`,
          paddingBottom: 18,
        }}
      >
        <div
          style={{
            backgroundColor: spec.accentHex,
            color: spec.paperHex,
            fontFamily: 'IBMPlexMono, monospace',
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: '0.14em',
            padding: '7px 14px',
          }}
        >
          {`APPEARANCE ${String(spec.number).padStart(2, '0')} · ${spec.name.toUpperCase()} — SLIDE B`}
        </div>
        <div
          style={{
            fontFamily: 'IBMPlexMono, monospace',
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: '0.14em',
            color: spec.mutedInkHex,
          }}
        >
          {`TRANSITION: ${spec.transitionName.toUpperCase()}`}
        </div>
      </div>

      {/* Main bold typeset + photo split */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.22fr 0.78fr',
          gap: 64,
          marginTop: 44,
          height: 760,
          alignItems: 'stretch',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                fontFamily: `'${spec.displayFont}', serif`,
                fontWeight: 900,
                fontSize: spec.displayFont === 'Anton' ? 128 : 98,
                lineHeight: 0.94,
                letterSpacing: spec.displayFont === 'Anton' ? '0.01em' : '-0.03em',
                color: spec.inkHex,
                transform: `translateY(${(1 - enter) * 26}px)`,
              }}
            >
              92.6% SWEEPING
              <br />
              <span
                style={{
                  color: spec.accentHex,
                  fontStyle:
                    spec.displayFont === 'PlayfairDisplay' || spec.displayFont === 'BodoniModa'
                      ? 'italic'
                      : 'normal',
                }}
              >
                ASSERTIONS.
              </span>
            </div>
            <div
              style={{
                width: `${Math.round(420 * enter)}px`,
                height: 4,
                backgroundColor: spec.inkHex,
                marginTop: 28,
                marginBottom: 28,
              }}
            />
            <div
              style={{
                fontFamily: `'${spec.secondaryFont}', sans-serif`,
                fontSize: 25,
                lineHeight: 1.48,
                color: spec.inkHex,
                maxWidth: 960,
              }}
            >
              “If I have to create stories so that the American media actually pays attention
              to the suffering of the American people, then that’s what I’m going to do.”
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 32,
              borderTop: `2px solid ${spec.inkHex}`,
              paddingTop: 24,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: `'${spec.displayFont}', sans-serif`,
                  fontSize: 64,
                  lineHeight: 1,
                  color: spec.accentHex,
                }}
              >
                0 / 57
              </div>
              <div
                style={{
                  fontFamily: 'IBMPlexMono, monospace',
                  fontSize: 15,
                  fontWeight: 700,
                  marginTop: 8,
                  letterSpacing: '0.08em',
                }}
              >
                SENATE BILLS ENACTED (2023–25)
              </div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: `'${spec.displayFont}', sans-serif`,
                  fontSize: 64,
                  lineHeight: 1,
                  color: spec.inkHex,
                }}
              >
                8 VOTES
              </div>
              <div
                style={{
                  fontFamily: 'IBMPlexMono, monospace',
                  fontSize: 15,
                  fontWeight: 700,
                  marginTop: 8,
                  letterSpacing: '0.08em',
                }}
              >
                VP SENATE TIE-BREAKERS (2025–26)
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            border: `3px solid ${spec.inkHex}`,
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: spec.inkHex,
          }}
        >
          <Img
            src={staticFile('bad-actors/ep01-jd-vance/photos/08-munich-podium-2025.jpg')}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: '78% 18%',
              filter: photoFilter,
            }}
          />
        </div>
      </div>

      <PaperGrainOverlay />
    </AbsoluteFill>
  );
};

export const BadActorsLookbookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const styleIdx = Math.min(
    BAD_ACTORS_APPEARANCES.length - 1,
    Math.floor(frame / SLOT_FRAMES),
  );
  const localFrame = frame - styleIdx * SLOT_FRAMES;
  const spec = BAD_ACTORS_APPEARANCES[styleIdx];

  const isSlideA = localFrame < 72;
  const inTrans = localFrame >= 72 && localFrame < 78;
  const transP = snapInOutExpo((localFrame - 71) / 6);

  return (
    <AbsoluteFill style={{ backgroundColor: spec.paperHex }}>
      <FontFaces />
      <Audio src={staticFile('bad-actors/ep01-jd-vance/audio/episode-master.mp3')} volume={0.85} />

      {isSlideA && (
        <AppearanceSlideCard spec={spec} variant="A" animSec={localFrame / fps} />
      )}

      {!isSlideA && !inTrans && (
        <AppearanceSlideCard spec={spec} variant="B" animSec={(localFrame - 72) / fps} />
      )}

      {inTrans && (
        <AbsoluteFill>
          <AppearanceSlideCard spec={spec} variant="A" animSec={2.3} />
          <AbsoluteFill
            style={{
              clipPath:
                styleIdx % 2 === 0
                  ? `inset(0 ${Math.round((1 - transP) * 100)}% 0 0)`
                  : `inset(${Math.round((1 - transP) * 100)}% 0 0 0)`,
            }}
          >
            <AppearanceSlideCard spec={spec} variant="B" animSec={(localFrame - 72) / fps} />
          </AbsoluteFill>
          <div
            style={{
              position: 'absolute',
              left: styleIdx % 2 === 0 ? `${transP * 100}%` : 0,
              top: styleIdx % 2 === 0 ? 0 : `${transP * 100}%`,
              width: styleIdx % 2 === 0 ? 18 : '100%',
              height: styleIdx % 2 === 0 ? '100%' : 14,
              backgroundColor: spec.accentHex,
            }}
          />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const BadActorsLookbook: React.FC = () => (
  <Composition
    id="BadActorsLookbook"
    component={BadActorsLookbookScene}
    durationInFrames={BAD_ACTORS_APPEARANCES.length * SLOT_FRAMES}
    fps={30}
    width={1920}
    height={1080}
  />
);
