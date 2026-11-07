/**
 * Agentic workflow & corpus analyzer for the series:
 *   "Bad Actors: How Politicians Pretend"
 *
 * Series specification:
 *   - Profiles both Democratic and Republican U.S. politicians (~6 minutes / 360s).
 *   - Scans speech, debate, and Q&A transcript corpora alongside backstory,
 *     roll-call voting records, donor profiles, and actions in office.
 *   - Fixed 5-section episode format:
 *       1. Politician Info: Quick Bio            —  30s (0:00 – 0:30)
 *       2. Extrapolated Ideology                 —  60s (0:30 – 1:30)
 *       3. Vocabulary Analysis                   —  60s (1:30 – 2:30)
 *       4. Rhetorical Analysis                   — 120s (2:30 – 4:30)
 *       5. Overall Assessment & Conclusion       —  90s (4:30 – 6:00)
 */

export type PoliticalParty = 'Republican' | 'Democratic' | 'Independent';

export type BadActorsSectionId =
  | 'bio'
  | 'ideology'
  | 'vocabulary'
  | 'rhetoric'
  | 'conclusion';

export interface CorpusDocument {
  id: string;
  title: string;
  date: string;
  kind: 'speech' | 'debate' | 'qa';
  source: string;
  text: string;
}

export interface PoliticianCorpus {
  politician: string;
  role: string;
  party: PoliticalParty;
  compiledDate: string;
  documents: CorpusDocument[];
}

export interface BuzzwordClusterSpec {
  label: string;
  patterns: RegExp[];
  category: 'populist' | 'scapegoat' | 'anti-elite' | 'epistemic' | 'natalist' | 'nationalist';
  note: string;
}

export interface BuzzwordMetric {
  label: string;
  hits: number;
  perThousandWords: number;
  category: BuzzwordClusterSpec['category'];
  note: string;
}

export interface DiscourseMarkerMetric {
  phrase: string;
  hits: number;
  perThousandWords: number;
  rhetoricalFunction: string;
}

export interface ContradictionPair {
  topic: string;
  earlierPosition: string;
  earlierDate: string;
  laterPosition: string;
  laterDate: string;
}

export interface ClaimAuditItem {
  claim: string;
  occasion: string;
  verdict: 'False' | 'Distorted' | 'Deferred';
  reality: string;
}

export interface RecordMetric {
  metric: string;
  value: string;
  rhetoricContrast: string;
}

export type SlideVisualLayout =
  | 'timeline'
  | 'triad'
  | 'contradictions'
  | 'buzzword-bars'
  | 'code-switches'
  | 'appeal-funnel'
  | 'specificity-meter'
  | 'verbatim-quotes'
  | 'record-scorecard'
  | 'verdict';

export interface SlidePhoto {
  /** Path under public/ (resolved with Remotion staticFile) */
  src: string;
  caption: string;
  dateTag: string;
}

export interface BadActorsSlide {
  id: string;
  sectionId: BadActorsSectionId;
  start: number;
  end: number;
  speechStart: number;
  speechEnd: number;
  headline: string;
  subheadline: string;
  narration: string;
  layout: SlideVisualLayout;
  photo: SlidePhoto;
  secondaryPhoto?: SlidePhoto;
  accentColor: string;
  /** Structured payload rendered by the slide's visual layout */
  bullets?: Array<{ tag: string; title: string; detail: string }>;
  buzzwords?: BuzzwordMetric[];
  contradictions?: ContradictionPair[];
  claims?: ClaimAuditItem[];
  quotes?: Array<{ context: string; quote: string; highlight: string }>;
  scorecard?: RecordMetric[];
  specificityStats?: { vaguePercent: number; specificPercent: number; totalSentences: number };
}

export interface BadActorsSection {
  id: BadActorsSectionId;
  number: string;
  title: string;
  shortLabel: string;
  start: number;
  end: number;
  durationSeconds: number;
  accentColor: string;
}

export interface BadActorsEpisode {
  seriesTitle: string;
  episodeNumber: number;
  politician: string;
  party: PoliticalParty;
  currentOffice: string;
  durationSeconds: number;
  audioSrc: string;
  sections: BadActorsSection[];
  slides: BadActorsSlide[];
}

