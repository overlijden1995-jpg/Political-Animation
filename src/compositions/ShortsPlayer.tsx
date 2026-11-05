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
import { PALETTE, FONT } from '../theme/colors';
import type { SceneVisuals } from '../agents/types';
import exampleScript from '../data/exampleScript.json';

const FPS = 30;
const DEFAULT_DURATION_SECONDS = 60;

export interface ShortsProps {
  durationInFrames?: number;
  scenes?: Scene[];
}

/**
 * Distribute a scene's narration into word-level captions spanning the scene.
 */
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

const W = 1080;
const H = 1920;

const ShortsScene = (props: ShortsProps) => {
  const scenes = (props.scenes ?? exampleScript.pipelines.shorts.scenes) as Scene[];
  const frame = useCurrentFrame();
  const { active, progress, time } = useActiveScene(scenes);
  const words = captionWords(active);

  // Gentle crossfade at scene boundaries
  const boundary = 0.35; // seconds
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

  const charX = W / 2;
  const charY = H - 520;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, opacity }}>
      <SceneComp background={active.background} grain vignette>

        {/* Top: title chip */}
        <Panel
          x={40}
          y={90}
          width={W - 80}
          height={78}
          rotation={-1.5}
          borderColor={PALETTE.inkSoft}
          fill={PALETTE.white}
          shadow
        >
          <div
            style={{
              fontFamily: '"Comic Neue", system-ui, sans-serif',
              fontSize: 24,
              fontWeight: 900,
              color: PALETTE.ink,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            {active.label}
          </div>
        </Panel>

        {/* Center: illustration depending on scene */}
        {mapRegion && (
          <MapUSA
            x={W / 2 - 360}
            y={430}
            width={720}
            height={420}
            regionColors={{
              west: '#C9D6EA',
              mountain: '#E3F2FD',
              midwest: '#FFF8E1',
              south: '#FCE9E9',
              northeast: '#F3E5F5',
              texas: '#FCE9E9',
              florida: '#FCE9E9',
            }}
            highlighted={mapRegion as string}
            labels
          />
        )}
        {chart && (
          <Panel
            x={W / 2 - 320}
            y={420}
            width={640}
            height={430}
            rotation={2}
            borderColor={PALETTE.inkSoft}
            fill={PALETTE.white}
            shadow
          >
            <ChartBar
              data={chart.data}
              maxValue={chart.maxValue}
              width={560}
              height={340}
              x={40}
              y={40}
              animateFrom={active.start * FPS}
              animateTo={(active.start + 1.2) * FPS}
              showValues
            />
          </Panel>
        )}
        {!mapRegion && !chart && (
          <Character
            x={charX - 130}
            y={charY}
            scale={1.15}
            emotion={charProps.emotion}
            direction="right"
            frame={frame}
          />
        )}

        {/* Speech bubble */}
        {speech && (
          <SpeechBubble
            x={charX}
            y={charY - 260}
            text={speech}
            targetX={charX - 40}
            targetY={charY - 120}
            width={340}
            shake={active.id === 'hook' ? 6 : 0}
          />
        )}

        {/* Lower third */}
        {lowerThird && (
          <LowerThird
            name={lowerThird.name}
            role={lowerThird.role}
            x={60}
            y={H - 340}
            width={W - 120}
            accent={PALETTE.accent}
            appear={opacity}
          />
        )}

        {/* Narration text (producer view) */}
        {active.narration && (
          <div
            style={{
              position: 'absolute',
              left: 60,
              top: 260,
              width: W - 120,
              fontFamily: FONT.body,
              fontSize: 22,
              color: PALETTE.textMuted,
              lineHeight: 1.5,
              pointerEvents: 'none',
            }}
          >
            {active.narration}
          </div>
        )}

        {/* Captions */}
        <Captions captions={words} time={time} window={2} fontSize={52} y={220} align="center" />

        {/* Page-turn transition into the scene */}
        <Transition
          type="panel"
          progress={Math.max(0, Math.min(1, (active.start + 0.5 - time) / 0.5))}
          width={W}
          height={H}
        />
      </SceneComp>
    </div>
  );
};

export const ShortsPlayer = (props: ShortsProps) => (
  <Composition
    id="ShortsPlayer"
    component={() => <ShortsScene {...props} />}
    durationInFrames={props.durationInFrames ?? secondsToFrames(DEFAULT_DURATION_SECONDS, FPS)}
    fps={FPS}
    width={W}
    height={H}
  />
);
