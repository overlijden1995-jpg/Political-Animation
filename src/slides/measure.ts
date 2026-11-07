/**
 * Deterministic type fitting.
 *
 * Slides must never auto-wrap into an unexpected third line, and type should be
 * as large as the box allows — that is what makes a projected deck feel crisp
 * instead of cramped. So we measure with the *real* font and lay out every line
 * ourselves, then render each line with `whiteSpace: nowrap`.
 *
 * The measure function is injected so the exact same fitting logic can run in
 * the browser (canvas `measureText`) and in Node (opentype.js, for the
 * pre-render legibility audit).
 */

export interface Measure {
  /** Advance width of `text`, in px, at `size`. */
  (text: string, family: string, weight: number, size: number, letterSpacing: number): number;
}

export interface FitRequest {
  text: string;
  family: string;
  weight: number;
  maxWidth: number;
  maxLines: number;
  maxSize: number;
  minSize: number;
  letterSpacing?: number;
  /** Extra width budget removed from maxWidth before fitting (hanging punctuation etc). */
  inset?: number;
  step?: number;
  /** Accepted for call-site clarity; fitting never depends on it. */
  lineHeight?: number;
}

export interface FitResult {
  size: number;
  lines: string[];
  /** True when the copy had to go under `minSize` (audit flags these). */
  overflow: boolean;
}

const words = (text: string) => text.split(/\s+/).filter(Boolean);

/** Greedy line breaking with real advance widths. */
export const wrapWith = (measure: Measure, req: Omit<FitRequest, 'maxLines' | 'minSize' | 'maxSize'> & { size: number }): string[] => {
  const { text, family, weight, size, letterSpacing = 0 } = req;
  const maxWidth = Math.max(1, req.maxWidth - (req.inset ?? 0));
  const out: string[] = [];
  let line = '';
  for (const word of words(text)) {
    const trial = line ? `${line} ${word}` : word;
    if (measure(trial, family, weight, size, letterSpacing) <= maxWidth || !line) {
      line = trial;
    } else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out;
};

/**
 * Largest size (stepping down from `maxSize`) whose wrapped copy still fits in
 * `maxLines`. Returns the smallest viable size when nothing fits, flagged.
 */
export const fitWith = (measure: Measure, req: FitRequest): FitResult => {
  const step = req.step ?? 1;
  let fallback: FitResult | null = null;
  for (let size = req.maxSize; size >= req.minSize; size -= step) {
    const lines = wrapWith(measure, { ...req, size });
    const result = { size, lines, overflow: false };
    if (lines.length <= req.maxLines) {
      const widest = Math.max(
        ...lines.map((l) => measure(l, req.family, req.weight, size, req.letterSpacing ?? 0)),
      );
      if (widest <= req.maxWidth - (req.inset ?? 0) + 0.5) return result;
      fallback = fallback ?? { ...result, overflow: true };
    } else {
      fallback = fallback ?? { ...result, overflow: true };
    }
  }
  const lines = wrapWith(measure, { ...req, size: req.minSize });
  return { size: req.minSize, lines, overflow: true };
};

/* ------------------------------------------------------------------ browser */

let ctx: CanvasRenderingContext2D | null = null;

/**
 * Escape hatch for build-side tools (the legibility audit and the still
 * renderer): they inject opentype.js glyph metrics so a headless render fits
 * text exactly the way the browser will.
 */
let measureOverride: Measure | null = null;

export const setMeasureOverride = (next: Measure | null): void => {
  measureOverride = next;
  resetMeasureCache();
};

const canvasMeasure: Measure = (text, family, weight, size, letterSpacing) => {
  if (measureOverride) return measureOverride(text, family, weight, size, letterSpacing);
  if (typeof document === 'undefined') return approximateMeasure(text, family, weight, size, letterSpacing);
  if (!ctx) {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    ctx = canvas.getContext('2d');
  }
  if (!ctx) return approximateMeasure(text, family, weight, size, letterSpacing);
  ctx.font = `${weight} ${size}px ${family}`;
  return ctx.measureText(text).width + letterSpacing * Math.max(text.length - 1, 0);
};

/** Used only when no canvas exists (SSR / unit tests). Deliberately generous. */
export const approximateMeasure: Measure = (text, _family, _weight, size, letterSpacing) =>
  text.length * size * 0.56 + letterSpacing * Math.max(text.length - 1, 0);

export const browserMeasure: Measure = canvasMeasure;

const cache = new Map<string, FitResult>();

/** Font faces finish loading after first paint — wipe memoised fits when they do. */
export const resetMeasureCache = (): void => {
  cache.clear();
};

/** Set once fonts are live so the audit and the runtime agree on metrics. */
export const markFontsLoaded = (): void => {
  (globalThis as unknown as { __deckFontsLoaded?: boolean }).__deckFontsLoaded = true;
  resetMeasureCache();
};

export const fontsLoaded = (): boolean =>
  Boolean((globalThis as unknown as { __deckFontsLoaded?: boolean }).__deckFontsLoaded);

export const fitText = (req: FitRequest, measure: Measure = browserMeasure): FitResult => {
  const key = [
    req.text,
    req.family,
    req.weight,
    req.maxWidth,
    req.maxLines,
    req.maxSize,
    req.minSize,
    req.letterSpacing ?? 0,
    req.inset ?? 0,
    req.step ?? 1,
  ].join('|');
  const hit = cache.get(key);
  if (hit) return hit;
  const result = fitWith(measure, { step: 1, ...req });
  cache.set(key, result);
  return result;
};

/** Rough px height of a block of lines. */
export const blockHeight = (lines: number, size: number, lineHeight: number): number =>
  lines * size * lineHeight;