export interface CorpusAnalysisReport {
  politician: string;
  party: PoliticalParty;
  role: string;
  compiledDate: string;
  documentCount: number;
  byKind: Record<'speech' | 'debate' | 'qa', number>;
  totalWordsAllEras: number;
  analyzedActiveEraWords: number;
  sentenceCount: number;
  specificityRatio: {
    numericOrStatutorySentences: number;
    sweepingOrAnecdotalSentences: number;
    specificPercent: number;
    vaguePercent: number;
  };
  buzzwords: BuzzwordMetric[];
  discourseMarkers: DiscourseMarkerMetric[];
}

export const BAD_ACTORS_SECTIONS: BadActorsSection[] = [
  {
    id: 'bio',
    number: '01',
    title: 'Politician Info: Quick Bio',
    shortLabel: 'BIO · 0:30',
    start: 0,
    end: 30,
    durationSeconds: 30,
    accentColor: '#38BDF8',
  },
  {
    id: 'ideology',
    number: '02',
    title: 'Extrapolated Ideology',
    shortLabel: 'IDEOLOGY · 1:00',
    start: 30,
    end: 90,
    durationSeconds: 60,
    accentColor: '#F59E0B',
  },
  {
    id: 'vocabulary',
    number: '03',
    title: 'Vocabulary Analysis',
    shortLabel: 'VOCABULARY · 1:00',
    start: 90,
    end: 150,
    durationSeconds: 60,
    accentColor: '#A78BFA',
  },
  {
    id: 'rhetoric',
    number: '04',
    title: 'Rhetorical Analysis',
    shortLabel: 'RHETORIC · 2:00',
    start: 150,
    end: 270,
    durationSeconds: 120,
    accentColor: '#F43F5E',
  },
  {
    id: 'conclusion',
    number: '05',
    title: 'Overall Assessment & Conclusion',
    shortLabel: 'VERDICT · 1:30',
    start: 270,
    end: 360,
    durationSeconds: 90,
    accentColor: '#10B981',
  },
];

