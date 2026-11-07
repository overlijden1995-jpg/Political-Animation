import type * as React from 'react';

/**
 * SlideDeck design tokens — "Swiss Broadsheet", print-first.
 *
 * Everything here is tuned for a 1920×1080 stage that is *projected*, not
 * scrolled. Rules of the system:
 *
 *   1. Flat ink on eggshell. No gradients, no blur, no drop shadows, no
 *      rounded corners — those are screen-UI tells and they soften type.
 *   2. Hairlines are exactly 2 css px and sit on integer coordinates, so they
 *      stay a crisp single line at 1x and exactly 4px at 2x supersampling.
 *   3. Only three inks are ever used: carbon, vermilion and cobalt.
 *   4. Type is sized from one modular scale and never below 22px on a 1080p
 *      stage, which keeps captions legible on a phone.
 */

export const STAGE = { width: 1920, height: 1080 } as const;

export const PRINT = {
  /** Warm eggshell stock — the page, never pure white. */
  paper: '#F6F4EE',
  /** Slightly deeper stock for inset panels / photo captions. */
  paperDeep: '#EBE6DA',
  /** Carbon ink. Full-strength black would clip on cheap projectors. */
  ink: '#121212',
  inkSoft: '#322E28',
  muted: '#6B6559',
  /** Hairline weights. */
  hair: 'rgba(18,18,18,0.14)',
  hairMid: 'rgba(18,18,18,0.30)',
  hairStrong: 'rgba(18,18,18,0.62)',
  /** Signal vermilion — headlines, underlines, data series A. */
  vermilion: '#C0241A',
  /** Cobalt — data series B, section contrast. */
  cobalt: '#1F3A93',
  /** Highlighter yellow — verbatim quote strike only. */
  yellow: '#F5D90A',
  /** Photo matte. */
  matte: '#101010',
  white: '#FFFFFF',
  /** Letterbox around the deck in the player. */
  stage: '#0A0A0B',
} as const;

export const TYPE = {
  /** Monumental headline face. */
  display: '"League Spartan", "Archivo Black", "Helvetica Neue", sans-serif',
  /** Ultra-condensed numerals for section bumpers and figures. */
  numeral: '"Anton", "League Spartan", Impact, sans-serif',
  /** Metadata, kickers, folios, captions. */
  mono: '"IBM Plex Mono", ui-monospace, "SFMono-Regular", monospace',
  /** Running body copy. */
  sans: '"Plus Jakarta Sans", "Space Grotesk", system-ui, sans-serif',
  /** Verbatim quote face. */
  serif: '"Libre Baskerville", Georgia, serif',
  /** Editorial pull-quote face. */
  serifDisplay: '"Instrument Serif", "Playfair Display", Georgia, serif',
} as const;

/** Vertical/horizontal grid, in stage pixels. */
export const GRID = {
  marginX: 72,
  /** Full-bleed photo plate on the left. */
  plateW: 600,
  /** Right-hand typeset column. */
  colX: 672,
  colW: 1176,
  /** Running head baseline + rule. */
  headY: 54,
  headRuleY: 96,
  /** Bottom rule and folio band. */
  footRuleY: 984,
  folioY: 1006,
  /** Photo caption strip. */
  plateCaptionY: 944,
} as const;

export const HAIR = 2;

/** Kills browser text smoothing so glyph edges stay hard in both the player
 *  and the Remotion render. */
export const CRISP_TEXT: React.CSSProperties = {
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  textRendering: 'optimizeLegibility',
  fontKerning: 'normal',
  fontVariantLigatures: 'common-ligatures',
};

/** Type scale (stage px). Never go below 22 for anything the viewer must read. */
export const SCALE = {
  kicker: 20,
  folio: 16,
  caption: 16,
  body: 24,
  bodySm: 22,
  lead: 27,
  title: 30,
  value: 28,
  headlineMin: 58,
  headlineMax: 84,
  headlineCompactMax: 70,
  bumperNumber: 300,
  coverName: 132,
} as const;

/** Print-y section inks: restrained, ink-on-stock, no neon SaaS accents. */
export const SECTION_PRINT: Record<
  string,
  { accent: string; onAccent: string; tint: string }
> = {
  bio: { accent: PRINT.vermilion, onAccent: PRINT.paper, tint: 'rgba(192,36,26,0.07)' },
  ideology: { accent: PRINT.cobalt, onAccent: PRINT.paper, tint: 'rgba(31,58,147,0.07)' },
  vocabulary: { accent: '#4A4034', onAccent: PRINT.paper, tint: 'rgba(74,64,52,0.07)' },
  rhetoric: { accent: PRINT.vermilion, onAccent: PRINT.paper, tint: 'rgba(192,36,26,0.07)' },
  conclusion: { accent: PRINT.ink, onAccent: PRINT.paper, tint: 'rgba(18,18,18,0.06)' },
};

export const sectionPrint = (id: string) => SECTION_PRINT[id] ?? SECTION_PRINT.rhetoric;
