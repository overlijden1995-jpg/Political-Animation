import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { DeckPlayer } from './DeckPlayer';
import { loadDeckFonts } from '../src/slides/fonts';
import './player.css';

// Kick off type loading immediately — the deck re-renders once the real faces
// are live, but the player's own chrome should not flash a fallback either.
void loadDeckFonts();

const mount = document.getElementById('root');
if (mount) {
  createRoot(mount).render(<DeckPlayer />);
}
