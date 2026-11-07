/**
 * Deck compiler — turns an agent-authored episode manifest into a timed,
 * page-addressed slide deck.
 *
 * This is the single source of truth for both renderers:
 *   • `src/compositions/BadActorsEpisode.tsx` drives it from the Remotion frame
 *   • `deck/DeckPlayer.tsx` drives it from a wall clock
 *
 * The compiler also *decides* the editorial shell for each page (which type
 * sizes, whether the subheadline earns its space, whether copy runs in one or
 * two columns) so layouts stay consistent across episodes and never depend on
 * ad-hoc tuning inside a React component.
 */

import type {
  BadActorsEpisode,
  BadActorsSection,
  BadActorsSlide,
  SlideVisualLayout,
} from '../agents/badActorsAgent';

export type DeckPageKind = 'cover' | 'bumper' | 'content';

/** Which body renderer a content page uses. */
export type DeckBody =
  | 'timeline'
  | 'columns'
  | 'split'
  | 'bars'
  | 'quotes'
  | 'table'
  | 'statement';

export interface DeckPageBase {
  id: string;
  kind: DeckPageKind;
  /** Seconds. */
  start: number;
  end: number;
  /** Printed page number. */
  folio: number;
  section: BadActorsSection;
  sectionIndex: number;
}

export interface CoverPage extends DeckPageBase {
  kind: 'cover';
}

export interface BumperPage extends DeckPageBase {
  kind: 'bumper';
}

export interface ContentPage extends DeckPageBase {
  kind: 'content';
  slide: BadActorsSlide;
  /** 'standard' = more headline air, 'compact' = maximum body space. */
  shell: 'standard' | 'compact';
  body: DeckBody;
  /** Headline size cap for this page. */
  headlineMax: number;
  showSubheadline: boolean;
  /** Column count for list bodies. */
  columns: 1 | 2;
}

export type DeckPage = CoverPage | BumperPage | ContentPage;

export interface SlideDeck {
  episode: BadActorsEpisode;
  pages: DeckPage[];
  /** Total runtime in seconds. */
  duration: number;
  /** Seconds of section bumper shown before each section's first content page. */
  bumperSeconds: number;
}

export interface CompileOptions {
  /** Length of the full-bleed section divider. */
  bumperSeconds?: number;
  /** Length of the opening title page. */
  coverSeconds?: number;
}

const LAYOUT_BODY: Record<SlideVisualLayout, DeckBody> = {
  timeline: 'timeline',
  triad: 'columns',
  contradictions: 'split',
  'buzzword-bars': 'bars',
  'code-switches': 'columns',
  'appeal-funnel': 'timeline',
  'specificity-meter': 'table',
  'verbatim-quotes': 'quotes',
  'record-scorecard': 'table',
  verdict: 'statement',
};

/** Layouts that carry a lot of copy need the compact headline shell. */
const DENSE_LAYOUTS: SlideVisualLayout[] = [
  'timeline',
  'triad',
  'contradictions',
  'buzzword-bars',
  'code-switches',
  'appeal-funnel',
  'specificity-meter',
  'verbatim-quotes',
  'record-scorecard',
];

const columnsFor = (slide: BadActorsSlide, body: DeckBody): 1 | 2 => {
  if (body !== 'columns' && body !== 'timeline') return 1;
  const items = slide.bullets?.length ?? 0;
  // Three or four short items read better as a 2×2 matrix than as a stack.
  if (items === 4 && body === 'columns') return 2;
  if (items === 3 && body === 'columns') return 2;
  const longest = Math.max(0, ...(slide.bullets ?? []).map((b) => b.detail.length));
  return body === 'timeline' && longest <= 110 ? 1 : body === 'timeline' ? 1 : 2;
};

export const compileDeck = (episode: BadActorsEpisode, options: CompileOptions = {}): SlideDeck => {
  const bumperSeconds = options.bumperSeconds ?? 1.6;
  const coverSeconds = options.coverSeconds ?? 1.8;

  const pages: DeckPage[] = [];
  let folio = 0;

  const sectionOf = (slide: BadActorsSlide): { section: BadActorsSection; index: number } => {
    const index = episode.sections.findIndex((s) => s.id === slide.sectionId);
    return {
      section: episode.sections[index] ?? episode.sections[0],
      index: Math.max(index, 0),
    };
  };

  episode.slides.forEach((slide, slideIndex) => {
    const { section, index } = sectionOf(slide);
    const firstOfSection =
      slideIndex === 0 || episode.slides[slideIndex - 1].sectionId !== slide.sectionId;

    let contentStart = slide.start;

    // Section 01 opens on the title page, so it does not get a divider.
    if (firstOfSection && index > 0) {
      const bumperEnd = Math.min(slide.start + bumperSeconds, slide.end);
      folio += 1;
      pages.push({
        id: `bumper-${section.id}`,
        kind: 'bumper',
        start: slide.start,
        end: bumperEnd,
        folio,
        section,
        sectionIndex: index,
      });
      contentStart = bumperEnd;
    }

    folio += 1;
    const body = LAYOUT_BODY[slide.layout] ?? 'columns';
    const dense = DENSE_LAYOUTS.includes(slide.layout);
    pages.push({
      id: slide.id,
      kind: 'content',
      start: contentStart,
      end: slide.end,
      folio,
      section,
      sectionIndex: index,
      slide,
      shell: dense ? 'compact' : 'standard',
      body,
      headlineMax: dense ? 70 : 84,
      showSubheadline: slide.subheadline.trim().length > 0,
      columns: columnsFor(slide, body),
    });
  });

  // Title page runs before the first content page.
  if (pages.length > 0) {
    const first = pages[0];
    const coverEnd = Math.max(0.6, Math.min(coverSeconds, first.end - first.start));
    folio += 1;
    pages.unshift({
      id: 'cover',
      kind: 'cover',
      start: first.start,
      end: first.start + coverEnd,
      folio,
      section: first.section,
      sectionIndex: 0,
    });
    // First content page now starts after the cover.
    if (first.kind === 'content') {
      first.start = first.start + coverEnd;
    }
    // Renumber folios so the deck reads 1..n.
    pages.forEach((page, i) => {
      page.folio = i + 1;
    });
  }

  return {
    episode,
    pages,
    duration: episode.durationSeconds,
    bumperSeconds,
  };
};

/** Page visible at `time` (seconds). Clamped to the deck. */
export const pageAt = (deck: SlideDeck, time: number): DeckPage => {
  const { pages } = deck;
  const t = Math.max(0, Math.min(time, deck.duration - 0.0001));
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (t >= page.start && t < page.end) return page;
  }
  return pages[pages.length - 1];
};

/** Index of `pageAt(time)` — used by the player for prev/next. */
export const pageIndexAt = (deck: SlideDeck, time: number): number =>
  deck.pages.indexOf(pageAt(deck, time));

/** Seconds since the page was cut in. */
export const pageElapsed = (page: DeckPage, time: number): number => Math.max(0, time - page.start);

export const formatTimecode = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export const seasonLabel = (episode: BadActorsEpisode): string =>
  `EPISODE ${String(episode.episodeNumber).padStart(2, '0')}`;

export const pageKicker = (page: ContentPage): string =>
  `SECTION ${page.section.number} · ${page.section.shortLabel.split(' · ')[0]}`;
