# Political-Animation

Multi-step production engine for animated videos about US politics.

- **Renderer:** [Remotion](https://www.remotion.dev/) (React-based programmatic video), plus a
  browser **presentation player** for reviewing a deck the way it will actually be shown.
- **Two visual systems:**
  - **Swiss Broadsheet deck** — the series format. Flat ink on warm eggshell, full-bleed
    monochrome photo plate, hairline grid, monumental typeset hierarchy. No cards, no rounded
    corners, no drop shadows, no browser chrome: a slideshow, not a webpage.
  - **Comic-strip flat design** — the Shorts/long-form explainer path: inked borders, paper
    textures, hand-drawn charts and maps.
- **Pipelines:**
  - **Shorts** — vertical 9:16 (1080×1920), under 60 s.
  - **Long-form** — 16:9 (1920×1080), 5–10 min.
  - **Series deck** — 16:9, chaptered, driven by a compiled slide manifest.
- **Agentic AI:** pluggable agents write scripts, storyboards, voiceover, image prompts and
  captions. Every step writes a JSON manifest a producer can review — and the deck is gated on a
  measured legibility audit before anything is rendered.

## Prerequisites

- Node.js ≥ 20
- ffmpeg (only for MP4 export; install via `brew install ffmpeg` / `apt-get install ffmpeg`)
- (Optional) API keys for the agentic steps. Everything ships with offline fallbacks.

## Getting started

```bash
npm install
npm run typecheck      # verify the engine compiles
npm run deck           # present the deck in the browser  (http://localhost:3000)
npm run studio         # Remotion Studio, for frame-accurate timeline work
```

### The player is a slideshow

`npm run deck` opens the episode as a full-screen presentation:

| Key | Action |
|---|---|
| `Space` / click | play · pause |
| `→` / `←` | next · previous slide (rewinds inside the current slide first) |
| `Home` / `End` | first · last slide |
| `c` | captions on/off |
| `m` | mute |
| `f` | fullscreen |
| `r` | restart from the top |

The slide is rendered at a fixed 1920×1080 and scaled like a projector, so nothing reflows. The
chrome (slide counter, time, controls) fades out while the deck runs and leaves nothing but the
page on screen.

## The deck pipeline

```
episode manifest (src/data/*.ts)
        │
        ├─ compileDeck()        src/slides/deck.ts      → timed pages: cover · section dividers · content
        ├─ pageGeometry()       src/slides/layout.ts    → headline size, body box, rows — resolved from real metrics
        ├─ auditDeck()          src/agents/slideQualityAgent.ts → legibility gate (fails on overflow)
        ├─ DeckCanvas           src/slides/DeckStage.tsx → the actual pages (hook-free, deterministic)
        │
        ├─ deck/DeckPlayer.tsx  → browser player (audio, keyboard, fullscreen)
        └─ BadActorsJDVance     → Remotion composition (audio + frame clock) → MP4
```

Because the pages are a pure function of `(deck, time)`, the browser preview, a proofing still
and the final MP4 are the same picture.

### Nothing is typeset by the browser

Every string is measured against the real TTF (glyph advances, not an estimate) and broken into
lines by `src/slides/measure.ts`; each line is then painted with `white-space: nowrap`. Type is
as large as its box allows and can never reflow into an unexpected third line. Hairlines are
exactly 2 px on integer coordinates, and photos are B&W plates with no rounding or shadow.

### Quality gate

```bash
npm run deck:audit      # measured with opentype.js against the committed TTFs
```

Fails on copy that needs more lines than its box, blocks taller than their row, headlines that
crop, and captions that wrap out of the footer band. `npm run bad-actors` runs the same gate and
refuses to finish a build that has errors.

### Proofing stills (no browser required)

```bash
npm run deck:still              # every page → out/stills/*.png
npm run deck:still -- 3 7 15    # specific folios
```

### Rendering

```bash
npm run render:deck                                  # 2× supersampled 1080p30 MP4
npm run render:deck -- --scale 3 --crf 8             # mastering pass
npm run render:deck -- --still 7                     # one page, PNG
```

Defaults favour sharpness: 2× supersampling, PNG frames, CRF 10, `slow` x264, bt709, yuv420p.

## Repository layout

```
src/
  index.ts              # Remotion entry — registers every composition
  slides/               # Swiss Broadsheet deck system
    tokens.ts           # ink, stock, type scale, grid
    fonts.ts            # local TTF loading (player + render)
    measure.ts          # metric-based text fitting
    layout.ts           # page geometry shared by renderer and audit
    deck.ts             # manifest → timed pages
    DeckStage.tsx       # cover, section dividers, content layouts
    parts.tsx           # rules, folios, plates, measured type
  components/           # comic-strip primitives (Shorts / long-form)
  compositions/         # Remotion compositions
  lib/                  # timeline helpers
  agents/               # agentic pipeline + slide quality gate
  data/                 # committed manifests (episode content)
deck/                   # browser presentation player
scripts/
  badActors.ts          # series pipeline: corpus → manifests → legibility gate
  deck_audit.ts         # legibility gate CLI
  deck_still.ts         # headless page proofs (satori + resvg)
  render_deck.ts        # crisp MP4 / still export
```

## Bad Actors: How Politicians Pretend

An AI-voiced profile series on political rhetoric. Episode 01 covers **Vice President J.D.
Vance**; later episodes move across both parties.

Each episode runs **6:00** in five fixed beats:

| # | Section | Length |
|---|---------|--------|
| 01 | Politician Info | 0:30 |
| 02 | Extrapolated Ideology | 1:00 |
| 03 | Vocabulary Analysis | 1:00 |
| 04 | Rhetorical Analysis | 2:00 |
| 05 | Overall Assessment & Conclusion | 1:30 |

### Visual system — Swiss Broadsheet

One flat page system, applied to everything:

| Layer | Rule |
|-------|------|
| Stock | Warm eggshell `#F6F4EE`; carbon ink `#121212`; signal vermilion `#C0241A`; cobalt `#1F3A93` |
| Plate | Full-height B&W photo on the left (600 px), hairline edge, caption in the footer band |
| Measure | 1176 px typeset column; headline 58–84 px League Spartan; body 19–27 px Plus Jakarta Sans |
| Structure | 2 px hairlines instead of cards; rules instead of boxes; print folios; no gradients or shadows |
| Quotes | Libre Baskerville italic with a highlighter strike on the key phrase |
| Motion | Hard cuts, 8-frame enters, bars that grow once. No fades to black, no parallax |
| Data | Sharp rectangles only — one ink per series, figures in Anton, tabular numerals |

### Artifacts

```
episodes/bad-actors-ep01-jd-vance.mp4            # 6:00 episode, 1080p
public/bad-actors/ep01-jd-vance/photos/          # committed source photographs
public/bad-actors/ep01-jd-vance/audio/           # committed AI narration master
public/bad-actors/fonts/                         # committed TTFs (player + render)
docs/bad-actors-ep01-jd-vance-dossier.md         # research + source dossier
runs/bad-actors-ep01-jd-vance/                   # corpus analysis, deck, audit (generated)
```

Rebuild the manifests and re-run the gate:

```bash
npm run bad-actors
```

See `AGENTS.md` for the pipeline architecture and how to wire your own LLM/TTS/image providers.
