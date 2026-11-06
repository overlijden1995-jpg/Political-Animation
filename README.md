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
