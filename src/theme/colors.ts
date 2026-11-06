/**
 * Design tokens for the Political-Animation engine.
 *
 * Visual direction: Kurzgesagt flat design pushed toward a comic strip /
 * hand-drawn aesthetic — warm paper instead of pure white, off-black ink,
 * saturated but never neon accent colors, and texture overlays everywhere.
 */

export const PALETTE = {
  // Surfaces
  paper: '#F7F5EE',        // warm off-white paper base
  paperAlt: '#EFEBDD',     // slightly darker paper for panels
  sky: '#DCEBF9',          // soft Kurzgesagt sky blue
  night: '#161B2A',        // deep night for space/drama scenes

  // Ink (never pure #000 — hand-drawn pens are slightly brown/blue)
  ink: '#1F1A14',          // primary line art
  inkSoft: '#4A4438',      // secondary lines / sketching
  inkFade: '#8A8274',      // construction lines

  // Accent family (US politics neutral + party hints used sparingly)
  accent: '#0F62FE',       // electric blue — main brand
  accentDark: '#0B4FCC',
  accentGlow: 'rgba(15, 98, 254, 0.35)',

  red: '#C93756',          // warning / republican-leaning highlight (used sparingly)
  redSoft: '#F5E6E8',
  blue: '#3A86FF',         // democrat-leaning highlight (used sparingly)
  blueSoft: '#E4EEFF',
  green: '#36B37E',        // success / civic good
  greenSoft: '#E7F4EC',
  yellow: '#FFB400',       // attention / comic emphasis
  yellowSoft: '#FDF0D5',

  // Text
  text: '#1F1A14',
  textMuted: '#6B6254',
  textOnDark: '#FFFFFF',

  // Misc
  shadow: 'rgba(31, 26, 20, 0.16)',
  white: '#FFFFFF',
} as const;

export type PaletteKey = keyof typeof PALETTE;

export const getColor = (key: PaletteKey): string => PALETTE[key];

/** Typography stack — comic/hand-drawn friendly. Users should add Google Fonts
 * (e.g. "Comic Neue", "Caveat", "Patrick Hand") to index.html for full effect. */
export const FONT = {
  heading: '"Comic Neue", "Caveat", "Segoe UI Emoji", system-ui, sans-serif',
  body: '"Patrick Hand", "Comic Neue", system-ui, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

/** Breakpoints for panel layouts */
export const LAYOUT = {
  gutter: 24,
  panelRadius: 16,
  inkWidth: 3,
  inkWidthRough: 5,
  shadowBlur: 24,
} as const;
