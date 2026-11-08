/**
 * Types for "The Loyalty Machine" — a link-analysis exhibit book.
 *
 * Every number in here is an *analytic index* built from public reporting,
 * not a measurement. The deck says so on every page: scores are ordinal
 * judgements on a 0–100 scale, useful for comparison inside this model only.
 */

export type Sector =
  | 'principal'
  | 'court'
  | 'cabinet'
  | 'family'
  | 'tech'
  | 'exit';

export type Status = 'in' | 'sideways' | 'out' | 'transactional';

export interface Figure {
  id: string;
  /** Name as printed on a diagram. */
  name: string;
  /** Compact label for dense diagrams. */
  short: string;
  /** Role as of November 2026 (or last held role if departed). */
  role: string;
  sector: Sector;
  status: Status;
  /** Court tier: 0 principal, 1 court, 2 enforcers, 3 transactionals, 4 exited. */
  tier: 0 | 1 | 2 | 3 | 4;
  /** 0–100: frequency and informality of contact with Trump. */
  access: number;
  /** 0–100: formal authority over money, law, personnel or force. */
  formal: number;
  /** 0–100: length + consistency of the relationship since 2015. */
  loyalty: number;
  /** 0–100: number and quality of links to *other* nodes in the network. */
  brokerage: number;
  /** First year tied to Trump's political project. */
  since: number;
  /** One line of significance, printed on the exhibit. */
  note: string;
}

export type EdgeKind = 'principal' | 'instrumental' | 'personal' | 'financial' | 'friction';

export interface Edge {
  from: string;
  to: string;
  /** 1 = thin line, 3 = heavy line. */
  weight: 1 | 2 | 3;
  kind: EdgeKind;
  /** Optional short label drawn on the heaviest edges. */
  label?: string;
}

export interface Tenure {
  id: string;
  start: number;
  /** 2026.8 = "still in post" (drawn to the right edge). */
  end: number;
  /** Gaps where the person left the orbit entirely. */
  gaps?: Array<[number, number]>;
  /** What the bar represents while it runs. */
  phases: Array<{ from: number; to: number; label: string; kind: 'campaign' | 'staff' | 'outside' | 'cabinet' | 'envoys' }>;
  /** Annotation printed at the end of the row. */
  flag?: string;
}

export interface InfluenceSeries {
  id: string;
  label: string;
  /** Nine quarterly readings, 2024Q4 → 2026Q4. */
  points: number[];
  ink: 'ink' | 'vermilion' | 'cobalt';
  dashed?: boolean;
}

export interface TimelineEvent {
  /** Fractional year, e.g. 2026.84 = early November 2026. */
  at: number;
  lane: 'court' | 'world';
  label: string;
  detail?: string;
  emphasis?: boolean;
}

export interface OrgNode {
  id: string;
  label: string;
  role: string;
  depth: number;
  /** Column within its depth band. */
  slot: number;
  kind: 'principal' | 'cos' | 'deputy' | 'staff' | 'outside';
  note?: string;
  dashed?: boolean;
}

export interface DiagramMeta {
  id: string;
  numeral: string;
  kind: string;
  title: string;
  dek: string;
  question: string;
  reading: string;
  source: string;
}

export const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
