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
import { handRect, handLine } from '../theme/brush';
import { PALETTE, FONT } from '../theme/colors';
import type { SceneVisuals } from '../agents/types';

const FPS = 30;
const W = 1920;
const H = 1080;
const DEFAULT_DURATION_SECONDS = 100;

/** Deterministic pseudo-noise so drawn lines don't shimmer frame to frame. */
const crackX = (seed: number, i: number, base: number) => base + Math.sin(seed * 137.5 + i * 12.9898) * 40;
const crackY = (seed: number, i: number, base: number) => base + Math.cos(seed * 89.1 + i * 78.233) * 40;

/** Default example script (2026 midterms demographic piece). Used when no props are passed. */
const DEFAULT_SCENES: Scene[] = [
  {
    id: 'hook',
    start: 0,
    end: 11,
    label: 'The 2026 Midterms',
    background: '#FFF8E1',
    narration: 'In the 2026 midterms, Democrats delivered a historic repudiation of Donald Trump and the GOP.',
  },
  {
    id: 'results',
    start: 11,
    end: 22,
    label: 'The Results',
    background: '#E3F2FD',
    narration: 'The party won at least 54 Senate seats and is projected to take 261 House seats—surpassing the Obama-era high-water mark of 257.',
    visuals: {
      chart: {
        data: [
          { label: 'Dems Senate', value: 54, color: '#36B37E' },
          { label: 'Dems House', value: 261, color: '#0F62FE' },
          { label: 'Obama High', value: 257, color: '#C9D6EA' },
        ],
        maxValue: 300,
      },
      lowerThird: { name: '2026 Midterm Elections', role: 'Democrats win Senate & House' },
    },
  },
  {
    id: 'hispanic',
    start: 22,
    end: 36,
    label: 'Hispanic Voters',
    background: '#FFF8E1',
    narration: 'Hispanic voters moved away from the GOP, with Republican support dropping from 44 percent in 2024 to about 30 percent.',
    visuals: {
      mapRegion: 'south',
      lowerThird: { name: 'Hispanic Voters', role: 'GOP support 44% (2024) → ~30% (2026)' },
    },
  },
  {
    id: 'gender',
    start: 36,
    end: 48,
    label: 'Men vs. Women',
    background: '#E3F2FD',
    narration: 'Men shifted toward Democrats even more than women—an 18-point swing among men versus 13 points among women.',
    visuals: {
      character: { emotion: 'neutral' },
      lowerThird: { name: 'Gender Gap', role: 'Men swung 18 pts, women 13 pts toward Dems' },
    },
  },
  {
    id: 'young',
    start: 48,
    end: 60,
    label: 'Young Voters',
    background: '#FFF8E1',
    narration: 'Young voters returned to the Democratic fold, with Republicans winning just 21 to 28 percent of voters under 30.',
    visuals: {
      chart: {
        data: [
          { label: 'GOP Under-30 (2024)', value: 44, color: '#C93756' },
          { label: 'GOP Under-30 (2026)', value: 28, color: '#0F62FE' },
        ],
        maxValue: 100,
      },
    },
  },
  {
    id: 'black',
    start: 60,
    end: 72,
    label: 'Black Voters',
    background: '#E3F2FD',
    narration: "Black voter support for Democrats rebounded to roughly 90 percent, reversing Trump's 2024 inroads.",
    visuals: {
      character: { emotion: 'neutral' },
      lowerThird: { name: 'Black Voters', role: '~90% Democratic — 81-point margin (SSRS)' },
    },
  },
  {
    id: 'whiteNonCollege',
    start: 72,
    end: 86,
    label: 'Non-College Whites',
    background: '#FFF8E1',
    narration: "White voters without a college degree—Trump's core base—remained solidly Republican, though they swung 14 points toward Democrats since 2024.",
    visuals: {
      character: { emotion: 'worried' },
      lowerThird: { name: 'White Non-College Voters', role: 'Still GOP, but +14 pts to Dems since 2024' },
    },
  },
  {
    id: 'outro',
    start: 86,
    end: DEFAULT_DURATION_SECONDS,
    label: 'Not a Realignment',
    background: '#F3E5F5',
    narration: 'The 2026 results suggest the Republican coalition of 2024 was not a permanent realignment. Voter preferences remain fluid.',
    visuals: {
      character: { emotion: 'happy' },
      lowerThird: { name: 'Political Animation', role: 'Voter preferences remain fluid' },
    },
  },
];

interface ArticleProps {
  scenes?: Scene[];
}

