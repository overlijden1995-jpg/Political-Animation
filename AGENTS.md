# Agentic pipeline architecture

## Goal
Turn any US-politics topic into a finished animated video through discrete,
reviewable steps. Every step writes JSON; nothing is rendered until a producer
approves the manifests.

## Pipelines

| Pipeline | Aspect | Resolution | Duration | Scenes | FPS |
|---|---|---|---|---|---|
| Shorts | 9:16 | 1080×1920 | ≤60 s | ~6 | 30 |
| Long-form | 16:9 | 1920×1080 | 5–10 min | ~10 | 30 |

## Steps

1. **scriptAgent** (`src/agents/scriptAgent.ts`) — topic → script (title, scenes with narration + timing). Uses OpenAI if `OPENAI_API_KEY` is set, otherwise a built-in template library (electoral college, Congress, Supreme Court, plus a generic fallback).
2. **storyboardAgent** (`src/agents/storyboardAgent.ts`) — assigns visuals per scene: map regions, charts, character emotions, speech bubbles, lower thirds. Writes `storyboard.json`.
3. **voiceAgent** (`src/agents/voiceAgent.ts`) — TTS via OpenAI / ElevenLabs / edge-tts; falls back to a silent WAV placeholder so rendering works offline.
4. **assetAgent** (`src/agents/assetAgent.ts`) — writes image-generation prompts per scene in the Kurzgesagt-comic style, plus placeholder SVGs under `assets/generated/`.
5. **captionAgent** (`src/agents/captionAgent.ts`) — word-level captions distributed across scenes (replace with Whisper alignment later).
6. **Render** — Remotion renders `ShortsPlayer` or `LongFormPlayer` with `script.json` as props.

## Wiring your own providers

- LLM: edit `generateScriptWithLLM` in `scriptAgent.ts` (any OpenAI-compatible endpoint works).
- TTS: add a branch in `synthesizeVoice` in `voiceAgent.ts`.
- Images: `assetAgent.ts` prompts are provider-agnostic; drop finished images into `assets/generated/<runId>/<sceneId>.png` and update the component to read them.
- Captions: swap `captionAgent.ts` for a Whisper-based word-timestamp aligner.

## Visual style

Kurzgesagt flat design + comic strip: warm paper backgrounds (`#F7F5EE`), off-black ink (`#1F1A14`), hand-drawn SVG borders that never close at corners (`src/theme/brush.ts`), rigged vector character (`Character.tsx`), comic speech bubbles, sketched US map (`MapUSA.tsx`), hatched bar charts (`ChartBar.tsx`). See `src/theme/colors.ts` for tokens.

## Commands

```bash
npm install
npm run setup               # resolve ffmpeg + Chromium, writes .render-env.json
npm run doctor              # re-check the render toolchain (no installs)
npm run dev                 # Remotion Studio at localhost:3000
npm run typecheck
npm run render:sample       # 3 s smoke-test MP4 → out/sample.mp4
npm run render:shorts       # full 9:16 short     → out/shorts.mp4
npm run render:longform     # full 16:9 long-form → out/longform.mp4
npm run pipeline "The electoral college explained" --pipeline shorts
npx tsx scripts/render.ts ShortsPlayer out/shorts.mp4 --props runs/run-*/script.json --audio runs/run-*/voiceover.wav
```

## Notes

- **Render toolchain:** `npm run setup` (`scripts/setup.mjs`) resolves everything needed for MP4 output and caches the results in `.render-env.json` (gitignored). It reuses a system `ffmpeg` or exposes Remotion's bundled build via `node_modules/.bin`, and installs Remotion's Chrome Headless Shell — falling back to the npm-packaged `@sparticuz/chromium` when `remotion.media` is blocked. Chromium on Linux additionally needs `libnss3`/`libnspr4`; cached copies in `~/.cache/political-animation/nss-libs` are used when present. `npm run doctor` reports the same checks without changing anything.
- `src/index.tsx` is the single Remotion entry point: `registerRoot()` may only be called once, so all four `<Composition />` wrappers are mounted from one root component.
- Fonts: components reference "Comic Neue", "Caveat", "Patrick Hand" — add them via Google Fonts in your HTML/OS for the full comic look; system fallbacks are used otherwise.
