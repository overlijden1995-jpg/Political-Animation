# Political-Animation

Multi-step production engine for animated videos about US politics.

- **Renderer:** [Remotion](https://www.remotion.dev/) (React-based programmatic video)
- **Style:** Kurzgesagt-inspired flat design pushed into a comic-strip / hand-drawn look: inked borders, paper textures, hand-drawn speech bubbles, sketched charts and maps, expressive vector characters.
- **Pipelines:**
  - **Shorts** — vertical 9:16 (1080×1920), under 60 s, fast panel-to-panel pacing, big karaoke captions.
  - **Long-form** — 16:9 (1920×1080), 5–10 min, scene-based with lower-thirds, maps, charts and smoother character acting.
- **Agentic AI:** pluggable agents write scripts, storyboards, voiceover, image prompts and captions from a topic. Each step writes a manifest JSON, so a human producer can review and approve before rendering.

## Prerequisites

- Node.js ≥ 20
- ffmpeg (required for `remotion render` to encode MP4; install via `brew install ffmpeg` / `apt-get install ffmpeg`)
- (Optional) API keys for the agentic steps: OpenAI/ElevenLabs/Midjourney etc. The engine ships with offline fallbacks so everything works without keys.

## Getting started

```bash
cd /home/user/Political-Animation
npm install            # install Remotion + React toolchain
npm run typecheck      # verify the engine compiles
npm run dev            # open Remotion Studio (http://localhost:3000)
```

In Remotion Studio pick **ShortsPlayer** or **LongFormPlayer**, scrub the timeline and export:

```bash
npm run render:shorts   # renders out/shorts.mp4
npm run render:longform # renders out/longform.mp4
```

## Repository layout

```
src/
  index.ts              # Remotion entry — registers both compositions
  theme/                # design tokens: ink, paper, palette, brush styles, type
  components/           # remotion scenes: Panel, SpeechBubble, Character, Captions, ...
  compositions/         # ShortsPlayer (9:16) and LongFormPlayer (16:9)
  lib/                  # timeline helpers, easing, prop interpolation
  agents/               # agentic AI pipeline (script → storyboard → voice → assets → captions → render)
  data/                 # example scripts and approved manifests
scripts/
  render.ts             # CLI wrapper around `remotion render`
  pipeline.ts           # runs the full agentic pipeline end-to-end
```

See `AGENTS.md` for the pipeline architecture and how to wire your own LLM/TTS/image providers.

## Bad Actors: How Politicians Pretend

An AI-voiced profile series on political rhetoric. Episode 01 covers **Vice
President J.D. Vance**; later episodes move across both parties.

Each episode runs **6:00** in five fixed beats:

| # | Section | Length |
|---|---------|--------|
| 01 | Politician Info | 0:30 |
| 02 | Extrapolated Ideology | 1:00 |
| 03 | Vocabulary Analysis | 1:00 |
| 04 | Rhetorical Analysis | 2:00 |
| 05 | Overall Assessment & Conclusion | 1:30 |

### Visual system — hybrid "Swiss Broadsheet"

Selected from the ten eggshell/bold-typeset appearance studies. Appearance **#01
is the dominant base**; #05 and #08 are layered on for two specific jobs.

| Layer | Appearance | Applied to | Signature |
|-------|-----------|------------|-----------|
| Base | **#01 Swiss Broadsheet** | Everything | Warm eggshell `#F6F4EE`, carbon ink `#111111`, signal vermilion `#D62818`, sharp 2px hairline grid, full-height left silver B&W photo bleed |
| Graphs | **#05 Poster Brutalist** | Buzzword bars, specificity meter | Thick 4px black cells, International Orange `#E03C1F` stat figures |
| Quotes | **#08 Oxford Transcript** | Verbatim quote slides | `#FACC15` highlighter strike on the key phrase, serif verbatim type, numbered line gutter |

Design rules kept constant across all slides: big bold typeset headlines,
monumental left-aligned hierarchy, generous eggshell negative space, and snappy
~0.5 s snare-roll transitions plus a full-bleed section bumper every 30–120 s.

### Artifacts

```
episodes/bad-actors-ep01-jd-vance.mp4          # 6:00 episode, 1080p
episodes/bad-actors-10-appearances-lookbook.mp4 # 0:50 animated style lookbook
public/bad-actors/appearances/                  # 10 rendered style boards
public/bad-actors/style-concepts/               # 10 AI style concept images
public/bad-actors/ep01-jd-vance/photos/         # committed source photographs
public/bad-actors/ep01-jd-vance/audio/          # committed AI narration master
docs/bad-actors-ep01-jd-vance-dossier.md        # research + source dossier
runs/bad-actors-ep01-jd-vance/episode-manifest.json  # timed slide manifest
scripts/render_bad_actors_mp4.py                # PIL renderer for the episode
scripts/render_bad_actors_appearances.py        # PIL renderer for style boards
```

Rebuild the episode (renders 5,400 frames at 15 fps, ~4 min):

```bash
.venv/bin/python scripts/render_bad_actors_mp4.py
```
