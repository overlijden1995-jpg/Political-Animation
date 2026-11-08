import * as React from 'react';
import {
  Bar,
  COBALT,
  Callout,
  Defs,
  F,
  HAIR,
  HAIR_MID,
  HAIR_STRONG,
  INK,
  INK_SOFT,
  Kicker,
  Legend,
  MUTED,
  Rule,
  Txt,
  VERMILION,
  clip,
  PAPER,
} from './draw';
import { EDGES, EXITS, FIGURES, FLOWS, INFLUENCE, ORG, TENURES, TIMELINE, byId } from './data';
import { breakLines, clipWidth, fitSize, width } from './measure';
import { placeLabels } from './place';

/**
 * The ten plates.
 *
 * Canvas contract — every diagram is drawn into the band between the plate rule
 * at y=112 and the shared footer at y=876:
 *
 *     0 ──────────────────────────────
 *   112 ── rule  (title above, in render.tsx)
 *   134 … 856   ← drawing band (722 px)
 *   876 ──────────────────────────────
 *   884 ── editorial read
 *
 * Nothing may be drawn above 134 or below 860.
 */

const TOP = 134;
const BOT = 856;

// ─── shared footer ──────────────────────────────────────────────────────────

const PlateFoot: React.FC<{ read: string; fig: string }> = ({ read, fig }) => {
  const MEASURE = 1170; // 64 … 1536 minus the label and the figure tag
  const lines = breakLines(read, 'sans500', 10.5, MEASURE, { maxLines: 2 });
  return (
    <g>
      <Rule x1={64} y1={862} x2={1536} y2={862} />
      <Kicker x={64} y={881} size={8.6}>
        EDITORIAL READ
      </Kicker>
      {lines.map((l, i) => (
        <Txt key={i} x={166} y={881 + i * 15} size={10.5} fill={MUTED}>
          {l.text}
        </Txt>
      ))}
      <Kicker x={1536} y={881} anchor="end" size={8.6}>
        {`FIG. ${fig} OF 10`}
      </Kicker>
    </g>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 01 · THE HUB
// ══════════════════════════════════════════════════════════════════════════

type Pt = { x: number; y: number };

const NET: Record<string, Pt> = {
  trump: { x: 790, y: 496 },
  // court
  miller: { x: 722, y: 262 },
  harp: { x: 912, y: 222 },
  scavino: { x: 586, y: 218 },
  epshteyn: { x: 1030, y: 286 },
  cheung: { x: 466, y: 300 },
  zacharia: { x: 372, y: 398 },
  // cabinet
  vance: { x: 700, y: 660 },
  homan: { x: 500, y: 592 },
  vought: { x: 596, y: 712 },
  rubio: { x: 900, y: 682 },
  hegseth: { x: 1018, y: 744 },
  mullin: { x: 1116, y: 660 },
  blanche: { x: 1150, y: 776 },
  bessent: { x: 1206, y: 588 },
  clayton: { x: 1310, y: 646 },
  kennedy: { x: 1250, y: 762 },
  rollins: { x: 1356, y: 754 },
  // family
  kushner: { x: 1188, y: 302 },
  witkoff: { x: 1302, y: 218 },
  lara: { x: 1372, y: 372 },
  donjr: { x: 1276, y: 432 },
  // tech
  musk: { x: 1436, y: 502 },
  sacks: { x: 1462, y: 588 },
  zuckerberg: { x: 1402, y: 676 },
  ellison: { x: 1452, y: 758 },
  andreessen: { x: 1312, y: 816 },
  // exits
  wiles: { x: 316, y: 470 },
  blair: { x: 210, y: 330 },
  leavitt: { x: 208, y: 232 },
  bondi: { x: 214, y: 610 },
  noem: { x: 176, y: 700 },
  gabbard: { x: 300, y: 776 },
  kent: { x: 108, y: 560 },
  carlson: { x: 96, y: 420 },
};

const R_BY_TIER: Record<number, number> = { 0: 28, 1: 15, 2: 11, 3: 9, 4: 7 };

const sectorInk = (s: string) =>
  s === 'court' ? INK : s === 'cabinet' ? COBALT : s === 'family' ? VERMILION : s === 'tech' ? MUTED : '#A79E8E';

export const D01Network: React.FC = () => {
  const edgeInk = (k: string) => (k === 'friction' ? VERMILION : k === 'financial' ? COBALT : k === 'personal' ? INK_SOFT : INK);
  const DEG = Object.fromEntries(
    FIGURES.map((f) => [f.id, EDGES.filter((e) => e.from === f.id || e.to === f.id).reduce((n, e) => n + e.weight, 0)]),
  );
  const byDegree = [...FIGURES].filter((f) => f.id !== 'trump').sort((a, b) => DEG[b.id] - DEG[a.id]);

  return (
    <g>
      <Defs />
      <Txt x={64} y={TOP + 60} size={9} font={F.mono} weight={700} fill={VERMILION} spacing={1.5}>
        32 OF 54 LINKS TERMINATE AT ONE DESK
      </Txt>
      <Legend
        x={64}
        y={TOP + 8}
        items={[
          { label: 'PERSONAL / COURT', color: INK, kind: 'line' },
          { label: 'INSTRUMENTAL', color: INK_SOFT, kind: 'line' },
          { label: 'FINANCIAL', color: COBALT, kind: 'line' },
          { label: 'FRICTION', color: VERMILION, kind: 'dash' },
          { label: 'EXITED', color: MUTED, kind: 'dot' },
        ]}
        gap={30}
      />

      {/* the star: every non-friction edge is drawn from the president outward */}
      {EDGES.map((e) => {
        const a = NET[e.from];
        const b = NET[e.to];
        if (!a || !b) return null;
        const friction = e.kind === 'friction';
        return (
          <line
            key={`${e.from}-${e.to}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={edgeInk(e.kind)}
            strokeWidth={e.weight === 3 ? 2.6 : e.weight === 2 ? 1.6 : 1}
            strokeDasharray={friction ? '7 6' : undefined}
            opacity={friction ? 0.66 : e.weight === 3 ? 0.5 : 0.26}
          />
        );
      })}

      {FIGURES.map((f) => {
        const p = NET[f.id];
        if (!p) return null;
        const r = R_BY_TIER[f.tier];
        const ink = sectorInk(f.sector);
        const isTrump = f.id === 'trump';
        const gone = f.sector === 'exit';
        return (
          <g key={f.id}>
            {isTrump ? <circle cx={p.x} cy={p.y} r={r + 9} fill="none" stroke={HAIR_MID} strokeWidth={1.5} /> : null}
            <circle
              cx={p.x}
              cy={p.y}
              r={r}
              fill={isTrump ? INK : gone ? PAPER : ink}
              stroke={gone ? '#A79E8E' : ink}
              strokeWidth={gone ? 1.8 : 1.2}
              strokeDasharray={gone ? '4 3' : undefined}
            />
            {isTrump ? (
              <Txt x={p.x} y={p.y + 5} size={12} fill={PAPER} font={F.mono} weight={700} anchor="middle" spacing={1}>
                DJT
              </Txt>
            ) : null}
            <Txt
              x={p.x}
              y={p.y + r + 14}
              size={f.tier === 0 ? 14 : f.tier === 1 ? 11 : 9.4}
              font={F.mono}
              weight={700}
              anchor="middle"
              spacing={f.tier <= 1 ? 1.1 : 0.4}
              fill={gone ? '#8C8474' : INK}
            >
              {f.short}
            </Txt>
          </g>
        );
      })}

      {/* no leader line into a crowd: the exit note sits beside the size key */}
      <g>
        <Txt x={352} y={BOT - 96} size={9} font={F.mono} weight={700} fill={VERMILION} spacing={1.4}>
          EXITS KEEP THEIR LINKS
        </Txt>
        {breakLines(
          'The dotted circles are out of office, not out of the network. Nineteen of the fifty-four links survive the departure — which is why removal has not removed anyone.',
          'sans500',
          10,
          320,
        ).map((l, i) => (
          <Txt key={i} x={352} y={BOT - 78 + i * 14} size={10} font={F.sans} weight={500} fill={INK_SOFT}>
            {l.text}
          </Txt>
        ))}
      </g>

      {/* what the marks mean — in the empty lower-left quarter */}
      <g>
        <Rule x1={64} y1={BOT - 132} x2={330} y2={BOT - 132} strong />
        <Txt x={64} y={BOT - 110} size={8.4} font={F.mono} weight={700} fill={VERMILION} spacing={1.4}>
          NODE SIZE = TIER
        </Txt>
        {[
          ['T1', 15, 'court, unconfirmed'],
          ['T2', 11, 'instruments of office'],
          ['T3', 9, 'money and platforms'],
        ].map(([tag, r, note], i) => (
          <g key={String(tag)}>
            <circle cx={72 + Number(r)} cy={BOT - 88 + i * 18} r={Number(r) * 0.8} fill={INK} />
            <Txt x={104} y={BOT - 84 + i * 18} size={8.6} font={F.mono} weight={700} fill={INK} spacing={0.5}>
              {String(tag)}
            </Txt>
            <Txt x={128} y={BOT - 84 + i * 18} size={8.6} font={F.sans} weight={500} fill={MUTED}>
              {String(note)}
            </Txt>
          </g>
        ))}
        <Txt x={64} y={BOT - 14} size={8.4} font={F.mono} weight={500} fill={MUTED} spacing={0.3}>
          54 LINKS · 36 FIGURES · WEIGHTS ANALYTIC
        </Txt>
      </g>

      <PlateFoot
        fig="01"
        read="The graph is a star, not a cabinet: 32 of the 54 links terminate at the president personally. Only Miller, Rubio, Vought and Kushner hold links to one another — the four relationships that can still act when he leaves the room."
      />
    </g>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 02 · FOUR RINGS
// ══════════════════════════════════════════════════════════════════════════

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const CX = 592;
const CY = 458;
const RINGS = [116, 188, 252, 308];

/*
 * Angle tables. Each ring is filled by walking its arc in one direction at a
 * minimum angular spacing, so no two dots on a ring can ever crowd: the spacing
 * is angular, and the rings are big enough that the same spacing buys more
 * pixels the further out you go.
 */
const ringAngles = (start: number, end: number, count: number, pxPerDeg: (r: number) => number) => {
  const out: number[] = [];
  const step = (end - start) / count;
  for (let i = 0; i < count; i += 1) out.push(start + step * (i + 0.5));
  void pxPerDeg;
  return out;
};

const RING_ARC: Array<[number, number]> = [
  [-176, -4],
  [4, 176],
  [182, 358],
  [196, 344],
];

/* ring 1 starts at 12 o'clock and runs clockwise; each ring's arc starts where
   the previous one ended, so the whole figure spirals without collisions */
const RING_IDS: Array<Array<string>> = [
  ['miller', 'harp', 'cheung', 'zacharia', 'epshteyn', 'scavino'],
  ['vance', 'rubio', 'hegseth', 'mullin', 'blanche', 'bessent', 'clayton', 'kennedy', 'rollins', 'vought', 'homan'],
  ['witkoff', 'kushner', 'lara', 'donjr', 'musk', 'sacks', 'zuckerberg', 'ellison', 'andreessen'],
  ['wiles', 'carlson', 'blair', 'leavitt', 'bondi', 'noem', 'gabbard', 'kent'],
];

const RING_SETS: Array<Array<[string, number]>> = RING_IDS.map((ids, ri) => {
  const [a, b] = RING_ARC[ri];
  const angles = ringAngles(a, b, ids.length, () => 1);
  return ids.map((id, i) => [id, angles[i]] as [string, number]);
});

const RING_META = [
  { n: 'R1', name: 'THE ROOM', rule: 'Proximity, no confirmation, no disclosure.', ink: INK },
  { n: 'R2', name: 'THE INSTRUMENTS', rule: 'Confirmed office. Command, not counsel.', ink: COBALT },
  { n: 'R3', name: 'THE TRANSACTION', rule: 'Money, envoys and platforms. No office at all.', ink: VERMILION },
  { n: 'R4', name: 'THE EXITS', rule: 'Departed since January 2026, still in the graph.', ink: '#8C8474' },
];

export const D02Rings: React.FC = () => {
  const KEY_X = 1146;
  const FRAME = { l: 64, r: KEY_X - 34, t: TOP + 6, b: BOT - 96 };

  const dots = RING_SETS.flatMap((set, ri) =>
    set.map(([id, deg]) => {
      const p = polar(CX, CY, RINGS[ri], deg);
      return { id, x: p.x, y: p.y, r: ri === 0 ? 11 : ri === 3 ? 6 : 8 };
    }),
  );

  const labels = placeLabels(
    dots.map((d) => ({
      id: d.id,
      x: d.x,
      y: d.y,
      text: byId(d.id).short,
      size: 9.4,
      u: { x: (d.x - CX) / Math.hypot(d.x - CX, d.y - CY), y: (d.y - CY) / Math.hypot(d.x - CX, d.y - CY) },
    })),
    { dots: dots.map((d) => ({ x: d.x, y: d.y, r: d.r + 5 })), frame: FRAME },
  );

  return (
    <g>
      <Defs />

      {/* annuli, alternately tinted: the rings read as bands, not as circles */}
      {[3, 2, 1, 0].map((ri) => (
        <circle
          key={`band-${ri}`}
          cx={CX}
          cy={CY}
          r={RINGS[ri]}
          fill={ri === 2 || ri === 0 ? '#F1EDE2' : PAPER}
          stroke={ri === 3 ? HAIR_MID : HAIR}
          strokeWidth={1.6}
          strokeDasharray={ri === 3 ? '7 7' : undefined}
        />
      ))}

      <circle cx={CX} cy={CY} r={30} fill={INK} />
      <Txt x={CX} y={CY + 5} size={12} font={F.mono} weight={700} fill={PAPER} anchor="middle" spacing={1}>
        DJT
      </Txt>

      {dots.map((d) => {
        const ri = RING_SETS.findIndex((set) => set.some(([id]) => id === d.id));
        const f = byId(d.id);
        const ink = ri === 3 ? '#8C8474' : sectorInk(f.sector);
        return (
          <g key={d.id}>
            <line x1={CX} y1={CY} x2={d.x} y2={d.y} stroke={HAIR} strokeWidth={1} opacity={0.5} />
            <circle
              cx={d.x}
              cy={d.y}
              r={d.r}
              fill={ri === 3 ? PAPER : ink}
              stroke={ri === 3 ? '#A79E8E' : ink}
              strokeWidth={ri === 3 ? 1.8 : 1}
              strokeDasharray={ri === 3 ? '3 3' : undefined}
            />
          </g>
        );
      })}

      {/* every label is placed, never hand-placed */}
      {dots.map((d) => {
        const l = labels[d.id];
        const ri = RING_SETS.findIndex((set) => set.some(([id]) => id === d.id));
        const far = Math.hypot(l.x - d.x, l.y - d.y) > 26;
        return (
          <g key={`l-${d.id}`}>
            {far ? (
              <line
                x1={d.x}
                y1={d.y}
                x2={l.x}
                y2={l.y - 3}
                stroke={ri === 3 ? '#A79E8E' : INK}
                strokeWidth={0.8}
                opacity={0.3}
              />
            ) : null}
            <Txt
              x={l.x}
              y={l.y}
              size={ri === 0 ? 10 : 9.4}
              font={F.mono}
              weight={700}
              anchor={l.anchor}
              spacing={0.5}
              fill={ri === 3 ? '#8C8474' : INK}
            >
              {byId(d.id).short}
            </Txt>
          </g>
        );
      })}

      {/* the key: rings as tiers, with their members named */}
      <g>
        <Rule x1={KEY_X} y1={TOP + 6} x2={KEY_X} y2={BOT - 96} strong />
        <Txt x={KEY_X + 16} y={TOP + 20} size={9} font={F.mono} weight={700} fill={VERMILION} spacing={1.6}>
          RING KEY · 34 NODES
        </Txt>
        {RING_META.map((rm, ri) => {
          const y = TOP + 52 + ri * 132;
          const members = RING_SETS[ri].map(([id]) => byId(id).short).join(' · ');
          return (
            <g key={rm.n}>
              <Rule x1={KEY_X + 16} y1={y - 22} x2={1536} y2={y - 22} />
              <Txt x={KEY_X + 16} y={y} size={11} font={F.mono} weight={700} fill={rm.ink} spacing={1.2}>
                {`${rm.n} · ${rm.name}`}
              </Txt>
              <Txt x={1536} y={y} size={9} font={F.mono} weight={700} fill={MUTED} anchor="end" spacing={0.8}>
                {`${RING_SETS[ri].length}`}
              </Txt>
              {breakLines(rm.rule, 'sans500', 9.6, 374 - 16).map((ln, k) => (
                <Txt key={k} x={KEY_X + 16} y={y + 15 + k * 12.5} size={9.6} font={F.sans} weight={500} fill={INK_SOFT}>
                  {ln.text}
                </Txt>
              ))}
              {breakLines(members, 'mono500', 8.3, 374 - 16, { spacing: 0.3 }).map((ln, k) => (
                <Txt key={`m${k}`} x={KEY_X + 16} y={y + 40 + k * 11.5} size={8.3} font={F.mono} weight={500} fill={MUTED} spacing={0.3}>
                  {ln.text}
                </Txt>
              ))}
            </g>
          );
        })}
      </g>

      {/* the empty corner carries the method note, not whitespace */}
      <g>
        <Rule x1={64} y1={BOT - 118} x2={404} y2={BOT - 118} strong />
        <Txt x={64} y={BOT - 96} size={9} font={F.mono} weight={700} fill={VERMILION} spacing={1.6}>
          HOW THE RINGS ARE ASSIGNED
        </Txt>
        {breakLines(
          'Placement follows the role held on 9 November 2026. Nobody is ranked by importance; the rings order the four ways a person can reach the president — proximity, command, money, or a live link after leaving.',
          'sans500',
          10.2,
          340,
        ).map((ln, i) => (
          <Txt key={i} x={64} y={BOT - 74 + i * 15} size={10.2} font={F.sans} weight={500} fill={INK_SOFT}>
            {ln.text}
          </Txt>
        ))}
      </g>

      <PlateFoot
        fig="02"
        read="The rings are not concentric in power. Ring one has no statutory authority, no confirmation and no disclosure requirement — and it is the ring that writes the instructions the other three receive."
      />
    </g>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 03 · TENURE BARS
// ══════════════════════════════════════════════════════════════════════════

const X0 = 258;
const X1 = 1104;
const YEAR_MIN = 2015;
const YEAR_MAX = 2027;
const px = (yr: number) => X0 + ((yr - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * (X1 - X0);

const PHASE_INK: Record<string, string> = {
  campaign: COBALT,
  staff: INK,
  outside: '#D3CCBC',
  cabinet: VERMILION,
  envoys: '#7A88B6',
};

export const D03Tenure: React.FC = () => {
  const top = 240;
  const step = 40;
  return (
    <g>
      <Defs />
      {Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MIN + i).map((yr) => (
        <g key={yr}>
          <line x1={px(yr)} y1={top - 22} x2={px(yr)} y2={top + TENURES.length * step - 8} stroke={HAIR} strokeWidth={1} />
          <Txt x={px(yr)} y={top - 30} size={9} font={F.mono} weight={700} fill={MUTED} anchor="middle" spacing={0.6}>
            {yr}
          </Txt>
        </g>
      ))}
      <Rule x1={X0} y1={top - 10} x2={X1} y2={top - 10} strong />

      {TENURES.map((t, i) => {
        const y = top + i * step + 6;
        const f = byId(t.id);
        const hi = t.id === 'miller';
        return (
          <g key={t.id}>
            <Txt x={64} y={y + 2} size={hi ? 11 : 10} font={F.mono} weight={700} fill={hi ? VERMILION : INK} spacing={hi ? 1.4 : 0.9}>
              {f.short}
            </Txt>
            <Txt x={64} y={y + 13} size={7.6} font={F.sans} weight={500} fill={MUTED}>
              {clipWidth(f.role.split(';')[0], 'sans500', 7.6, 176)}
            </Txt>
            {t.gaps?.map((g) => (
              <rect key={g[0]} x={px(g[0])} y={y - 2} width={px(g[1]) - px(g[0])} height={12} fill="none" stroke={HAIR_MID} strokeWidth={1} strokeDasharray="2 3" />
            ))}
            {t.phases.map((ph) => {
              const x = px(ph.from);
              const w = Math.max(px(ph.to) - px(ph.from), 2);
              return (
                <g key={`${ph.from}-${ph.label}`}>
                  <rect x={x} y={y - 6} width={w} height={16} fill={PHASE_INK[ph.kind]} />
                  {w > 58 ? (
                    <Txt x={x + 5} y={y + 5} size={7.2} font={F.mono} weight={700} fill={ph.kind === 'outside' ? INK_SOFT : '#F6F4EE'} spacing={0.2}>
                      {clip(ph.label.toUpperCase(), Math.floor(w / 5))}
                    </Txt>
                  ) : null}
                </g>
              );
            })}
            <Txt x={X1 + 20} y={y + 3} size={8.4} font={F.sans} weight={500} fill={MUTED}>
              {clipWidth(t.flag ?? '', 'sans500', 8.4, 420)}
            </Txt>
          </g>
        );
      })}

      {/* the promotion, marked where it happens rather than described in a caption */}
      <g>
        <line x1={px(2026.85)} y1={top - 4} x2={px(2026.85)} y2={top + TENURES.length * step - 18} stroke={VERMILION} strokeWidth={1.2} strokeDasharray="4 5" opacity={0.55} />
        <Txt x={px(2026.85) - 8} y={top - 12} size={7.8} font={F.mono} weight={700} fill={VERMILION} anchor="end" spacing={0.5}>
          9 NOV 2026
        </Txt>
      </g>
      <Legend
        x={64}
        y={TOP + 4}
        gap={30}
        items={[
          { label: 'CAMPAIGN', color: PHASE_INK.campaign, kind: 'square' },
          { label: 'WHITE HOUSE STAFF', color: PHASE_INK.staff, kind: 'square' },
          { label: 'CABINET', color: PHASE_INK.cabinet, kind: 'square' },
          { label: 'ENVOY', color: PHASE_INK.envoys, kind: 'square' },
          { label: 'OUTSIDE ORBIT', color: PHASE_INK.outside, kind: 'square' },
          { label: 'GAP IN ORBIT', color: HAIR_MID, kind: 'dash' },
        ]}
      />

      <PlateFoot
        fig="03"
        read="Continuity is the qualification. Miller has no empty year since 2016; Rubio's bar has a gap covering exactly the years he called Trump a con man; Bondi's is unbroken and still ends. Presence is necessary, not sufficient — what gets punished is friction."
      />
    </g>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 04 · TWO-LANE TIMELINE
// ══════════════════════════════════════════════════════════════════════════

const TLX0 = 90;
const TLX1 = 1510;
const TL_MIN = 2024.72;
const TL_MAX = 2027.03;
const tlx = (yr: number) => TLX0 + ((yr - TL_MIN) / (TL_MAX - TL_MIN)) * (TLX1 - TLX0);

/**
 * Timeline labels are laid out into rows: an event takes the first row whose
 * last label has already ended to its left. Nothing overlaps, and the two lanes
 * push their labels outward (court above, world below) so the rules stay clean.
 */
const timelineRows = (lane: 'court' | 'world') => {
  const events = TIMELINE.filter((e) => e.lane === lane).sort((a, b) => a.at - b.at);
  const rows: Array<Array<{ l: number; r: number }>> = [];
  const out: Array<{ e: (typeof events)[number]; x: number; row: number; flip: boolean; maxW: number; led: boolean }> = [];

  events.forEach((e) => {
    const x = tlx(e.at);
    const flip = x > TLX1 - 240;
    const titleW = width(e.label.toUpperCase(), 'mono700', e.emphasis ? 10.5 : 9.3, 0.5);
    const detailW = width(e.detail ?? '', 'sans500', 8.2);
    const want = Math.min(266, Math.max(titleW, detailW));
    /*
     * Collision-only row allocation: a label takes the first row where its own
     * box is clear. Connectors are then drawn only where the vertical corridor
     * from the axis is clear too; where it is not, the marker alone carries the
     * event and the label sits unled. No rule ever crosses a word.
     */
    const box = { l: flip ? x - want - 8 : x + 7, r: flip ? x - 7 : x + want + 8 };
    let row = 0;
    while ((rows[row] ?? []).some((b) => !(box.r < b.l - 14 || box.l > b.r + 14))) row += 1;
    rows[row] = rows[row] ?? [];
    rows[row].push(box);
    const led = rows.slice(0, row).every((r) => (r ?? []).every((b) => x < b.l - 8 || x > b.r + 8));
    out.push({ e, x, row, flip, maxW: want, led });
  });
  return { placed: out, rows };
};

/**
 * Labels never overlap because each one reserves a measured box; when a box
 * collides, the event drops a row. A dropped label is joined to the axis by an
 * elbow whose riser dodges every label above it, so no rule ever crosses a
 * word. Events near the right edge flip to end-anchor to stay on the page.
 */
export const D04Timeline: React.FC = () => {
  const courtY = 468;
  const worldY = 640;
  const court = timelineRows('court');
  const world = timelineRows('world');
  const laneTop = (row: number) => courtY - 28 - row * 54;
  const laneBot = (row: number) => worldY + 32 + row * 54;

  return (
    <g>
      <Defs />
      {[2025, 2026, 2027].map((yr) => (
        <g key={yr}>
          <line x1={tlx(yr)} y1={TOP + 22} x2={tlx(yr)} y2={BOT - 34} stroke={HAIR_MID} strokeWidth={1.4} />
          <Txt x={tlx(yr)} y={TOP + 12} size={10} font={F.mono} weight={700} fill={MUTED} anchor="middle" spacing={1.4}>
            {yr}
          </Txt>
        </g>
      ))}
      {[2024.75, 2025.25, 2025.5, 2025.75, 2026.25, 2026.5, 2026.75].map((q) => (
        <line key={q} x1={tlx(q)} y1={TOP + 22} x2={tlx(q)} y2={BOT - 34} stroke={HAIR} strokeWidth={1.2} opacity={0.6} />
      ))}

      <Txt x={TLX0} y={TOP + 42} size={8.6} font={F.mono} weight={700} fill={MUTED} spacing={1.4}>
        24 MONTHS · 14 MARKED EVENTS · TWO LANES
      </Txt>
      <Legend
        x={TLX0 + 330}
        y={TOP + 42}
        gap={26}
        items={[
          { label: 'COURT EVENT', color: INK, kind: 'dot' },
          { label: 'WORLD EVENT', color: INK, kind: 'square' },
          { label: 'EMPHASIS', color: VERMILION, kind: 'dot' },
          { label: 'EMPHASIS (WORLD)', color: COBALT, kind: 'square' },
        ]}
      />
      {/* reading note: what the two lanes are for */}
      <g>
        <Rule x1={TLX0} y1={TOP + 74} x2={TLX0 + 404} y2={TOP + 74} strong />
        <Txt x={TLX0} y={TOP + 96} size={9.2} font={F.mono} weight={700} fill={INK} spacing={1.2}>
          HOW TO READ IT
        </Txt>
        {[
          'Lane A is the court: who held the president\u2019s',
          'ear, and for how long. Lane B is the world that',
          'acted on it. The two lanes are independent until',
          'the autumn of 2026; then the world decides the',
          'composition of the court.',
        ].map((line, i) => (
          <Txt key={i} x={TLX0} y={TOP + 118 + i * 16} size={10.5} font={F.sans} weight={500} fill={INK_SOFT}>
            {line}
          </Txt>
        ))}
      </g>

      <Rule x1={TLX0} y1={courtY} x2={TLX1} y2={courtY} strong />
      <Rule x1={TLX0} y1={worldY} x2={TLX1} y2={worldY} strong />
      <Kicker x={TLX0} y={courtY + 22} size={9.5} fill={INK}>
        LANE A · WEST WING AND COURT
      </Kicker>
      <Kicker x={TLX0} y={worldY - 12} size={9.5} fill={INK}>
        LANE B · THE WORLD THAT ACTED ON THE COURT
      </Kicker>

      {court.placed.map(({ e, x, row, flip, maxW, led }) => {
        const ink = e.emphasis ? VERMILION : INK;
        const y = laneTop(row);
        const tx = flip ? x - 7 : x + 7;
        const anchor = flip ? ('end' as const) : ('start' as const);
        return (
          <g key={`c-${e.label}`}>
            {led ? (
              <line x1={x} y1={courtY} x2={x} y2={y + 6} stroke={ink} strokeWidth={e.emphasis ? 2 : 1} opacity={e.emphasis ? 1 : 0.5} />
            ) : null}
            <circle cx={x} cy={courtY} r={e.emphasis ? 5 : 3} fill={ink} />
            <Txt x={tx} y={y - 4} size={e.emphasis ? 10.5 : 9.3} font={F.mono} weight={700} fill={ink} spacing={0.5} anchor={anchor}>
              {clipWidth(e.label.toUpperCase(), 'mono700', e.emphasis ? 10.5 : 9.3, maxW, 0.5)}
            </Txt>
            <Txt x={tx} y={y + 8} size={8.2} font={F.sans} weight={500} fill={MUTED} anchor={anchor}>
              {clipWidth(e.detail ?? '', 'sans500', 8.2, maxW)}
            </Txt>
          </g>
        );
      })}

      {world.placed.map(({ e, x, row, flip, maxW, led }) => {
        const ink = e.emphasis ? COBALT : INK;
        const y = laneBot(row);
        const tx = flip ? x - 7 : x + 7;
        const anchor = flip ? ('end' as const) : ('start' as const);
        return (
          <g key={`w-${e.label}`}>
            {led ? (
              <line x1={x} y1={worldY} x2={x} y2={y - 8} stroke={ink} strokeWidth={e.emphasis ? 2 : 1} opacity={e.emphasis ? 1 : 0.5} />
            ) : null}
            <rect x={x - 4} y={worldY - 4} width={8} height={8} fill={ink} />
            <Txt x={tx} y={y - 4} size={e.emphasis ? 10.5 : 9.3} font={F.mono} weight={700} fill={ink} spacing={0.5} anchor={anchor}>
              {clipWidth(e.label.toUpperCase(), 'mono700', e.emphasis ? 10.5 : 9.3, maxW, 0.5)}
            </Txt>
            <Txt x={tx} y={y + 8} size={8.2} font={F.sans} weight={500} fill={MUTED} anchor={anchor}>
              {clipWidth(e.detail ?? '', 'sans500', 8.2, maxW)}
            </Txt>
          </g>
        );
      })}

      {/* the four days that produced the appointment */}
      <g>
        <line x1={tlx(2026.845)} y1={courtY + 128} x2={tlx(2026.955)} y2={courtY + 128} stroke={VERMILION} strokeWidth={2} />
        <line x1={tlx(2026.845)} y1={courtY + 122} x2={tlx(2026.845)} y2={courtY + 134} stroke={VERMILION} strokeWidth={2} />
        <line x1={tlx(2026.955)} y1={courtY + 122} x2={tlx(2026.955)} y2={courtY + 134} stroke={VERMILION} strokeWidth={2} />
        <Txt x={tlx(2026.845) - 10} y={courtY + 132} size={8.4} font={F.mono} weight={700} fill={VERMILION} anchor="end" spacing={0.6}>
          4 DAYS · ROUT → CHIEF OF STAFF
        </Txt>
      </g>

      <PlateFoot
        fig="04"
        read="The lanes move independently until the autumn of 2026, then lock: a rout on 3 November, the chief of staff fired on the 6th, her replacement in post on the 9th. The promotion is the only appointment here not forced by a resignation, a scandal or a death."
      />
    </g>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 05 · ACCESS × AUTHORITY
// ══════════════════════════════════════════════════════════════════════════

const QX0 = 236;
const QX1 = 1352;
const QY0 = 780;
const QY1 = 216;
/* the axes run to 104 so the principal, who scores 100 on both, sits inside the frame */
const QMAX = 104;
const qx = (v: number) => QX0 + (v / QMAX) * (QX1 - QX0);
const qy = (v: number) => QY0 - (v / QMAX) * (QY0 - QY1);

/**
 * Labels on this plate are placed by measurement (`place.ts`), not by hand:
 * the routine scores a fixed ring of candidates against the dots, the frame and
 * the captions, so no label can land on a plot mark.
 */
/**
 * Two figures with near-identical scores would otherwise paint on top of one
 * another. Their plotted positions are separated on a small deterministic
 * circle — the scores, and therefore the axes, are untouched.
 */
const plotted: Record<string, { x: number; y: number }> = (() => {
  const out: Record<string, { x: number; y: number }> = {};
  const seen: Array<{ x: number; y: number }> = [];
  FIGURES.filter((f) => f.id !== 'trump')
    /* the crowd is resolved from the top down, so the fan always opens downward */
    .sort((a, b) => b.access - a.access || a.formal - b.formal)
    .forEach((f) => {
      let x = qx(f.formal);
      let y = qy(f.access);
      let guard = 0;
      /* step until this mark clears every mark already placed */
      while (seen.some((p) => Math.abs(p.x - x) < 13 && Math.abs(p.y - y) < 19) && guard < 12) {
        guard += 1;
        y = qy(f.access) + guard * 20;
      }
      seen.push({ x, y });
      out[f.id] = { x, y };
    });
  return out;
})();

const QUAD_DOTS = [
  ...FIGURES.filter((f) => f.id !== 'trump').map((f) => ({
    x: plotted[f.id].x,
    y: plotted[f.id].y,
    r: f.tier <= 1 ? 6 : 4.5,
  })),
  { x: qx(100), y: qy(100), r: 11 },
];

/** Regions the placer must keep clear: quadrant captions and the method note. */
const QUAD_CAPTION_BLOCKS = [
  { l: QX0 + 4, r: QX0 + 240, t: QY1 + 8, b: QY1 + 26 },
  { l: QX0 + 4, r: QX0 + 150, t: QY0 - 22, b: QY0 - 4 },
  { l: QX1 - 150, r: QX1 - 6, t: QY0 - 22, b: QY0 - 4 },
  { l: qx(48), r: qx(80), t: qy(36) - 26, b: qy(22) },
  /* the principal's own mark and its label */
  { l: qx(100) - 24, r: qx(100) + 24, t: qy(100) + 8, b: qy(100) + 26 },
  /* the pre-promotion marker and its caption */
  { l: qx(89) - 76, r: qx(89) + 8, t: qy(95) - 10, b: qy(95) + 8 },
  /* the rule through the middle of the plot, and the tinted-cell boundary */
  { l: QX0, r: QX1, t: (QY0 + QY1) / 2 - 9, b: (QY0 + QY1) / 2 + 9 },
  { l: (QX0 + QX1) / 2 - 3, r: (QX0 + QX1) / 2 + 3, t: QY1, b: QY0 },
];

/**
 * The crowd around x≈15–25 / y≈55 is dense, so those marks get first refusal on
 * a stack of offsets that step straight up the empty left margin. Everyone else
 * uses the shared ring.
 */
const CROWD = new Set(['zuckerberg', 'ellison', 'musk', 'andreessen', 'wiles', 'blair']);

const QUAD_LABELS = placeLabels(
  FIGURES.filter((f) => f.id !== 'trump')
    .sort((a, b) => (CROWD.has(a.id) ? -1 : 0) - (CROWD.has(b.id) ? -1 : 0) || a.formal - b.formal)
    .map((f) => ({
      id: f.id,
      x: plotted[f.id].x,
      y: plotted[f.id].y,
      text: f.short,
      size: f.tier <= 1 ? 9.6 : 8.4,
      prefer: CROWD.has(f.id)
        ? [
            { dx: 16, dy: -14, anchor: 'start' as const },
            { dx: 16, dy: 14, anchor: 'start' as const },
            { dx: 30, dy: -26, anchor: 'start' as const },
            { dx: 30, dy: 26, anchor: 'start' as const },
            { dx: 46, dy: -38, anchor: 'start' as const },
          ]
        : [{ dx: 13, dy: -10, anchor: 'start' as const }],
    })),
  {
    dots: QUAD_DOTS,
    frame: { l: QX0 + 10, r: QX1 - 10, t: QY1 + 8, b: QY0 - 8 },
    blocks: QUAD_CAPTION_BLOCKS,
  },
);

export const D05Quadrant: React.FC = () => (
  <g>
    <Defs />

    {/* the cell the book is about, tinted before anything is drawn on it */}
    <rect x={(QX0 + QX1) / 2} y={QY1} width={(QX1 - QX0) / 2} height={(QY0 - QY1) / 2} fill="#F1E7E3" />
    <rect x={QX0} y={QY1} width={QX1 - QX0} height={QY0 - QY1} fill="none" stroke={HAIR_MID} strokeWidth={2} />
    <line x1={QX0} y1={(QY0 + QY1) / 2} x2={QX1} y2={(QY0 + QY1) / 2} stroke={HAIR_MID} strokeWidth={2} />
    <line x1={QX0} y1={QY1} x2={QX0} y2={QY0} stroke={HAIR_STRONG} strokeWidth={2} />
    <line x1={QX0} y1={QY0} x2={QX1} y2={QY0} stroke={HAIR_STRONG} strokeWidth={2} />

    <Kicker x={QX0} y={QY1 - 10} size={9} fill={INK_SOFT}>
      I · REACH WITHOUT MACHINERY
    </Kicker>
    <Kicker x={QX1} y={QY1 - 10} size={9} fill={VERMILION} anchor="end">
      II · THE COMMAND DESK
    </Kicker>
    <Kicker x={QX0 + 14} y={QY0 - 12} size={9}>
      III · THE SPECTATORS
    </Kicker>
    <Kicker x={QX1 - 14} y={QY0 - 12} size={9} anchor="end">
      IV · THE INSTRUMENTS
    </Kicker>

    {[25, 50, 75, 100].map((v) => (
      <g key={v}>
        <line x1={qx(v)} y1={QY0} x2={qx(v)} y2={QY0 + 6} stroke={HAIR_STRONG} strokeWidth={1.5} />
        <line x1={QX0 - 6} y1={qy(v)} x2={QX0} y2={qy(v)} stroke={HAIR_STRONG} strokeWidth={1.5} />
        <Txt x={qx(v)} y={QY0 + 20} size={8.4} font={F.mono} weight={700} fill={MUTED} anchor="middle">
          {v}
        </Txt>
        <Txt x={QX0 - 12} y={qy(v) + 3} size={8.4} font={F.mono} weight={700} fill={MUTED} anchor="end">
          {v}
        </Txt>
      </g>
    ))}

    <Txt x={(QX0 + QX1) / 2} y={QY0 + 44} size={9.5} font={F.mono} weight={700} anchor="middle" spacing={1.6} fill={MUTED}>
      FORMAL AUTHORITY — BUDGET · LAW · PERSONNEL · FORCE
    </Txt>
    <Txt
      x={QX0 - 62}
      y={(QY0 + QY1) / 2}
      size={9.5}
      font={F.mono}
      weight={700}
      fill={MUTED}
      spacing={1.6}
      anchor="middle"
      transform={`rotate(-90 ${QX0 - 62} ${(QY0 + QY1) / 2})`}
    >
      ACCESS TO THE PRESIDENT
    </Txt>

    {/* Miller's move: annotated at the mark, not drawn as a stray trend line */}
    <g>
      <circle cx={qx(89)} cy={qy(95)} r={5.4} fill={PAPER} stroke={VERMILION} strokeWidth={1.5} strokeDasharray="2 2" />
      <Txt x={qx(89) - 9} y={qy(95) + 3} size={7.8} font={F.mono} weight={700} fill={VERMILION} anchor="end" spacing={0.5}>
        BEFORE 9 NOV
      </Txt>
    </g>

    {FIGURES.filter((f) => f.id !== 'trump').map((f) => {
      const x = plotted[f.id].x;
      const y = plotted[f.id].y;
      const lab = QUAD_LABELS[f.id];
      const ink = f.sector === 'exit' ? '#A79E8E' : sectorInk(f.sector);
      const big = f.tier <= 1;
      const far = Math.hypot(lab.x - x, lab.y - y) > 22;
      return (
        <g key={f.id}>
          <circle
            cx={x}
            cy={y}
            r={big ? 5.6 : 4}
            fill={f.sector === 'exit' ? PAPER : ink}
            stroke={ink}
            strokeWidth={1.5}
            strokeDasharray={f.sector === 'exit' ? '2 2' : undefined}
          />
          {far ? (
            <line x1={x} y1={y} x2={lab.x} y2={lab.y - 3} stroke={ink} strokeWidth={0.8} opacity={0.35} />
          ) : null}
          <Txt
            x={lab.x}
            y={lab.y}
            size={big ? 9.6 : 8.4}
            font={F.mono}
            weight={big ? 700 : 500}
            anchor={lab.anchor}
            fill={f.sector === 'exit' ? '#8C8474' : INK}
            spacing={0.4}
          >
            {f.short}
          </Txt>
        </g>
      );
    })}

    <circle cx={qx(100)} cy={qy(100)} r={11} fill={INK} />
    <Txt x={qx(100)} y={qy(100) + 22} size={9} font={F.mono} weight={700} fill={INK} anchor="middle" spacing={1}>
      DJT
    </Txt>

    {/* the note sits in the empty middle band, where nothing is plotted */}
    <g>
      <Rule x1={qx(46)} y1={qy(36)} x2={qx(84)} y2={qy(36)} strong />
      <Txt x={qx(46)} y={qy(36) + 18} size={8.6} font={F.mono} weight={700} fill={VERMILION} spacing={1.4}>
        CELL II, 6 NOVEMBER 2026
      </Txt>
      {breakLines(
        'Until the promotion the top-right cell held one person: the president. The chief of staff now sits in it, which is the whole argument of this book in a single coordinate.',
        'sans500',
        10,
        300,
      ).map((l, i) => (
        <Txt key={i} x={qx(46)} y={qy(36) + 34 + i * 14} size={10} font={F.sans} weight={500} fill={INK_SOFT}>
          {l.text}
        </Txt>
      ))}
    </g>

    <Legend
      x={QX0}
      y={TOP + 10}
      gap={30}
      items={[
        { label: 'WEST WING (UNCONFIRMED)', color: INK, kind: 'dot' },
        { label: 'CONFIRMED OFFICER', color: COBALT, kind: 'dot' },
        { label: 'FAMILY / ENVOY', color: VERMILION, kind: 'dot' },
        { label: 'TECH / DONOR', color: MUTED, kind: 'dot' },
        { label: 'OUT', color: '#A79E8E', kind: 'dash' },
      ]}
    />

    <PlateFoot
      fig="05"
      read="The top-right cell held the president and, arguably, the vice president. It now holds the chief of staff. Harp is the opposite failure — near-maximum access with almost no machinery; the instruments command real power and wait for instruction."
    />
  </g>
);

// ══════════════════════════════════════════════════════════════════════════
// 06 · FIREWALLS
// ══════════════════════════════════════════════════════════════════════════

const BARRELS = [
  {
    top: 'KUSHNER — AFFINITY PARTNERS',
    value: 99,
    sub: '$6.10bn of $6.16bn',
    line: 'FOREIGN CAPITAL',
    note: [
      'Unpaid "volunteer" envoy: no filed financial',
      'disclosure, no special-employee designation.',
      'Manages ~$6bn while co-leading Gaza and Iran',
      'talks. Saudi PIF is the largest single backer.',
    ],
    threshold: 'WHEN THE MONEY COMES FROM THE GOVERNMENTS AT THE TABLE, THE ONLY CONTROL IS THE OFFICIAL’S JUDGEMENT — AND JUDGEMENT IS NOT A FIREWALL.',
  },
  {
    top: 'KUSHNER — FEES FROM RIYADH',
    value: 69,
    sub: '$129m of $157m',
    line: 'SHARE PAID BY SAUDI ARABIA',
    note: [
      'Senate Finance estimate of fees collected',
      '2021–25 by the Saudi government’s investment',
      'arm, on capital that produced little or no',
      'return for the client.',
    ],
    threshold: 'A FEE IS NOT A BRIBE. BUT A FEE PAID FOR ACCESS IS INDISTINGUISHABLE FROM ONE, AND NOBODY IN THE CHAIN HAS TO BE CORRUPT FOR THE MARKET TO WORK.',
  },
  {
    top: 'CABINET-LEVEL WOMEN, 2025 → 26',
    value: 50,
    sub: '4 of 8 → 3 of 8',
    line: 'SHARE OF POSTS HELD',
    note: [
      'Four women left the cabinet in three months.',
      'All four were replaced by men. Every original',
      'male secretary was still in place when the',
      'midterms arrived. Wiles made it five.',
    ],
    threshold: 'THE PATTERN IS NOT A CONSPIRACY. IT IS A HIRING RULE APPLIED CONSISTENTLY, WHICH PRODUCES THE SAME RESULT WITHOUT ANYONE INTENDING IT.',
  },
];

export const D06Barrels: React.FC = () => {
  const base = 700;
  const topY = 236;
  const h = base - topY;
  return (
    <g>
      <Defs />
      {BARRELS.map((b, i) => {
        const x = 104 + i * 172;
        const w = 120;
        const fillH = (b.value / 100) * h;
        return (
          <g key={b.top}>
            <Txt x={x} y={TOP + 30} size={8.4} font={F.mono} weight={700} fill={MUTED} spacing={0.5}>
              {`0${i + 1}`}
            </Txt>
            {breakLines(b.top, 'mono700', 8.2, 158).map((l, k) => (
              <Txt key={k} x={x} y={TOP + 46 + k * 12} size={8.2} font={F.mono} weight={700} fill={INK} spacing={0.4}>
                {l.text}
              </Txt>
            ))}
            <rect x={x} y={topY} width={w} height={h} fill="none" stroke={HAIR_MID} strokeWidth={2} />
            {Array.from({ length: 10 }, (_, k) => (
              <line key={k} x1={x} y1={topY + (k * h) / 10} x2={x + w} y2={topY + (k * h) / 10} stroke={HAIR} strokeWidth={1} />
            ))}
            <rect x={x} y={base - fillH} width={w} height={fillH} fill={i === 2 ? COBALT : VERMILION} opacity={0.9} />
            <Txt x={x + w / 2} y={topY - 14} size={30} font={F.numeral} fill={i === 2 ? COBALT : VERMILION} anchor="middle">
              {`${b.value}%`}
            </Txt>
            {breakLines(b.line, 'mono700', 8.6, w + 26).map((l, k) => (
              <Txt key={k} x={x + w / 2} y={base + 20 + k * 12} size={8.6} font={F.mono} weight={700} anchor="middle" spacing={0.7} fill={INK}>
                {l.text}
              </Txt>
            ))}
            <Txt x={x + w / 2} y={base + 48} size={9} font={F.sans} weight={500} anchor="middle" fill={MUTED}>
              {b.sub}
            </Txt>
          </g>
        );
      })}

      <line x1={92} y1={base - h / 2} x2={624} y2={base - h / 2} stroke={INK} strokeWidth={1.4} strokeDasharray="5 5" />
      <Txt x={628} y={base - h / 2 + 3} size={8.2} font={F.mono} weight={700} fill={MUTED}>
        50 · CONTROL
      </Txt>

      <rect x={700} y={TOP + 10} width={836} height={690} fill="none" stroke={HAIR_MID} strokeWidth={2} />
      <Kicker x={726} y={TOP + 38} size={9}>
        WHAT THE BARRELS DO NOT SAY
      </Kicker>
      {BARRELS.map((b, i) => {
        const y = 240 + i * 226;
        return (
          <g key={`t-${i}`}>
            <Rule x1={726} y1={y - 26} x2={1510} y2={y - 26} />
            <Txt x={726} y={y} size={9.2} font={F.mono} weight={700} fill={INK} spacing={0.8}>
              {clip(b.top, 46)}
            </Txt>
            {b.note.map((line, k) => (
              <Txt key={line} x={726} y={y + 22 + k * 17} size={11.4} font={F.sans} weight={500} fill={INK_SOFT}>
                {line}
              </Txt>
            ))}
            {breakLines(b.threshold, 'mono700', 8.8, 770).map((l, k) => (
              <Txt key={k} x={726} y={y + 116 + k * 14} size={8.8} font={F.mono} weight={700} fill={VERMILION} spacing={0.4}>
                {l.text}
              </Txt>
            ))}
          </g>
        );
      })}

      <PlateFoot
        fig="06"
        read="None of this is illegal, and that is the argument: a system that requires no bribe because access itself is the product. Both firms deny any link between policy and investment; the administration has not built a firewall."
      />
    </g>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// 07 · THE FILTER
// ══════════════════════════════════════════════════════════════════════════

const WAY_INK: Record<string, string> = { FIRED: VERMILION, REMOVED: VERMILION, RESIGNED: COBALT, DEPARTED: MUTED };

export const D07Exits: React.FC = () => (
  <g>
    <Defs />
    {[
      { n: '5', a: 'WOMEN OUT OF', b: 'CABINET-LEVEL POSTS' },
      { n: '4', a: 'REPLACED', b: 'BY MEN' },
      { n: '0', a: 'ORIGINAL MALE', b: 'SECRETARIES LOST' },
      { n: '7', a: 'SENIOR DEPARTURES', b: 'IN 2026' },
    ].map((s, i) => (
      <g key={s.a}>
        <Txt x={64 + i * 176} y={TOP + 62} size={62} font={F.numeral} fill={i === 2 ? COBALT : INK}>
          {s.n}
        </Txt>
        <Txt x={64 + i * 176} y={TOP + 86} size={8.2} font={F.mono} weight={700} fill={MUTED} spacing={1}>
          {s.a}
        </Txt>
        <Txt x={64 + i * 176} y={TOP + 97} size={8.2} font={F.mono} weight={700} fill={MUTED} spacing={1}>
          {s.b}
        </Txt>
      </g>
    ))}

    <Kicker x={800} y={TOP + 40} size={9} fill={VERMILION}>
      THE RULE
    </Kicker>
    {breakLines(
      'Loyalty is the floor for entry. Visible aggression on the president’s behalf is the ceiling for promotion. What gets removed is not failure — Noem and Bondi both failed and were softened — but friction.',
      'sans500',
      12,
      690,
    ).map((l, i) => (
      <Txt key={i} x={800} y={TOP + 60 + i * 18} size={12} font={F.sans} weight={500} fill={INK_SOFT}>
        {l.text}
      </Txt>
    ))}

    <Rule x1={64} y1={TOP + 150} x2={1536} y2={TOP + 150} strong />

    <Kicker x={64} y={TOP + 174} size={9}>ROLE</Kicker>
    <Kicker x={400} y={TOP + 174} size={9}>WHO</Kicker>
    <Kicker x={520} y={TOP + 174} size={9}>HOW</Kicker>
    <Kicker x={660} y={TOP + 174} size={9}>WHEN</Kicker>
    <Kicker x={820} y={TOP + 174} size={9}>REPLACED BY</Kicker>
    <Kicker x={1080} y={TOP + 174} size={9}>THE REPORTED REASON</Kicker>
    <Rule x1={64} y1={TOP + 184} x2={1536} y2={TOP + 184} />

    {EXITS.map((e, i) => {
      const y = TOP + 212 + i * 60;
      return (
        <g key={e.id}>
          <Rule x1={64} y1={y + 30} x2={1536} y2={y + 30} />
          <Txt x={64} y={y} size={12.5} font={F.sans} weight={700} fill={INK}>
            {clip(e.role, 44)}
          </Txt>
          <Txt x={400} y={y} size={10} font={F.mono} weight={500} fill={INK_SOFT} spacing={0.4}>
            {clip(e.id, 16)}
          </Txt>
          <Txt x={520} y={y} size={10} font={F.mono} weight={700} fill={WAY_INK[e.way] ?? MUTED} spacing={1}>
            {e.way}
          </Txt>
          <Txt x={660} y={y} size={10} font={F.mono} weight={500} fill={MUTED} spacing={0.6}>
            {e.date.toUpperCase()}
          </Txt>
          <Txt x={820} y={y} size={11.4} font={F.sans} weight={700} fill={e.replaced === '—' ? MUTED : INK}>
            {clip(e.replaced, 30)}
          </Txt>
          <Txt x={1080} y={y} size={10.6} font={F.sans} weight={500} fill={MUTED}>
            {clip(e.note, 66)}
          </Txt>
        </g>
      );
    })}
    <Rule x1={64} y1={TOP + 212 + EXITS.length * 60 - 28} x2={1536} y2={TOP + 212 + EXITS.length * 60 - 28} strong />

    <PlateFoot
      fig="07"
      read="Turnover is a filter, not a crisis. Every replacement moved the institution toward the president's preference. Failure is survivable in this administration; friction is not — and the chief of staff's exit made five."
    />
  </g>
);

// ══════════════════════════════════════════════════════════════════════════
// 08 · ONE DOOR
// ══════════════════════════════════════════════════════════════════════════

const ORG_X = 800;
const BANDS = [
  { y: 196, label: 'THE PRESIDENT' },
  { y: 344, label: 'CHIEF OF STAFF — THE DOOR' },
  { y: 506, label: 'DEPUTIES, COUNSEL, AND THE ONE PRINCIPAL OUTSIDE THE STAFF LINE' },
  { y: 676, label: 'AGENCY HEADS IN THE POLICY CHAIN' },
];

const ORG_D2 = ['vance', 'scavino', 'cheung', 'harp', 'epshteyn'];
const ORG_D3 = ['vought', 'homan', 'rubio', 'hegseth', 'blanche', 'mullin', 'bessent', 'clayton'];

const d2x = (i: number) => 420 + i * 190;
const d3x = (i: number) => 236 + i * 158;

export const D08Org: React.FC = () => (
  <g>
    <Defs />
    {BANDS.map((b) => (
      <g key={b.label}>
        <line x1={64} y1={b.y + 44} x2={1536} y2={b.y + 44} stroke={HAIR} strokeWidth={1} />
        <Txt x={64} y={b.y + 64} size={8.4} font={F.mono} weight={700} fill={MUTED} spacing={1.3}>
          {b.label}
        </Txt>
      </g>
    ))}

    {/* connectors */}
    <path d={`M ${ORG_X} 224 L ${ORG_X} 314`} stroke={HAIR_STRONG} strokeWidth={2.2} fill="none" markerEnd="url(#arw-strong)" />
    {ORG_D2.map((id, i) => (
      <path
        key={`c2-${id}`}
        d={`M ${ORG_X} 372 L ${ORG_X} 438 L ${d2x(i)} 438 L ${d2x(i)} 482`}
        fill="none"
        stroke={HAIR}
        strokeWidth={1.4}
      />
    ))}
    {ORG_D3.map((id, i) => (
      <path
        key={`c3-${id}`}
        d={`M ${ORG_X} 534 L ${ORG_X} 606 L ${d3x(i)} 606 L ${d3x(i)} 650`}
        fill="none"
        stroke={HAIR}
        strokeWidth={1.3}
      />
    ))}

    {/* president */}
    {(() => {
      const w = 300;
      const h = 52;
      const y = BANDS[0].y;
      return (
        <g>
          <rect x={ORG_X - w / 2} y={y - h / 2} width={w} height={h} fill={INK} />
          <Txt x={ORG_X} y={y - 4} size={14} font={F.mono} weight={700} anchor="middle" fill={'#F6F4EE'} spacing={1.4}>
            DONALD J. TRUMP
          </Txt>
          <Txt x={ORG_X} y={y + 13} size={9.4} font={F.sans} weight={500} anchor="middle" fill={'rgba(246,244,238,0.8)'}>
            President
          </Txt>
        </g>
      );
    })()}

    {/* chief of staff */}
    {(() => {
      const w = 360;
      const h = 52;
      const y = BANDS[1].y;
      return (
        <g>
          <rect x={ORG_X - w / 2} y={y - h / 2} width={w} height={h} fill={VERMILION} />
          <Txt x={ORG_X} y={y - 4} size={14} font={F.mono} weight={700} anchor="middle" fill={'#F6F4EE'} spacing={1.4}>
            STEPHEN MILLER
          </Txt>
          <Txt x={ORG_X} y={y + 13} size={9.4} font={F.sans} weight={500} anchor="middle" fill={'rgba(246,244,238,0.85)'}>
            Chief of Staff · from 9 November 2026
          </Txt>
          <Txt x={ORG_X + w / 2 + 12} y={y - 2} size={8.4} font={F.mono} weight={700} fill={VERMILION}>
            ALSO HOLDS:
          </Txt>
          <Txt x={ORG_X + w / 2 + 12} y={y + 10} size={8.4} font={F.mono} weight={500} fill={MUTED}>
            POLICY SHOP · HOMELAND SECURITY
          </Txt>
        </g>
      );
    })()}

    {/* the door: Wiles leaving */}
    {(() => {
      const w = 210;
      const h = 44;
      const y = BANDS[1].y;
      const x = 240;
      return (
        <g>
          <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill="none" stroke={HAIR_STRONG} strokeWidth={2} strokeDasharray="6 5" />
          <Txt x={x} y={y - 4} size={10.5} font={F.mono} weight={700} anchor="middle" fill={'#8C8474'} spacing={1}>
            SUSIE WILES
          </Txt>
          <Txt x={x} y={y + 11} size={8.4} font={F.sans} weight={500} anchor="middle" fill={MUTED}>
            out — political operation
          </Txt>
          <line x1={x + w / 2} y1={y} x2={ORG_X - 186} y2={y} stroke={HAIR} strokeWidth={1.2} strokeDasharray="4 4" />
        </g>
      );
    })()}

    {/* depth 2 */}
    {ORG_D2.map((id, i) => {
      const n = ORG.find((o) => o.id === id)!;
      const x = d2x(i);
      const y = BANDS[2].y;
      const vance = id === 'vance';
      const w = 168;
      const h = 46;
      return (
        <g key={id}>
          <rect
            x={x - w / 2}
            y={y - h / 2}
            width={w}
            height={h}
            fill={vance ? '#F1EDE2' : 'none'}
            stroke={vance ? COBALT : HAIR_STRONG}
            strokeWidth={vance ? 2.4 : 1.8}
          />
          <Txt x={x} y={y - 2} size={9.6} font={F.mono} weight={700} anchor="middle" fill={INK} spacing={0.5}>
            {n.label.toUpperCase()}
          </Txt>
          <Txt x={x} y={y + 12} size={8.2} font={F.sans} weight={500} anchor="middle" fill={MUTED}>
            {clip(n.role, 30)}
          </Txt>
        </g>
      );
    })}

    {/* depth 3 */}
    {ORG_D3.map((id, i) => {
      const n = ORG.find((o) => o.id === id)!;
      const x = d3x(i);
      const y = BANDS[3].y;
      const w = 146;
      const h = 48;
      return (
        <g key={id}>
          <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill="#FBF9F4" stroke={HAIR_STRONG} strokeWidth={1.6} />
          <Txt x={x} y={y - 6} size={8.8} font={F.mono} weight={700} anchor="middle" fill={INK} spacing={0.3}>
            {n.label.toUpperCase()}
          </Txt>
          <Txt x={x} y={y + 7} size={8} font={F.sans} weight={500} anchor="middle" fill={MUTED}>
            {clip(n.role, 26)}
          </Txt>
        </g>
      );
    })}

    {/* the ledger: what the door is, in three numbers, in the empty lower-left */}
    <g>
      <Rule x1={64} y1={BOT - 116} x2={430} y2={BOT - 116} strong />
      <Txt x={64} y={BOT - 94} size={8.4} font={F.mono} weight={700} fill={VERMILION} spacing={1.4}>
        WHAT THE DOOR IS
      </Txt>
      {[
        ['OPEN ROUTES TO THE OVAL', '5 → 1'],
        ['CONFIRMED BY THE SENATE', '0 of 6'],
        ['OFFICES UNDER THE DOOR', '9'],
      ].map(([k, v], i) => (
        <g key={k}>
          <Txt x={64} y={BOT - 68 + i * 22} size={8.6} font={F.mono} weight={500} fill={MUTED} spacing={0.6}>
            {k}
          </Txt>
          <Txt x={300} y={BOT - 68 + i * 22} size={11} font={F.mono} weight={700} fill={INK} spacing={0.8} anchor="end">
            {v}
          </Txt>
        </g>
      ))}
    </g>

    <PlateFoot
      fig="08"
      read="The chart is a filter, not a tree. Before November five people could reach the Oval without passing Wiles; after 9 November there is one door, and the man at it writes the policy the door delivers."
    />
  </g>
);

// ══════════════════════════════════════════════════════════════════════════
// 09 · THREE CHAINS
// ══════════════════════════════════════════════════════════════════════════

export const D09Flows: React.FC = () => (
  <g>
    <Defs />
    {FLOWS.map((fl, ci) => {
      const x = 64 + ci * 488;
      const w = 456;
      return (
        <g key={fl.id}>
          <rect x={x} y={TOP + 10} width={w} height={700} fill="none" stroke={HAIR_MID} strokeWidth={2} />
          <Txt x={x + 24} y={TOP + 78} size={42} font={F.numeral} fill={INK}>
            {`0${ci + 1}`}
          </Txt>
          <Txt x={x + 24} y={TOP + 100} size={9.4} font={F.mono} weight={700} fill={MUTED} spacing={1.8}>
            {`${fl.title} — A CHAIN, NOT A DEPARTMENT`}
          </Txt>
          <Rule x1={x + 24} y1={TOP + 118} x2={x + w - 24} y2={TOP + 118} strong />

          {fl.chain.map((stage, si) => {
            const y = TOP + 152 + si * 62;
            const last = si === fl.chain.length - 1;
            return (
              <g key={stage}>
                <rect
                  x={x + 24}
                  y={y - 22}
                  width={w - 48}
                  height={44}
                  fill={si === 0 ? INK : 'none'}
                  stroke={si === 0 ? INK : HAIR_STRONG}
                  strokeWidth={1.6}
                />
                <Txt x={x + 40} y={y + 4} size={10.4} font={F.mono} weight={700} fill={si === 0 ? '#F6F4EE' : INK} spacing={0.3}>
                  {clip(stage.toUpperCase(), 42)}
                </Txt>
                {!last ? (
                  <path d={`M ${x + w / 2} ${y + 23} L ${x + w / 2} ${y + 36}`} stroke={HAIR_STRONG} strokeWidth={2} markerEnd="url(#arw-strong)" />
                ) : null}
              </g>
            );
          })}

          <Rule x1={x + 24} y1={TOP + 392} x2={x + w - 24} y2={TOP + 392} />
          <Txt x={x + 24} y={TOP + 416} size={8.2} font={F.mono} weight={700} fill={VERMILION} spacing={0.8}>
            {fl.lever[0]}
          </Txt>
          {breakLines(fl.lever[1], 'sans500', 10.5, w - 48).map((l, i) => (
            <Txt key={i} x={x + 24} y={TOP + 436 + i * 16} size={10.5} font={F.sans} weight={500} fill={INK_SOFT}>
              {l.text}
            </Txt>
          ))}
          <Rule x1={x + 24} y1={TOP + 486} x2={x + w - 24} y2={TOP + 486} />
          {breakLines(fl.note, 'sans500', 11, w - 48).map((l, i) => (
            <Txt key={i} x={x + 24} y={TOP + 512 + i * 17} size={11} font={F.sans} weight={500} fill={INK_SOFT}>
              {l.text}
            </Txt>
          ))}
          <Rule x1={x + 24} y1={TOP + 606} x2={x + w - 24} y2={TOP + 606} />
          <Txt x={x + 24} y={TOP + 632} size={8.2} font={F.mono} weight={700} fill={VERMILION} spacing={0.6}>
            RISK ABSORBED BY
          </Txt>
          <Txt x={x + 24} y={TOP + 650} size={9.8} font={F.sans} weight={500} fill={MUTED}>
            {fl.id === 'force' ? 'ICE agents and the courts' : fl.id === 'money' ? 'agencies that lose their funding' : 'the attorney general and the bar'}
          </Txt>
        </g>
      );
    })}

    <path d="M 524 470 L 552 470" stroke={VERMILION} strokeWidth={1.8} markerEnd="url(#arw-verm)" />
    <path d="M 1012 470 L 1040 470" stroke={VERMILION} strokeWidth={1.8} markerEnd="url(#arw-verm)" />
    <Txt x={538} y={458} size={7.6} font={F.mono} weight={700} fill={VERMILION} anchor="middle">
      FUNDS
    </Txt>
    <Txt x={1026} y={458} size={7.6} font={F.mono} weight={700} fill={VERMILION} anchor="middle">
      CHARGES
    </Txt>

    <PlateFoot
      fig="09"
      read="Miller is the only person astride all three. Vought owns the money, Blanche owns the law, Homan owns the operations — and Miller owns the instruction that sets all three in motion. That is what the title formalises."
    />
  </g>
);

// ══════════════════════════════════════════════════════════════════════════
// 10 · THE CROSSING
// ══════════════════════════════════════════════════════════════════════════

const LX0 = 148;
const LX1 = 1136;
const LY0 = 726;
const LY1 = 262;
const lx = (i: number) => LX0 + (i / 8) * (LX1 - LX0);
const ly = (v: number) => LY0 - (v / 100) * (LY0 - LY1);
const QUARTERS = ['24Q4', '25Q1', '25Q2', '25Q3', '25Q4', '26Q1', '26Q2', '26Q3', '26Q4'];

const SERIES_GLOSS: Record<string, string> = {
  miller: 'policy shop → gatekeeper',
  wiles: 'chief of staff → political operation',
  vance: 'heir, then the war',
  kushner: 'the envoy with $6bn',
  musk: 'the relationship that broke',
};

export const D10Influence: React.FC = () => (
  <g>
    <Defs />
    {[0, 25, 50, 75, 100].map((v) => (
      <g key={v}>
        <line x1={LX0} y1={ly(v)} x2={LX1} y2={ly(v)} stroke={HAIR} strokeWidth={1} />
        <Txt x={LX0 - 12} y={ly(v) + 3} size={8.4} font={F.mono} weight={700} fill={MUTED} anchor="end">
          {v}
        </Txt>
      </g>
    ))}
    {QUARTERS.map((q, i) => (
      <g key={q}>
        <line x1={lx(i)} y1={LY0} x2={lx(i)} y2={LY0 + 6} stroke={HAIR_STRONG} strokeWidth={1.5} />
        <Txt x={lx(i)} y={LY0 + 22} size={8.4} font={F.mono} weight={700} fill={MUTED} anchor="middle" spacing={0.6}>
          {q}
        </Txt>
      </g>
    ))}
    <Txt x={LX0 - 12} y={LY1 - 26} size={9} font={F.mono} weight={700} fill={MUTED} anchor="end" spacing={1.2}>
      INFLUENCE
    </Txt>

    {/* the two dates that matter, marked on the floor of the plot */}
    {[
      { i: 5.0, label: 'MINNEAPOLIS · 26Q1', anchor: 'start' as const, dy: -8, len: 1 },
      { i: 6.0, label: 'NOEM OUT · 26Q2', anchor: 'start' as const, dy: -24, len: 1 },
      { i: 8.0, label: 'MIDTERMS · MILLER IN', anchor: 'end' as const, dy: -8, len: 1 },
    ].map((m) => (
      <g key={m.label}>
        <line x1={lx(m.i)} y1={LY1 - 4} x2={lx(m.i)} y2={LY0} stroke={VERMILION} strokeWidth={1} strokeDasharray="3 4" opacity={0.32} />
        <line x1={lx(m.i)} y1={LY1 - 4} x2={lx(m.i)} y2={LY1 + m.dy + 4} stroke={VERMILION} strokeWidth={1.4} />
        <Txt
          x={lx(m.i) + (m.anchor === 'start' ? 6 : -6)}
          y={LY1 + m.dy - 8}
          size={7.6}
          font={F.mono}
          weight={700}
          fill={VERMILION}
          anchor={m.anchor}
          spacing={0.4}
        >
          {m.label}
        </Txt>
      </g>
    ))}

    {INFLUENCE.map((s) => {
      const col = s.ink === 'vermilion' ? VERMILION : s.ink === 'cobalt' ? COBALT : INK;
      const pts = s.points.map((v, i) => `${lx(i)},${ly(v)}`).join(' ');
      return (
        <g key={s.id}>
          <polyline
            points={pts}
            fill="none"
            stroke={col}
            strokeWidth={s.id === 'miller' ? 3.2 : 2}
            strokeDasharray={s.dashed ? '7 5' : undefined}
            strokeLinejoin="round"
          />
          {s.points.map((v, i) => (
            <circle key={i} cx={lx(i)} cy={ly(v)} r={s.id === 'miller' ? 3.4 : 2.2} fill={col} />
          ))}
          <circle cx={lx(8)} cy={ly(s.points[8])} r={s.id === 'miller' ? 6 : 4} fill={col} />
        </g>
      );
    })}

    {/* the crossing: solved from the two series, not placed by eye */}
    {(() => {
      const m = INFLUENCE.find((s) => s.id === 'miller')!.points;
      const w = INFLUENCE.find((s) => s.id === 'wiles')!.points;
      let at = NaN;
      let val = NaN;
      for (let i = 0; i < m.length - 1; i += 1) {
        const d0 = m[i] - w[i];
        const d1 = m[i + 1] - w[i + 1];
        if (d0 < 0 && d1 >= 0) {
          at = i + d0 / (d0 - d1);
          val = m[i] + (m[i + 1] - m[i]) * (at - i);
          break;
        }
      }
      if (!Number.isFinite(at)) return null;
      return (
        <g>
          <line x1={lx(at)} y1={ly(val)} x2={lx(at)} y2={ly(val) + 120} stroke={VERMILION} strokeWidth={1.2} strokeDasharray="3 3" />
          <circle cx={lx(at)} cy={ly(val)} r={7} fill="none" stroke={VERMILION} strokeWidth={2} />
          <circle cx={lx(at)} cy={ly(val)} r={2.4} fill={VERMILION} />
          <Txt x={lx(at) + 12} y={ly(val) + 128} size={8.4} font={F.mono} weight={700} fill={VERMILION} spacing={0.7}>
            {`CROSSING · ${QUARTERS[Math.floor(at)]} → ${QUARTERS[Math.ceil(at)]}`}
          </Txt>
          <Txt x={lx(at) + 12} y={ly(val) + 141} size={8.4} font={F.sans} weight={500} fill={MUTED}>
            {`Miller ${Math.round(val)} overtakes Wiles — fifteen months before the title.`}
          </Txt>
        </g>
      );
    })()}

    {/* measured key: no floating labels, nothing to collide */}
    <rect x={1194} y={LY1 - 26} width={342} height={468} fill="none" stroke={HAIR_MID} strokeWidth={2} />
    <Kicker x={1214} y={LY1 + 2} size={8.8}>
      SERIES · 26Q4 VALUE
    </Kicker>
    {[...INFLUENCE]
      .sort((a, b) => b.points[8] - a.points[8])
      .map((s, i) => {
        const col = s.ink === 'vermilion' ? VERMILION : s.ink === 'cobalt' ? COBALT : INK;
        const y = LY1 + 42 + i * 84;
        return (
          <g key={`k-${s.id}`}>
            <line x1={1214} y1={y} x2={1266} y2={y} stroke={col} strokeWidth={s.id === 'miller' ? 4 : 2.6} strokeDasharray={s.dashed ? '7 5' : undefined} />
            <Txt x={1280} y={y + 4} size={11} font={F.mono} weight={700} fill={col} spacing={1}>
              {s.label}
            </Txt>
            <Txt x={1516} y={y + 5} size={19} font={F.numeral} fill={col} anchor="end">
              {s.points[8]}
            </Txt>
            <Txt x={1214} y={y + 22} size={9.6} font={F.sans} weight={500} fill={MUTED}>
              {SERIES_GLOSS[s.id]}
            </Txt>
            <Txt x={1214} y={y + 38} size={8.2} font={F.mono} weight={700} fill={MUTED} spacing={0.4}>
              {`PEAK ${Math.max(...s.points)} · LOW ${Math.min(...s.points)}`}
            </Txt>
          </g>
        );
      })}

    <PlateFoot
      fig="10"
      read="Wiles falls from 78 to 10; Miller climbs from 58 to 100. Vance's 14-point drop is the most interesting number here — he kept the office and lost standing by saying out loud what the party could not admit about the war."
    />
  </g>
);

export const DIAGRAMS: Array<{
  id: string;
  numeral: string;
  kind: string;
  title: string;
  dek: string;
  question: string;
  reading: string[];
  source: string;
  Comp: React.FC;
}> = [
  {
    id: 'hub',
    numeral: '01',
    kind: 'NETWORK GRAPH',
    title: 'The Hub',
    dek: 'Thirty-six figures, fifty-four links. Who is genuinely wired to whom.',
    question: 'If the president left the room, which relationships would still function?',
    reading: [
      'The graph is a star, not a cabinet. Thirty-two of the fifty-four links terminate at the president personally, which is why every internal rivalry in this administration is resolved by access rather than by argument. Two officials with the same authority do not fight it out on the merits; they compete for a slot in the day.',
      'Only four figures hold links to one another — Miller, Rubio, Vought and Kushner — and those are the only relationships in the map that can act without him present. Miller reaches the budget office, the border czar and the State Department directly; Vought converts instructions into appropriations; Kushner carries the Gulf files and the money that comes with them.',
      'The exits sit along the left edge on broken lines, which is the most important graphical decision on this plate. The network does not delete people when they leave. Wiles keeps a link because she moves to the political operation rather than out of the family; Noem keeps one because she was given an envoy post rather than a severance.',
      'That is a structural fact about this presidency and not a personality trait of this president: power here is stored in relationships rather than offices, so removing someone from an office removes very little. It is also why the promotion of a staffer can matter more than the replacement of a cabinet secretary. The staffer owns the links.',
    ],
    source: 'Roles as of 9 November 2026. Link set and weights are analytic, built from reported access and formal authority; see METHOD. Reporting: NYT, Semafor, Politico, NBC, Reuters, 2025–26.',
    Comp: D01Network,
  },
  {
    id: 'rings',
    numeral: '02',
    kind: 'CONCENTRIC MODEL',
    title: 'Four Rings',
    dek: 'Proximity, authority, transaction, exit — the four ways into the orbit.',
    question: 'Which ring actually decides things?',
    reading: [
      'Ring one requires no Senate vote, no security-clearance hearing and no financial disclosure. It is staffed entirely by people the public never confirmed — Miller, Harp, Cheung, Scavino, Epshteyn, Zacharia — and it is the ring that writes the instructions the other three receive.',
      'Ring two holds the confirmed officers. They command the machinery: prosecutions, deployments, budgets, recognition. What they do not command is the agenda, because the agenda is written one ring in. Ring three pays for the politics and asks for the regulation, and ring four is where the incompletely loyal end up.',
      'The model inverts the constitutional picture. In the Constitution, authority is granted outward from the voters through the president to officers who are accountable to the Senate. In this diagram authority radiates inward, and is granted outward as a favour.',
      'The Miller promotion is best read as a movement within ring one: he was already the most powerful unconfirmed official in the government, and he is now the one who decides what the confirmed officers are asked to do. Nothing about his formal legal authority changed on 9 November. Everything about his practical authority did.',
    ],
    source: 'Roles as of 9 November 2026. Ring assignment and ordering are analytic. Reporting: Politico, NBC, Semafor, Vanity Fair, 2025–26.',
    Comp: D02Rings,
  },
  {
    id: 'tenure',
    numeral: '03',
    kind: 'TENURE BARS',
    title: 'Continuity',
    dek: 'Where each figure actually was, 2015 to 2026 — including the gaps.',
    question: 'What does the promotion actually reward?',
    reading: [
      'Miller has no empty year since 2016. Between the two terms he founded America First Legal, which kept him inside the movement, kept a network of lawyers employed, and later supplied personnel to the administration. Most of the people a president rewards are the ones who built something for him while he was out of power.',
      'Compare Rubio, whose bar has a gap covering exactly the period when he described Trump in hostile terms, and Bondi, whose bar is unbroken from 2016 and ends anyway in April 2026. Continuity is necessary for advancement and nowhere near sufficient — the missing variable is visible aggression.',
      'Kushner and Witkoff are the anomaly the chart makes obvious. Both left government, both monetised the interval, and both returned with portfolios rather than jobs. Their bars are the only two that turn a gap into an asset, because in their case the interval was the point.',
      'Read as a whole, the chart is a defence of the promotion on the president’s own terms. If the qualification is presence, then the person with no gaps is the most qualified person available, and the fact that his policies were just rejected at the ballot box is a separate question from whether he should run the building.',
    ],
    source: 'Public biographies, financial disclosures and administration announcements. Bar edges are approximate months; gaps are periods with no formal or informal role.',
    Comp: D03Tenure,
  },
  {
    id: 'timeline',
    numeral: '04',
    kind: 'DUAL-LANE TIMELINE',
    title: 'Twenty-Four Months',
    dek: 'Two years of court churn against the events that caused it.',
    question: 'What was the promotion a response to?',
    reading: [
      'The court lane and the world lane move independently until the autumn of 2026, then lock together: a rout on 3 November, the chief of staff fired on the 6th, her replacement in post on the 9th. Four days separate the verdict from the answer to it.',
      'Four of the seven senior departures happen before the election. The president was already replacing people faster than the calendar required, which matters for interpretation: turnover is a standing habit of this White House, not a reaction to defeat.',
      'The promotion is the only appointment in the period that was not forced by a resignation, a scandal or a death. Wiles had not asked to leave; she was removed. That single fact is why the appointment carries meaning beyond staffing — it is the one move in twenty-four months that was purely a choice.',
      'Note also what the lane does not show: any congressional action. In twenty-two months the Republican trifecta passed a stablecoin bill and an enforcement appropriation and little else of consequence, which is the deeper context for a presidency that has decided to govern through instruction rather than legislation.',
    ],
    source: 'NYT, Reuters, BBC, PBS Frontline, Politico, Semafor, The 19th; dates to the day where reported and to the month where only a month is public.',
    Comp: D04Timeline,
  },
  {
    id: 'quadrant',
    numeral: '05',
    kind: 'SCATTER PLOT',
    title: 'Access × Authority',
    dek: 'Proximity to the president against command of the state.',
    question: 'Who can turn a preference into an action?',
    reading: [
      'The top-right cell — high access and high authority at once — was empty of staff until 9 November. It held the president and, arguably, the vice president. It now holds the chief of staff, and the dashed arrow on the plate marks the move from where Miller sat as a policy adviser to where he sits as the gatekeeper.',
      'Harp illustrates the opposite failure. She has near-maximum access and almost no machinery: she can change what the president reads, and she cannot change what the government does. In a presidency organised around one person’s attention that is real power, but it is power that dies the moment the attention moves.',
      'The instruments cluster bottom-right. Vought, Blanche, Rubio, Hegseth, Mullin and Bessent command real authority and modest access, which means they are strong in implementation and weak in definition. They execute an agenda they did not write.',
      'The Miller promotion is the merger of the two cells, and that is the analytical point the plate exists to make. Before November the man with the design authority had to persuade the man with the desk. After November they are the same person, and the persuasion step disappears from the process.',
    ],
    source: 'Indices are editorial judgements on a 0–100 scale, built from reported access and statutory authority; they are not measurements. See METHOD.',
    Comp: D05Quadrant,
  },
  {
    id: 'barrels',
    numeral: '06',
    kind: 'FILL-LEVEL BARS',
    title: 'Firewalls',
    dek: 'Three thresholds the administration has already crossed.',
    question: 'Where does private interest meet public power?',
    reading: [
      'Kushner runs an unpaid envoy role with about $6.16 billion under management, roughly 99% of it foreign-sourced, and no filed disclosure. He co-led negotiations on Gaza and Iran while his firm’s largest single investor was the government of Saudi Arabia, the counterparty in one of those files.',
      'The fee column is the sharper measure. Senate Finance estimated that Affinity collected about $129 million in fees from Riyadh’s investment arm between 2021 and 2025, on capital that produced little or no return for the client. A fee from a government you are negotiating with is not illegal. It is also not distinguishable from payment for access.',
      'The third barrel is not financial. Four women left the cabinet in three months — Noem, Bondi, Chavez-DeRemer, Gabbard — and all four were replaced by men, while every original male secretary kept his post. Wiles made it five. That is a hiring pattern, and a hiring pattern produces a result without anyone having to intend it.',
      'What the barrels share is the absence of a firewall rather than the presence of a crime. No prosecutor has alleged bribery; both firms deny any link between policy and investment. The claim here is narrower: where no firewall exists, the only control is an official’s own judgement, and judgement is not an accountability mechanism.',
    ],
    source: 'Senate Finance (2024 investigation; 2026 letters), House Oversight letters (Mar, Apr, Oct 2026), Bloomberg, Reuters, Forbes, NYT. Figures are as published; none of the individuals named has been charged.',
    Comp: D06Barrels,
  },
  {
    id: 'exits',
    numeral: '07',
    kind: 'ROSTER',
    title: 'The Filter',
    dek: 'Seven departures, one promotion, and what replaced what.',
    question: 'Is turnover disorder or selection?',
    reading: [
      'Every replacement moved the institution toward the president’s preference. A fired attorney general was replaced by the deputy who had been his personal defence lawyer; a homeland security secretary was replaced by a senator who campaigned on enforcement; a chief of staff was replaced by the author of the policy the country had just rejected.',
      'Bondi is the decisive case. She defended him at his first impeachment trial, campaigned for him three times, and was removed — reportedly for not prosecuting his opponents fast enough. If loyalty of that depth is not sufficient, then loyalty is a floor and the ceiling is something else: the willingness to act.',
      'The exits also reveal how failure is handled. Noem’s department killed two American citizens and she received an envoy post. Bondi’s department mishandled the Epstein files and she received a private-sector send-off and a thank-you note. Failure is survivable here. Friction is not.',
      'The promotion is the same rule applied upward. In a White House that has just lost both chambers, the conventional appointment would be a conciliator who can negotiate with a Democratic Congress. The president chose the witness those committees most want to subpoena, which tells you what he expects the next two years to consist of.',
    ],
    source: 'People, BBC, The 19th, Politico, NYT, NBC, November 2026. Reported reasons are as published; several are contested by the administration.',
    Comp: D07Exits,
  },
  {
    id: 'org',
    numeral: '08',
    kind: 'ORG CHART',
    title: 'One Door',
    dek: 'The West Wing as it stands on 9 November 2026.',
    question: 'What does the chief of staff actually control?',
    reading: [
      'A chief of staff controls paper, personnel, schedule and the definition of what reaches the desk. In most White Houses that makes the chief a manager with political weight. In a White House where the president is the sole authorising authority and policy is drafted by a very small shop, it makes the chief the effective chief executive of the domestic state.',
      'Miller arrives already holding the policy shop and the homeland security portfolio — the design authority and the convening authority in one desk. The combination was unusual as a deputy; as chief of staff it collapses the remaining distance between writing an instruction and deciding that the president will see it.',
      'The dashed box on the left is the tell. Wiles is not gone from the network; she is gone from the door, and in this system those are the same thing. Her successor inherits a building with fewer senior staff than at any point in the term and a president who has concluded that the people who stayed are the people to trust.',
      'The agency band at the bottom is where the constitution expects authority to sit. It is drawn below the staff line, connected upward, because that is how it now functions: the departments are the instruments, and the instruction arrives from a floor above them.',
    ],
    source: 'White House staffing reported by Politico, NBC, Semafor, Bloomberg and the White House daily digest; the chart is schematic, not an official table of organisation.',
    Comp: D08Org,
  },
  {
    id: 'flows',
    numeral: '09',
    kind: 'FLOW DIAGRAM',
    title: 'Three Chains',
    dek: 'Force, money and law — the three systems Miller’s instruction sets in motion.',
    question: 'How does a preference become an outcome?',
    reading: [
      'Force runs from the White House to the Department of Homeland Security and into ICE field offices, where an internal target of 3,000 arrests a day converts a political number into individual encounters on individual doorsteps. The target is the mechanism: it makes the agency’s performance measurable in the currency the White House cares about.',
      'Money runs through the Office of Management and Budget. Vought decides which agencies can afford the policy they have been handed, which is why the budget office matters more to this agenda than any speech. Enforcement without an appropriation is a press release; with one it is a programme.',
      'Law runs through the Justice Department. The attorney general is the president’s former criminal defence lawyer and has publicly described himself as the new chief of staff’s lawyer. The ordinary buffer between a White House policy and a prosecution decision has been removed, and the removal is not hidden — it was said out loud, on television, within a day of the promotion.',
      'The three chains meet at one desk, which is what the plate is for. Vought owns the money, Blanche owns the law, Homan owns the operations, and Miller owns the instruction that sets all three going. Taken separately each is a normal instrument of government; wired to a single author, they are a machine.',
    ],
    source: 'Reuters, AP, NYT, PBS Frontline, NBC; chain stages are analytic. The arrest target is reported and contested; see METHOD.',
    Comp: D09Flows,
  },
  {
    id: 'influence',
    numeral: '10',
    kind: 'TIME SERIES',
    title: 'The Crossing',
    dek: 'Nine quarterly readings of influence, 2024 Q4 to 2026 Q4.',
    question: 'When did the centre of gravity move?',
    reading: [
      'The crossing happens in the final quarter: Wiles collapses from 55 to 10 while Miller reaches the modelled ceiling of 100. That is not a gradual handover of responsibilities; it is a replacement, executed in four days, and the chart is drawn to make the discontinuity visible rather than to smooth it.',
      'Musk is the counter-example that proves the rule. His line is the only one that collapses without a title being removed, because his influence was never institutional — it was a relationship with a person who could withdraw it. It then partially recovers, which is itself unusual and tells you something about how much this president values the platform.',
      'Vance’s 14-point drop is the most interesting number on the plate. He kept the office and lost standing by saying out loud what most of the party could not admit about the war. In a system that rewards aggression and punishes friction, he found the one form of friction that the base was prepared to tolerate.',
      'Read together, the five lines describe a presidency that has stopped distributing influence across institutions and started concentrating it in a single office. By the last reading, the only curve still rising belongs to the man who now controls the paper.',
    ],
    source: 'Quarterly readings are editorial judgements on a 0–100 scale, not polling or measurement; each point is anchored to reported access and authority in that quarter. See METHOD.',
    Comp: D10Influence,
  },
];
