# Agentic pipeline architecture

## Goal
Turn any US-politics topic into a finished animated video through discrete,
reviewable steps. Every step writes JSON; nothing is rendered until a producer
approves the manifests — and the series deck additionally has to pass a
measured legibility gate.

## Pipelines

| Pipeline | Aspect | Resolution | Duration | Scenes | FPS |
|---|---|---|---|---|---|
| Shorts | 9:16 | 1080×1920 | ≤60 s | ~6 | 30 |
| Long-form | 16:9 | 1920×1080 | 5–10 min | ~10 | 30 |
| Series deck | 16:9 | 1920×1080 | 6:00 | ~15 pages | 30 |

## Steps

1. **scriptAgent** (`src/agents/scriptAgent.ts`) — topic → script (title, scenes with narration + timing). Uses OpenAI if `OPENAI_API_KEY` is set, otherwise a built-in template library.
2. **storyboardAgent** (`src/agents/storyboardAgent.ts`) — assigns visuals per scene; writes `storyboard.json`.
3. **voiceAgent** (`src/agents/voiceAgent.ts`) — TTS via OpenAI / ElevenLabs / edge-tts; falls back to a silent WAV placeholder so rendering works offline.
4. **assetAgent** (`src/agents/assetAgent.ts`) — image-generation prompts per scene plus placeholder SVGs.
5. **captionAgent** (`src/agents/captionAgent.ts`) — word-level captions distributed across scenes.
6. **deckCompiler** (`src/slides/deck.ts`) — for the series format: turns the approved episode manifest into timed pages — title page, one full-bleed divider per section, and content pages whose timing is carved out of the section's first slide so audio never drifts.
7. **slideQualityAgent** (`src/agents/slideQualityAgent.ts`) — the legibility gate. Measures every string against the real TTF metrics and the exact geometry the renderer uses; fails the run on overflow, a collapsed body box, a row that outgrows itself, or a caption chunk that wraps out of the footer band. Writes `deck-audit.json`.
8. **Render** — `DeckCanvas` is a pure function of `(deck, time)`, so the browser player, the headless stills and the Remotion MP4 are the same picture.

## Wiring your own providers

- LLM: edit `generateScriptWithLLM` in `scriptAgent.ts` (any OpenAI-compatible endpoint works).
- TTS: add a branch in `synthesizeVoice` in `voiceAgent.ts`.
- Images: `assetAgent.ts` prompts are provider-agnostic; drop finished images into `assets/generated/<runId>/<sceneId>.png`.
- Captions: swap `captionAgent.ts` for a Whisper-based word-timestamp aligner.

## Visual systems

Two, deliberately kept apart.

### 1. Swiss Broadsheet (series deck — `src/slides/`)

Print rules, not UI rules — the deck is a slideshow, never a webpage:

- **No card language.** No rounded corners, no drop shadows, no gradients, no glass.
  2 px hairlines on integer coordinates do the work instead.
- **Measured type.** `src/slides/measure.ts` breaks every string with real glyph
  advances and paints lines with `nowrap`; `pageGeometry()` resolves the headline
  size and body box up front. Nothing reflows, nothing is clipped mid-line.
  Type floors: 19 px body / 58 px headline at 1080p.
- **One ink, one stock.** Eggshell `#F6F4EE`, carbon `#121212`, signal vermilion
  `#C0241A`, cobalt `#1F3A93`, highlighter yellow reserved for verbatim quotes.
- **Fixed furniture.** Running head, folio and footer band (plate credit · live
  caption · page number) sit on the same coordinates on every page.
- **Honest motion.** Hard cuts, 8-frame enters, a bar that grows once. No
  cross-fades, no parallax, no easing that looks like a web transition.

### 2. Comic-strip flat design (Shorts / long-form — `src/components/`)

Kurzgesagt-adjacent: warm paper, off-black ink, hand-drawn SVG borders that never close at
corners (`src/theme/brush.ts`), rigged vector characters, comic speech bubbles, sketched maps
and hatched bars. See `src/theme/colors.ts` for tokens.

## Useful commands

```bash
npm install
npm run deck                 # project the deck (slideshow player, port 3000)
npm run studio               # Remotion Studio
npm run typecheck
npm run bad-actors           # corpus → manifests → legibility gate
npm run deck:audit           # gate only
npm run deck:still           # PNG proofs of every page (satori + resvg, no browser)
npm run render:deck          # 2× supersampled MP4
```

## Notes

- `remotion render` requires ffmpeg (`brew install ffmpeg` / `apt-get install ffmpeg`).
  The player and the still renderer do not.
- Fonts are committed as TTFs in `public/bad-actors/fonts/` and loaded through the
  `FontFace` API, so the player, the Remotion render and the audit all measure the
  same glyphs.
- `scripts/deck_still.ts` is a proofing tool: satori implements a subset of CSS, so
  drop shadows and some background effects are approximated, but geometry, type
  sizes, line breaks and photo placement are the real ones.
