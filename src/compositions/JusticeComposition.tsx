import * as React from 'react';
import { Composition, useCurrentFrame, interpolate, spring } from 'remotion';
import { secondsToFrames, useActiveScene, Scene } from '../lib/timeline';
import { Scene as SceneComp } from '../components/Scene';
import { Panel } from '../components/Panel';
import { Character } from '../components/Character';
import { Captions } from '../components/Captions';
import { SpeechBubble } from '../components/SpeechBubble';
import { LowerThird } from '../components/LowerThird';
import { ChartBar } from '../components/ChartBar';
import { Transition } from '../components/Transition';
import { PALETTE, FONT } from '../theme/colors';
import { ScalesOfJustice } from '../components/JusticeVisuals';
import { CancerMetaphor } from '../components/JusticeVisuals';
import { IceCreamMachine } from '../components/JusticeVisuals';
import { LegacyContrast } from '../components/JusticeVisuals';
import { ShieldOfPower } from '../components/JusticeVisuals';

const FPS = 30;
const W = 1920;
const H = 1080;
const DURATION_SECONDS = 345; // ~5.75 minutes

interface CaptionWord { text: string; start: number; end: number; }

const sceneCaptions = (narration: string, start: number, end: number): CaptionWord[] => {
  const words = narration.split(/\s+/).filter(Boolean);
  const dur = end - start;
  const perWord = dur / Math.max(words.length, 1);
  return words.map((t, i) => ({ text: t, start: start + i * perWord, end: start + (i + 1) * perWord }));
};