const DEFAULT_BUZZWORD_SPECS: BuzzwordClusterSpec[] = [
  {
    label: 'Family / Children / "Mamaw"',
    patterns: [/famil(?:y|ies)/gi, /\bchildren\b/gi, /\bkids\b/gi, /\bmom[s]?\b/gi, /\bmother\b/gi, /\bgrandmother\b/gi, /\bmamaw\b/gi, /\bparent[s']?\b/gi],
    category: 'natalist',
    note: 'Biographical empathy shield & pronatalist social framing',
  },
  {
    label: 'Workers / "Working Man"',
    patterns: [/\bworker[s']*\b/gi, /working[- ]class/gi, /working man/gi],
    category: 'populist',
    note: 'Populist blue-collar identity anchor across speeches & debates',
  },
  {
    label: 'Open Border / "Illegal Aliens"',
    patterns: [/illegal alien\w*/gi, /illegal immigrant\w*/gi, /illegal migrant\w*/gi, /open border\w*/gi, /unvetted immigrant\w*/gi, /mass migration/gi, /\bflooded\b/gi, /\bfloodgates\b/gi],
    category: 'scapegoat',
    note: 'Universal causal scapegoat linked to housing, hospitals & wages',
  },
  {
    label: 'Ruling Class / "Experts"',
    patterns: [/ruling class/gi, /oligarch\w*/gi, /\bexpert[s]?\b/gi, /\binsiders\b/gi, /entrenched interests/gi, /bureaucrat\w*/gi, /career politician\w*/gi, /wall street/gi],
    category: 'anti-elite',
    note: 'Anti-credentialist attack deflecting institutional scrutiny',
  },
  {
    label: 'Tariffs / Factories / Made in USA',
    patterns: [/manufactur\w*/gi, /factor(?:y|ies)/gi, /\btariff[s]?\b/gi, /made in the usa/gi, /supply chains/gi],
    category: 'nationalist',
    note: 'Economic nationalist remedy paired with deregulatory tax policy',
  },
  {
    label: '"Censorship" / Free Speech',
    patterns: [/censor\w*/gi, /free speech/gi, /silence\w*/gi, /misinformation/gi, /disinformation/gi],
    category: 'epistemic',
    note: 'Inverts democracy questions (Jan. 6, EU firewalls) onto critics',
  },
  {
    label: '"Common Sense" / Wisdom',
    patterns: [/common sense/gi, /\bwisdom\b/gi],
    category: 'epistemic',
    note: 'Substitutes folk intuition for economic or statutory evidence',
  },
  {
    label: 'American Dream / "Homeland"',
    patterns: [/american dream/gi, /\bhomeland\b/gi, /\bheartland\b/gi],
    category: 'nationalist',
    note: 'Reframes America from civic creed into inherited soil & lineage',
  },
];

/**
 * Deterministically analyze a politician's speech, debate, and Q&A transcript corpus.
 */
export const analyzeTranscriptCorpus = (
  corpus: PoliticianCorpus,
  opts?: { excludeDocPrefix?: string; customSpecs?: BuzzwordClusterSpec[] },
): CorpusAnalysisReport => {
  const allWords = corpus.documents
    .map((d) => d.text)
    .join(' ')
    .match(/[A-Za-z']+/g) ?? [];

  const activeDocs = opts?.excludeDocPrefix
    ? corpus.documents.filter((d) => !d.id.startsWith(opts.excludeDocPrefix!))
    : corpus.documents;

  const activeText = activeDocs.map((d) => d.text).join(' ');
  const activeWords = activeText.match(/[A-Za-z']+/g) ?? [];
  const wordCount = Math.max(activeWords.length, 1);

  const byKind: Record<'speech' | 'debate' | 'qa', number> = { speech: 0, debate: 0, qa: 0 };
  for (const d of corpus.documents) {
    byKind[d.kind] = (byKind[d.kind] ?? 0) + 1;
  }

  const specs = opts?.customSpecs ?? DEFAULT_BUZZWORD_SPECS;
  const buzzwords: BuzzwordMetric[] = specs
    .map((spec) => {
      const hits = spec.patterns.reduce((sum, pat) => {
        const matches = activeText.match(pat);
        return sum + (matches ? matches.length : 0);
      }, 0);
      return {
        label: spec.label,
        hits,
        perThousandWords: Number(((hits / wordCount) * 1000).toFixed(1)),
        category: spec.category,
        note: spec.note,
      };
    })
    .sort((a, b) => b.perThousandWords - a.perThousandWords);

  const markerDefs: Array<{ phrase: string; pat: RegExp; fn: string }> = [
    { phrase: '"Look," / "Well, look"', pat: /\blook\b/gi, fn: 'Simulates candid patience right before a pivot' },
    { phrase: '"First of all"', pat: /first of all/gi, fn: 'Appellate-debater numbering to seize framing control' },
    { phrase: '"I think" / "I believe"', pat: /\bi (?:think|believe)\b/gi, fn: 'Personalizes contested claims as earnest conviction' },
    { phrase: '"Of course" / "Frankly"', pat: /\b(?:of course|frankly|honest)\b/gi, fn: 'Concedes trivial ground to appear reasonable' },
  ];

  const discourseMarkers: DiscourseMarkerMetric[] = markerDefs.map((m) => {
    const hits = (activeText.match(m.pat) ?? []).length;
    return {
      phrase: m.phrase,
      hits,
      perThousandWords: Number(((hits / wordCount) * 1000).toFixed(1)),
      rhetoricalFunction: m.fn,
    };
  });

  const sentences = activeText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 5);

  const specificRegex = /\b(\d+|percent|%|act|bill|statute|amendment|1990|2017|2020|cbp one|nafta)\b/i;
  const specificCount = sentences.filter((s) => specificRegex.test(s)).length;
  const totalSentences = Math.max(sentences.length, 1);
  const specificPercent = Number(((specificCount / totalSentences) * 100).toFixed(1));
  const vaguePercent = Number((100 - specificPercent).toFixed(1));

  return {
    politician: corpus.politician,
    party: corpus.party,
    role: corpus.role,
    compiledDate: corpus.compiledDate,
    documentCount: corpus.documents.length,
    byKind,
    totalWordsAllEras: allWords.length,
    analyzedActiveEraWords: activeWords.length,
    sentenceCount: sentences.length,
    specificityRatio: {
      numericOrStatutorySentences: specificCount,
      sweepingOrAnecdotalSentences: sentences.length - specificCount,
      specificPercent,
      vaguePercent,
    },
    buzzwords,
    discourseMarkers,
  };
};
