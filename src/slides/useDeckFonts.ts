import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { loadDeckFonts } from './fonts';
import { markFontsLoaded } from './measure';

let resolved = false;

/**
 * Loads the deck's real typefaces and flips a flag when measurements become
 * trustworthy. Every slide re-renders once, which matters: text must be fitted
 * against the actual faces, never a fallback.
 */
export const useDeckFonts = (): boolean => {
  const [ready, setReady] = useState(resolved);
  useEffect(() => {
    if (resolved) return;
    let alive = true;
    loadDeckFonts().then(() => {
      resolved = true;
      markFontsLoaded();
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  return ready;
};

/** Convenience wrapper for memoising expensive layout work per page. */
export const useMemoLayout = <T,>(factory: () => T, deps: React.DependencyList): T =>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(factory, deps);
