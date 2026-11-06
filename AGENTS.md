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
npm run dev                 # Remotion Studio at localhost:3000
npm run typecheck
npm run pipeline "The electoral college explained" --pipeline shorts
npx tsx scripts/render.ts ShortsPlayer out/shorts.mp4 --props runs/run-*/script.json --audio runs/run-*/voiceover.wav
```

## Notes

- `remotion render` requires ffmpeg (`brew install ffmpeg` / `apt-get install ffmpeg`). Studio preview works without it.
- Fonts: components reference "Comic Neue", "Caveat", "Patrick Hand" — add them via Google Fonts in your HTML/OS for the full comic look; system fallbacks are used otherwise.