const scenes: Scene[] = [
  {
    id: 'title',
    start: 0,
    end: 14,
    label: 'The Importance of Justice',
    background: '#FFF8E1',
    narration: 'Why Prosecuting Corruption TRUMPS Bipartisan Reform',
  },
  {
    id: 'divide',
    start: 14,
    end: 30,
    label: 'A Growing Divide',
    background: '#E3F2FD',
    narration: 'Right now, a divide is growing inside the Democratic Party between using the next two years to pass bipartisan legislation and using those years to hold Trump and his allies accountable for criminal self-enrichment and serial abuses of power.',
  },
  {
    id: 'rhymes',
    start: 30,
    end: 44,
    label: 'History Rhymes',
    background: '#FFF8E1',
    narration: 'American politics has a rhythm, and even its worst historical moments seem to rhyme in such a way that almost seems to make a grim future feel inevitable.',
  },
  {
    id: 'justiceSecondary',
    start: 44,
    end: 60,
    label: 'Justice Falls Secondary',
    background: '#E3F2FD',
    narration: 'As a matter of principle, the constant need for reunification and bipartisan reform makes justice following the collapse of a corrupt administration often fall as a secondary priority.',
  },
  {
    id: 'ruleOfLaw',
    start: 60,
    end: 74,
    label: 'Justice Must Take Priority',
    background: '#FFF8E1',
    narration: 'Justice needs to take priority, and the basic rule of law is foundational to every single other function that the government performs.',
  },
  {
    id: 'corruptionCycle',
    start: 74,
    end: 88,
    label: 'The Corruption Cycle',
    background: '#E3F2FD',
    narration: 'If criminals at the highest level of government arent punished, then the potential for abuse becomes a persistent and known vulnerability. This leads to more corruption, which leads to more voter disengagement.',
  },
  {
    id: 'trumpEra',
    start: 88,
    end: 104,
    label: 'The Trump Era',
    background: '#FFF8E1',
    narration: 'The Trump Era is defined here as an approximate decade where a morally villainous, intellectually vacant, politically outspoken reality TV star was elected by legal democratic means to the single most consequential position of institutional leadership in human history.',
  },
  {
    id: 'systemErosion',
    start: 104,
    end: 118,
    label: 'Eroding the System',
    background: '#E3F2FD',
    narration: 'Lack of respect for the system itself is not just a symptom, it is an active variable in the continuing erosion of Americas democracy and image to the world.',
  },
  {
    id: 'cancerHealthy',
    start: 118,
    end: 132,
    label: 'Corruption as Cancer',
    background: '#FFF8E1',
    narration: 'Corruption is shockingly easy to visualize as a cancer of institutions. Individual cells start misbehaving, parasitizing nutrients around them and interfering in essential bodily processes for their own growth.',
  },
  {
    id: 'cancerTumor',
    start: 132,
    end: 146,
    label: 'Tumor Forms',
    background: '#FFF8E1',
    narration: 'Eventually tumors metastasize and spread to other areas of the body, spreading until the host dies or the cancer does.',
  },
  {
    id: 'policyVsSystem',
    start: 146,
    end: 162,
    label: 'Policy vs the System',
    background: '#E3F2FD',
    narration: 'Have a policy you disagree with? Protest, get signatures, make it viral, get it on the ballot. A candidate will come along that commits to changing it. The only problem is what happens when that candidate encounters a rigid, factional system where policy is handled on a partisan quid pro quo basis.',
  },
  {
    id: 'lyingCandidate',
    start: 162,
    end: 178,
    label: 'The Lying Candidate',
    background: '#FFF8E1',
    narration: 'What happens if your candidate was lying the whole time, emboldened by a system that they know will reward, or at least fail to punish, those that violate their civic duty?',
  },
  {
    id: 'systemsRequirement',
    start: 178,
    end: 194,
    label: 'A Systems Requirement',
    background: '#E3F2FD',
    narration: 'The need for justice to take precedence over reform is not a moral imperative. It is a systems requirement.',
  },
  {
    id: 'iceCreamWorking',
    start: 194,
    end: 210,
    label: 'The Ice Cream Machine',
    background: '#FFF8E1',
    narration: "For the sake of simplicity, let's say the government's only job is to produce ice cream for all Americans to enjoy. People complain about the flavors, and eventually those changes get made.",
  },
  {
    id: 'iceCreamBroken',
    start: 210,
    end: 226,
    label: 'The Broken Machine',
    background: '#FFF8E1',
    narration: 'But if the machine itself is broken or malfunctioning, we cannot make ice cream, plain and simple. Even if we could, it would not be safe.',
  },
  {
    id: 'iceCreamFallacy',
    start: 226,
    end: 242,
    label: 'The Fallacy',
    background: '#FFF8E1',
    narration: 'Saying "we need to fix the problems instead of focusing on the perpetrators" is like saying "we need to serve our customers ice cream instead of fixing the machine." You cant serve people ice cream out of a broken ice cream machine.',
  },
  {
    id: 'ruleOfLawFundamental',
    start: 242,
    end: 258,
    label: 'More Fundamental',
    background: '#E3F2FD',
    narration: 'There is something more fundamental than culture, more fundamental than foreign policy, health and education. Something more rigid and boring, yet absolutely essential for anything that extends from it to survive: the basic rule of law.',
  },
  {
    id: 'crimesPunished',
    start: 258,
    end: 274,
    label: 'Crimes Need to be Punished',
    background: '#E3F2FD',
    narration: 'Crimes need to be punished. Criminals need to be prosecuted, especially when those criminals are the ones entrusted to uphold the law themselves.',
  },
  {
    id: 'dontSlip',
    start: 274,
    end: 290,
    label: "Don't Let Justice Slip",
    background: '#FFF8E1',
    narration: 'To those Americans that want justice for the money that was stolen from them, for the peace of mind that was shattered, and for the reputation of their America that was tarnished: dont let Justice slip.',
  },
  {
    id: 'obamaMccain',
    start: 290,
    end: 306,
    label: 'Obama and McCain',
    background: '#E3F2FD',
    narration: 'President Obama preached unity at a time when disunity was something the American people were mostly doing to themselves. He was correct. Senator John McCain gave the most graceful concession speech in American history and repeatedly defended his opponent against the mockery and fear-mongering of his own constituents.',
  },
  {
    id: 'trumpNow',
    start: 306,
    end: 322,
    label: 'The Leader Now',
    background: '#FFF8E1',
    narration: 'The leader of the Republican Party now is President Donald J. Trump. This is not a moment of political division. This is not a moment of policy dialectics. This is a moment of patriotic disgrace for a corrupt, tyrannical robber baron and his lieutenants.',
  },
  {
    id: 'trumpNotAmerica',
    start: 322,
    end: 338,
    label: '"Trump Is Not America"',
    background: '#FFF8E1',
    narration: 'This is the moment America tells the rest of the world, and most importantly itself, that Trump is not America.',
  },
  {
    id: 'callToAction',
    start: 338,
    end: 348,
    label: 'Call to Action',
    background: '#E3F2FD',
    narration: 'Speak to your local representative, Democrat or Republican. Tell them you want to see laws can still be enforced before anyone tries to make new ones.',
  },
  {
    id: 'outro',
    start: 348,
    end: DURATION_SECONDS,
    label: 'Thank You',
    background: '#F3E5F5',
    narration: 'Thank you for listening.',
  },
];