const captionWords = (scenes: Scene[], time: number): { view: Array<{ text: string; start: number; end: number }>; highlight: string | null } => {
  const all: Array<{ text: string; start: number; end: number }> = [];
  scenes.forEach((s) => {
    const words = (s.narration ?? '').split(/\s+/).filter(Boolean);
    const dur = s.end - s.start;
    const perWord = dur / Math.max(words.length, 1);
    words.forEach((t, i) => all.push({ text: t, start: s.start + i * perWord, end: s.start + (i + 1) * perWord }));
  });
  const idx = all.findIndex((w) => time >= w.start && time <= w.end);
  let startIdx = idx === -1 ? Math.max(0, all.length - 3) : Math.max(0, idx - 1);
  startIdx = Math.min(startIdx, Math.max(0, all.length - 3));
  const view = all.slice(startIdx, startIdx + 3);
  const highlight = view.find((w) => time >= w.start && time <= w.end)?.text ?? null;
  return { view, highlight };
};

const ArticleScene = (props: ArticleProps) => {
  const frame = useCurrentFrame();
  const time = frame / FPS;
  const scenes = (props.scenes ?? DEFAULT_SCENES) as Scene[];
  const { active, progress } = useActiveScene(scenes);
  const { view, highlight } = captionWords(scenes, time);

  const visuals: SceneVisuals = active.visuals ?? {};
  const charProps = {
    emotion: visuals.character?.emotion ?? 'neutral',
    direction: visuals.character?.direction ?? 'right',
  } as { emotion: 'neutral' | 'happy' | 'worried' | 'sad' | 'angry' | 'shocked'; direction: 'left' | 'right' };

  // Render per-scene visual based on visuals kind
  const renderVisual = () => {
    if (visuals.chart) {
      return (
        <Panel x={40} y={130} width={720} height={560} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
          <div style={{ position: 'absolute', top: 20, left: 40, width: 640 }}>
            <ChartBar
              data={visuals.chart.data}
              maxValue={visuals.chart.maxValue}
              width={640}
              height={340}
              x={0}
              y={20}
              animateFrom={active.start * FPS}
              animateTo={(active.start + 1.2) * FPS}
              showValues
            />
          </div>
          {active.narration && (
            <div style={{ position: 'absolute', left: 40, top: 390, width: 640, fontFamily: FONT.body, fontSize: 18, color: PALETTE.textMuted, lineHeight: 1.4 }}>
              {active.narration.slice(0, 200)}
            </div>
          )}
        </Panel>
      );
    }
    if (visuals.mapRegion) {
      return (
        <Panel x={40} y={130} width={720} height={560} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
          <MapUSA x={40} y={160} width={640} height={360} highlighted={visuals.mapRegion} labels />
          {active.narration && (
            <div style={{ position: 'absolute', left: 40, top: 540, width: 640, fontFamily: FONT.body, fontSize: 18, color: PALETTE.textMuted, lineHeight: 1.4 }}>
              {active.narration.slice(0, 200)}
            </div>
          )}
        </Panel>
      );
    }
    // Metaphorical SVG for gender / comparison scenes
    if (active.id === 'gender') {
      return (
        <Panel x={40} y={130} width={720} height={560} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
          <svg width={640} height={420} style={{ position: 'absolute', top: 60, left: 40, overflow: 'visible' }}>
            <rect x={305} y={200} width={30} height={10} fill={PALETTE.ink} />
            <path d={handLine(40, 200, 600, 200, { roughness: 1, seed: 201 })} stroke={PALETTE.ink} strokeWidth="4" fill="none" />
            <circle cx={110} cy={260} r={34} fill="#E4EEFF" stroke={PALETTE.ink} strokeWidth="3" />
            <text x={110} y={270} fontFamily="system-ui" fontSize={16} fontWeight={700} fill={PALETTE.ink} textAnchor="middle">Men</text>
            <text x={110} y={290} fontFamily="system-ui" fontSize={18} fontWeight={800} fill="#0F62FE" textAnchor="middle">+18 pts</text>
            <circle cx={530} cy={260} r={34} fill="#F5E6E8" stroke={PALETTE.ink} strokeWidth="3" />
            <text x={530} y={270} fontFamily="system-ui" fontSize={16} fontWeight={700} fill={PALETTE.ink} textAnchor="middle">Women</text>
            <text x={530} y={290} fontFamily="system-ui" fontSize={18} fontWeight={800} fill="#C93756" textAnchor="middle">+13 pts</text>
            <path d={handRect(90, 230, 70, 60, { roughness: 1, seed: 202 })} fill="#E4EEFF" stroke={PALETTE.ink} strokeWidth="2" />
            <path d={handRect(500, 210, 70, 60, { roughness: 1, seed: 203 })} fill="#F5E6E8" stroke={PALETTE.ink} strokeWidth="2" />
          </svg>
        </Panel>
      );
    }
    if (active.id === 'black') {
      return (
        <Panel x={40} y={130} width={720} height={560} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
          <svg width={640} height={420} style={{ position: 'absolute', top: 60, left: 40, overflow: 'visible' }}>
            <rect x={270} y={280} width={100} height={120} fill="#0F62FE" stroke={PALETTE.ink} strokeWidth="3" />
            <path d={handRect(265, 275, 110, 130, { roughness: 1, seed: 301 })} fill="none" stroke={PALETTE.ink} strokeWidth="3" />
            <text x={320} y={230} fontFamily="system-ui" fontSize={20} fontWeight={800} fill={PALETTE.ink} textAnchor="middle">~90%</text>
            <text x={320} y={255} fontFamily="system-ui" fontSize={14} fill={PALETTE.textMuted} textAnchor="middle">Democratic support</text>
            <path d={handLine(270, 200, 370, 200, { roughness: 0.8, seed: 302 })} stroke="#C9D6EA" strokeWidth="4" fill="none" strokeDasharray="6 6" />
            <text x={320} y={190} fontFamily="system-ui" fontSize={12} fill="#8A8274" textAnchor="middle">2024: 87%</text>
          </svg>
          <div style={{ position: 'absolute', left: 40, top: 540, width: 640, fontFamily: FONT.body, fontSize: 18, color: PALETTE.textMuted, lineHeight: 1.4 }}>
            90 to 9 — an 81-point Democratic margin (SSRS poll)
          </div>
        </Panel>
      );
    }
    if (active.id === 'whiteNonCollege') {
      return (
        <Panel x={40} y={130} width={720} height={560} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
          <svg width={640} height={420} style={{ position: 'absolute', top: 60, left: 40, overflow: 'visible' }}>
            <path d={handRect(40, 180, 560, 160, { roughness: 1.5, seed: 401 })} fill="#E3F2FD" stroke={PALETTE.ink} strokeWidth="4" />
            {Array.from({ length: 6 }).map((_, i) => (
              <path
                key={i}
                d={handLine(80 + i * 80, crackX(402, i, 180), 140 + i * 80, crackY(402, i, 300), { roughness: 2, seed: 402 + i })}
                stroke="#8A8274"
                strokeWidth="3"
                fill="none"
              />
            ))}
            <text x={320} y={260} fontFamily="system-ui" fontSize={20} fontWeight={800} fill="#0F62FE" textAnchor="middle">GOP holds</text>
            <text x={320} y={290} fontFamily="system-ui" fontSize={14} fill={PALETTE.textMuted} textAnchor="middle">white non-college voters</text>
            <text x={320} y={340} fontFamily="system-ui" fontSize={16} fontWeight={800} fill="#36B37E" textAnchor="middle">Swing: +14 pts to Dems</text>
          </svg>
        </Panel>
      );
    }
    // Default: character
    return (
      <Panel x={40} y={130} width={720} height={560} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
        <Character x={40 + 360 - 130} y={130 + 280 - 180} scale={1.4} emotion={charProps.emotion} direction={charProps.direction} frame={frame} />
      </Panel>
    );
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H }}>
      <SceneComp background={active.background} grain vignette>

        {/* Top title chip */}
        <Panel x={40} y={34} width={520} height={64} rotation={-1} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
          <div style={{ fontFamily: '"Comic Neue", system-ui, sans-serif', fontSize: 26, fontWeight: 900, color: PALETTE.ink, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            {active.label}
          </div>
        </Panel>

        {/* Left column: grounded illustration */}
        {renderVisual()}

        {/* Right column: narration */}
        <div style={{ position: 'absolute', left: 820, top: 160, width: 1040, fontFamily: '"Patrick Hand", "Comic Neue", system-ui, sans-serif', fontSize: 34, color: PALETTE.ink, lineHeight: 1.55, opacity: Math.min(Math.max(progress, 0.55), 1) }}>
          {active.narration}
        </div>

        {/* Lower third */}
        {visuals.lowerThird && (
          <LowerThird name={visuals.lowerThird.name} role={visuals.lowerThird.role} x={820} y={H - 160} width={1040} accent={PALETTE.accent} appear={1} />
        )}

        {/* Speech bubble */}
        {visuals.speech && (
          <SpeechBubble x={820 + 520} y={400} text={visuals.speech} targetX={820 + 300} targetY={520} width={420} shake={4} />
        )}

        {/* Captions */}
        <Captions captions={view} time={time} window={3} fontSize={44} y={120} align="center" highlightWord={highlight} />

        {/* Scene transition */}
        <Transition type="panel" progress={Math.max(0, Math.min(1, (active.start + 0.6 - time) / 0.6))} width={W} height={H} />

      </SceneComp>
    </div>
  );
};

export const Article2026Midterms = (props: ArticleProps) => (
  <Composition
    id="Article2026Midterms"
    component={() => <ArticleScene {...props} />}
    durationInFrames={secondsToFrames(DEFAULT_DURATION_SECONDS, FPS)}
    fps={FPS}
    width={W}
    height={H}
  />
);
