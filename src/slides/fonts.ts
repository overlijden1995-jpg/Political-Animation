/**
 * Deck typography loading.
 *
 * The TTFs live in `public/bad-actors/fonts/` so they ship with the render and
 * with the player. Both environments need the *real* faces before the first
 * frame is measured or drawn — a fallback face silently changes every line
 * break, which is exactly the kind of softness we are trying to remove.
 */

export interface DeckFontFace {
  family: string;
  file: string;
  weight: number;
  style?: 'normal' | 'italic';
}

const FONT_DIR = 'bad-actors/fonts';

export const DECK_FONTS: DeckFontFace[] = [
  { family: 'League Spartan', file: 'LeagueSpartan_900Black.ttf', weight: 900 },
  { family: 'League Spartan', file: 'LeagueSpartan_700Bold.ttf', weight: 700 },
  { family: 'Anton', file: 'Anton_400Regular.ttf', weight: 400 },
  { family: 'Archivo Black', file: 'ArchivoBlack_400Regular.ttf', weight: 400 },
  { family: 'IBM Plex Mono', file: 'IBMPlexMono_500Medium.ttf', weight: 500 },
  { family: 'IBM Plex Mono', file: 'IBMPlexMono_700Bold.ttf', weight: 700 },
  { family: 'Plus Jakarta Sans', file: 'PlusJakartaSans_500Medium.ttf', weight: 500 },
  { family: 'Plus Jakarta Sans', file: 'PlusJakartaSans_700Bold.ttf', weight: 700 },
  { family: 'Plus Jakarta Sans', file: 'PlusJakartaSans_800ExtraBold.ttf', weight: 800 },
  { family: 'Libre Baskerville', file: 'LibreBaskerville_400Regular.ttf', weight: 400 },
  { family: 'Libre Baskerville', file: 'LibreBaskerville_400Regular_Italic.ttf', weight: 400, style: 'italic' },
  { family: 'Instrument Serif', file: 'InstrumentSerif_400Regular_Italic.ttf', weight: 400, style: 'italic' },
  { family: 'Space Grotesk', file: 'SpaceGrotesk_500Medium.ttf', weight: 500 },
];

/**
 * Resolve a `public/` path. Inside Remotion the studio/render server mounts
 * `public/` under `window.remotion_staticBase`; in the Vite player it is the
 * site root. Either way we get a plain absolute URL — no `staticFile()` import
 * so this module also runs in the standalone player.
 */
export const assetUrl = (path: string): string => {
  const clean = path.replace(/^\/+/, '');
  // Build-side tools may swap in their own resolution (e.g. inlined data URIs).
  const resolver = (globalThis as unknown as { __deckAssetResolver?: (path: string) => string })
    .__deckAssetResolver;
  if (resolver) return resolver(clean);
  const injected = (globalThis as unknown as { __deckStaticBase?: string }).__deckStaticBase;
  const base =
    injected ??
    (typeof window !== 'undefined'
      ? ((window as unknown as { remotion_staticBase?: string }).remotion_staticBase ?? '')
      : '');
  return `${base.replace(/\/+$/, '')}/${clean}`;
};

let loadPromise: Promise<void> | null = null;

/** Load every deck face once. Safe to call from anywhere; resolved promise is cached. */
export const loadDeckFonts = (): Promise<void> => {
  if (loadPromise) return loadPromise;
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') {
    loadPromise = Promise.resolve();
    return loadPromise;
  }
  loadPromise = Promise.all(
    DECK_FONTS.map(async (face) => {
      const descriptor = `${face.style === 'italic' ? 'italic ' : ''}${face.weight}`;
      // `check()` is cheap and avoids re-parsing faces the studio already has.
      if (document.fonts.check(`1em "${face.family}"`, 'BESbswy')) {
        const existing = Array.from(document.fonts).some(
          (f) => f.family === face.family && f.weight === String(face.weight),
        );
        if (existing) return;
      }
      const ff = new FontFace(face.family, `url("${assetUrl(`${FONT_DIR}/${face.file}`)}") format("truetype")`, {
        weight: String(face.weight),
        style: face.style ?? 'normal',
        display: 'block',
      });
      await ff.load();
      document.fonts.add(ff);
      void descriptor;
    }),
  )
    .then(() => document.fonts.ready.then(() => undefined))
    .catch(() => undefined);
  return loadPromise;
};

/** CSS font shorthand matching what the browser will actually paint. */
export const cssFont = (family: string, weight: number, size: number): string =>
  `${weight} ${size}px ${family}`;