const allCaptionWords: CaptionWord[] = [];
scenes.forEach((s) => {
  allCaptionWords.push(...sceneCaptions(s.narration ?? '', s.start, s.end));
});

const getCaptionWindow = (time: number) => {
  const idx = allCaptionWords.findIndex((w) => time >= w.start && time <= w.end);
  let startIdx = idx === -1 ? Math.max(0, allCaptionWords.length - 3) : Math.max(0, idx - 1);
  startIdx = Math.min(startIdx, Math.max(0, allCaptionWords.length - 3));
  const view = allCaptionWords.slice(startIdx, startIdx + 3);
  const highlight = view.find((w) => time >= w.start && time <= w.end)?.text ?? null;
  return { view, highlight };
};

/** Narration line that fades in word-by-word with a typewriter feel. */
const NarrationLine: React.FC<{ text: string; progress: number; y: number }> = ({ text, progress, y }) => {
  const frame = useCurrentFrame();
  const words = text.split(' ');
  // How many words have been revealed based on progress (0..1)
  const revealCount = Math.floor(progress * words.length);
  const revealed = words.slice(0, revealCount).join(' ');
  const nextWord = words[revealCount] ?? '';
  // Partial reveal of current word for typewriter effect
  const charProgress = interpolate(frame, [0, FPS * 0.15], [0, 1]);
  const partial = nextWord.slice(0, Math.floor(charProgress * nextWord.length));

  return (
    <div
      style={{
        position: 'absolute',
        left: 820,
        top: y,
        width: 1040,
        fontFamily: '"Patrick Hand", "Comic Neue", system-ui, sans-serif',
        fontSize: 30,
        color: PALETTE.ink,
        lineHeight: 1.6,
        opacity: Math.min(Math.max(progress, 0.3), 1),
        transform: `translateY(${idleFloat(frame, 0.06, 1.2)}px)`,
      }}
    >
      {revealed}
      {revealCount < words.length && <span style={{ color: PALETTE.accent, fontWeight: 800 }}>{partial}</span>}
    </div>
  );
};

const idleFloat = (frame: number, speed = 0.06, amount = 1.2) => Math.sin(frame * speed) * amount;

