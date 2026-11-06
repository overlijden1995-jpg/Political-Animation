import * as React from 'react';
import { Composition, interpolate, useCurrentFrame } from 'remotion';
import { secondsToFrames, useActiveScene, Scene } from '../lib/timeline';
import { Scene as SceneComp } from '../components/Scene';
import { Panel } from '../components/Panel';
import { Character } from '../components/Character';
import { Captions } from '../components/Captions';
import { SpeechBubble } from '../components/SpeechBubble';
import { LowerThird } from '../components/LowerThird';
import { MapUSA } from '../components/MapUSA';
import { ChartBar } from '../components/ChartBar';
import { Transition } from '../components/Transition';
import { PALETTE } from '../theme/colors';
import type { SceneVisuals } from '../agents/types';
import exampleScript from '../data/exampleScript.json';

const FPS = 30;
const DEFAULT_DURATION_SECONDS = 600; // 10 minutes

export interface LongFormProps {
  durationInFrames?: number;
  scenes?: Scene[];
}

const captionWords = (scene: Scene) => {
  const words = (scene.narration ?? '').split(/\s+/).filter(Boolean);
  const duration = scene.end - scene.start;
  const perWord = duration / Math.max(words.length, 1);
  return words.map((text, i) => ({
    text,
    start: scene.start + i * perWord,
    end: scene.start + (i + 1) * perWord,
  }));
};

const W = 1920;
const H = 1080;

const LongFormScene = (props: LongFormProps) => {
  const scenes = (props.scenes ?? exampleScript.pipelines.longform.scenes) as Scene[];
  const frame = useCurrentFrame();
  const { active, progress, time } = useActiveScene(scenes);
  const words = captionWords(active);

  const boundary = 0.5;
  const inFade = time < active.start + boundary ? (time - active.start) / boundary : 1;
  const outFade = time > active.end - boundary ? (active.end - time) / boundary : 1;
  const opacity = Math.min(inFade, outFade);

  const charProps: {
    emotion?: NonNullable<SceneVisuals['character']>['emotion'];
    direction?: 'left' | 'right';
  } = active.visuals?.character ?? {};
  const mapRegion = active.visuals?.mapRegion ?? null;
  const chart = active.visuals?.chart ?? null;
  const speech = active.visuals?.speech ?? null;
  const lowerThird = active.visuals?.lowerThird ?? null;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, opacity }}>
      <SceneComp background={active.background} grain vignette>

        {/* Top bar: show title chip */}
        <Panel
          x={40}
          y={34}
          width={520}
          height={64}
          rotation={-1}
          borderColor={PALETTE.inkSoft}
          fill={PALETTE.white}
          shadow
        >
          <div
            style={{
              fontFamily: '"Comic Neue", system-ui, sans-serif',
              fontSize: 26,
              fontWeight: 900,
              color: PALETTE.ink,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            {active.label}
          </div>
        </Panel>

        {/* Left column: illustration */}
        {mapRegion && (
          <Panel x={40} y={130} width={720} height={560} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
            <MapUSA x={40} y={160} width={640} height={360} highlighted={mapRegion} labels />
          </Panel>
        )}
        {chart && (
          <Panel x={40} y={130} width={720} height={560} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
            <ChartBar
              data={chart.data}
              maxValue={chart.maxValue}
              width={640}
              height={480}
              x={40}
              y={40}
              animateFrom={active.start * FPS}
              animateTo={(active.start + 1.5) * FPS}
              showValues
            />
          </Panel>
        )}
        {!mapRegion && !chart && (
          <Panel x={40} y={130} width={720} height={560} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
            <Character
              x={40 + 360 - 130}
              y={130 + 280 - 180}
              scale={1.4}
              emotion={charProps.emotion}
              direction="right"
              frame={frame}
            />
          </Panel>
        )}

        {/* Right column: narration excerpt */}
        <div
          style={{
            position: 'absolute',
            left: 820,
            top: 160,
            width: 1040,
            fontFamily: '"Patrick Hand", "Comic Neue", system-ui, sans-serif',
            fontSize: 34,
            color: PALETTE.ink,
            lineHeight: 1.55,
            opacity: Math.min(Math.max(progress, 0.55), 1),
          }}
        >
          {active.narration ?? ''}
        </div>

        {/* Speech bubble (placed near character area, right side) */}
        {speech && (
          <SpeechBubble
            x={820 + 520}
            y={400}
            text={speech}
            targetX={820 + 300}
            targetY={520}
            width={420}
            shake={4}
          />
        )}

        {/* Lower third */}
        {lowerThird && (
          <LowerThird
            name={lowerThird.name}
            role={lowerThird.role}
            x={820}
            y={H - 160}
            width={1040}
            accent={PALETTE.accent}
            appear={opacity}
          />
        )}

        {/* Captions at bottom */}
        <Captions captions={words} time={time} window={3} fontSize={44} y={260} align="center" />

        {/* Scene entry transition */}
        <Transition
          type="panel"
          progress={Math.max(0, Math.min(1, (time - active.start) / 0.6))}
          width={W}
          height={H}
        />
      </SceneComp>
    </div>
  );
};

export const LongFormPlayer = (props: LongFormProps) => (
  <Composition
    id="LongFormPlayer"
    component={() => <LongFormScene {...props} />}
    durationInFrames={props.durationInFrames ?? secondsToFrames(DEFAULT_DURATION_SECONDS, FPS)}
    fps={FPS}
    width={W}
    height={H}
  />
);
