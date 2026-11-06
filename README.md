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
- ffmpeg — used to mux/encode the MP4. `npm run setup` uses your system ffmpeg
  if it finds one (`brew install ffmpeg` / `apt-get install ffmpeg`) and
  otherwise exposes the build that ships inside Remotion, so a separate install
  is optional.
- Chromium — Remotion screenshots the React compositions in a headless browser.
  `npm run setup` installs Remotion's Chrome Headless Shell, or falls back to an
  npm-packaged Chromium when `remotion.media` is unreachable (locked-down
  sandboxes/CI). On Linux that Chromium needs `libnss3` + `libnspr4`; the setup
  script tells you the exact apt/dnf command if they are missing.
- (Optional) API keys for the agentic steps: OpenAI/ElevenLabs/Midjourney etc. The engine ships with offline fallbacks so everything works without keys.

## Getting started

```bash
cd /home/user/Political-Animation
npm install            # Remotion + React toolchain
npm run setup          # resolve ffmpeg + Chromium, write .render-env.json
npm run doctor         # re-check the toolchain at any time (never installs)
npm run typecheck      # verify the engine compiles
npm run dev            # open Remotion Studio (http://localhost:3000)
```

`npm run setup` is idempotent — run it again after pulling, after a fresh
checkout, or whenever a render complains about a missing browser/ffmpeg. It
prints a one-line summary per component and writes the resolved paths to
`.render-env.json` (gitignored, machine specific), which `scripts/render.ts`
picks up automatically.

## Rendering MP4s

```bash
npm run render:sample    # 3 s, half-resolution smoke test → out/sample.mp4
npm run render:shorts    # 9:16 short            → out/shorts.mp4
npm run render:longform  # 16:9 long-form        → out/longform.mp4
npm run render:article   # Article2026Midterms   → out/article-2026-midterms.mp4
npm run render:justice   # JusticeComposition    → out/justice.mp4
```

For anything custom, call the wrapper directly — it forwards the usual Remotion
flags and injects the browser/ffmpeg paths from `.render-env.json`:

```bash
npx tsx scripts/render.ts LongFormPlayer out/custom.mp4 \
  --props runs/run-123/script.json \
  --audio runs/run-123/voiceover.wav \
  --frames 0-299 --scale 0.5 --concurrency 2
```

`npm run dev` also works for exploring: pick a composition, scrub the timeline
and hit *Render* in Remotion Studio.

### Toolchain troubleshooting

| Symptom | Fix |
|---|---|
| `Error: Could not find a browser` / `No browser found` | `npm run setup` |
| `libnss3.so: cannot open shared object file` (Linux) | `apt-get install -y libnss3 libnspr4`, or drop the `.so` files into `~/.cache/political-animation/nss-libs` and re-run `npm run setup` |
| `remotion.media` download fails | Expected in restricted networks — setup installs the npm fallback Chromium instead |
| Render is slow / low memory | `--scale 0.5`, lower `--concurrency`, or render with `--frames <start>-<end>` |
| `registerRoot() was called more than once` | `src/index.tsx` must stay the single entry point |

## Repository layout

```
src/
  index.tsx             # Remotion entry — registers all four compositions
  theme/                # design tokens: ink, paper, palette, brush styles, type
  components/           # remotion scenes: Panel, SpeechBubble, Character, Captions, ...
  compositions/         # ShortsPlayer (9:16), LongFormPlayer (16:9), Article2026Midterms, JusticeComposition
  lib/                  # timeline helpers, easing, prop interpolation
  agents/               # agentic AI pipeline (script → storyboard → voice → assets → captions → render)
  data/                 # example scripts and approved manifests
scripts/
  setup.mjs             # bootstraps the render toolchain (ffmpeg + Chromium)
  render.ts             # CLI wrapper around `remotion render` (MP4 output)
  pipeline.ts           # runs the full agentic pipeline end-to-end
  article.ts            # article → script/storyboard → render command
  generate_lofi.py      # numpy synth for the royalty-free lofi soundtrack
```

See `AGENTS.md` for the pipeline architecture and how to wire your own LLM/TTS/image providers.