const JusticeScene = () => {
  const frame = useCurrentFrame();
  const time = frame / FPS;
  const { active, progress } = useActiveScene(scenes);
  const { view, highlight } = getCaptionWindow(time);

  // Scene entrance: fade + slide up over first 0.6s
  const enterProgress = interpolate(frame, [active.start * FPS, (active.start + 0.6) * FPS], [0, 1]);
  const enterY = interpolate(enterProgress, [0, 1], [30, 0]);
  const enterOpacity = interpolate(enterProgress, [0, 1], [0, 1]);

  // Staggered element entrances
  const chipEnter = interpolate(frame, [(active.start + 0.05) * FPS, (active.start + 0.45) * FPS], [0, 1]);
  const visualEnter = interpolate(frame, [(active.start + 0.15) * FPS, (active.start + 0.75) * FPS], [0, 1]);
  const textEnter = interpolate(frame, [(active.start + 0.25) * FPS, (active.start + 1.0) * FPS], [0, 1]);

  const renderVisual = () => {
    const visualStyle = {
      position: 'absolute' as const,
      left: 40,
      top: 140 + (1 - visualEnter) * 25,
      width: 720,
      height: 520,
      opacity: visualEnter,
      transform: `translateY(${idleFloat(frame, 0.05, 1)}px)`,
    } as React.CSSProperties;

    switch (active.id) {
      case 'divide':
        return (
          <div style={visualStyle}>
            <Panel x={0} y={0} width={720} height={520} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
              <ScalesOfJustice x={160} y={100} width={400} height={340} tilt="balanced" />
            </Panel>
          </div>
        );
      case 'justiceSecondary':
        return (
          <div style={visualStyle}>
            <Panel x={0} y={0} width={720} height={520} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
              <ShieldOfPower x={160} y={80} width={400} height={340} state="intact" />
            </Panel>
          </div>
        );
      case 'cancerHealthy':
        return (
          <div style={visualStyle}>
            <Panel x={0} y={0} width={720} height={520} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
              <CancerMetaphor x={160} y={80} width={400} height={340} stage="healthy" />
            </Panel>
          </div>
        );
      case 'cancerTumor':
        return (
          <div style={visualStyle}>
            <Panel x={0} y={0} width={720} height={520} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
              <CancerMetaphor x={160} y={80} width={400} height={340} stage="tumor" />
            </Panel>
          </div>
        );
      case 'iceCreamWorking':
        return (
          <div style={visualStyle}>
            <Panel x={0} y={0} width={720} height={520} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
              <IceCreamMachine x={160} y={80} width={400} height={340} state="working" />
            </Panel>
          </div>
        );
      case 'iceCreamBroken':
        return (
          <div style={visualStyle}>
            <Panel x={0} y={0} width={720} height={520} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
              <IceCreamMachine x={160} y={80} width={400} height={340} state="broken" />
            </Panel>
          </div>
        );
      case 'iceCreamFallacy':
        return (
          <div style={visualStyle}>
            <Panel x={0} y={0} width={720} height={520} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
              <IceCreamMachine x={160} y={80} width={400} height={340} state="broken" />
            </Panel>
          </div>
        );
      case 'obamaMccain':
        return (
          <div style={visualStyle}>
            <Panel x={0} y={0} width={720} height={520} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
              <LegacyContrast x={160} y={80} width={400} height={340} />
            </Panel>
          </div>
        );
      case 'trumpNow':
      case 'trumpNotAmerica':
        return (
          <div style={visualStyle}>
            <Panel x={0} y={0} width={720} height={520} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
              <ShieldOfPower x={160} y={80} width={400} height={340} state="broken" />
            </Panel>
          </div>
        );
      default:
        return (
          <div style={visualStyle}>
            <Panel x={0} y={0} width={720} height={520} borderColor={PALETTE.inkSoft} fill={PALETTE.white} shadow>
              <Character x={360 - 130} y={260 - 180} scale={1.3} emotion="neutral" direction="right" frame={frame} />
            </Panel>
          </div>
        );
    }
  };

  const showLowerThird =
    active.id === 'title' ||
    active.id === 'ruleOfLaw' ||
    active.id === 'systemsRequirement' ||
    active.id === 'dontSlip' ||
    active.id === 'crimesPunished';

  const lowerThirdY = interpolate(
    frame,
    [(active.start + 0.4) * FPS, (active.start + 1.0) * FPS],
    [H - 120, H - 160]
  );
  const lowerThirdOpacity = interpolate(frame, [(active.start + 0.4) * FPS, (active.start + 1.0) * FPS], [0, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: W,
        height: H,
        opacity: enterOpacity,
        transform: `translateY(${enterY}px)`,
      }}
    >
      <SceneComp background={active.background} grain vignette>

        {/* Top title chip: slides in from left */}
        <div
          style={{
            position: 'absolute',
            left: 40 - (1 - chipEnter) * 120,
            top: 34,
            opacity: chipEnter,
          }}
        >
          <Panel
            x={0}
            y={0}
            width={600}
            height={64}
            rotation={interpolate(chipEnter, [0, 1], [-3, -1])}
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
        </div>

        {/* Left column: animated visual */}
        {renderVisual()}

        {/* Right column: narration text with word-by-word typewriter */}
        <NarrationLine text={active.narration ?? ''} progress={textEnter} y={160} />

        {/* Lower third: slides up */}
        {showLowerThird && (
          <LowerThird
            name={active.label}
            role="The Importance of Justice"
            x={820}
            y={lowerThirdY}
            width={1040}
            accent={PALETTE.accent}
            appear={lowerThirdOpacity}
          />
        )}

        {/* Captions: word-by-word highlight */}
        <Captions captions={view} time={time} window={3} fontSize={44} y={120} align="center" highlightWord={highlight} />

        {/* Scene transition: page-turn panel */}
        <Transition
          type="panel"
          progress={Math.max(0, Math.min(1, (active.start + 0.7 - time) / 0.7))}
          width={W}
          height={H}
        />

      </SceneComp>
    </div>
  );
};

export const JusticeComposition = () => (
  <Composition
    id="JusticeComposition"
    component={JusticeScene}
    durationInFrames={secondsToFrames(DURATION_SECONDS, FPS)}
    fps={FPS}
    width={W}
    height={H}
  />
);
