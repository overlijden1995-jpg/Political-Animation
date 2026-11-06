/**
 * Shared types for the agentic AI pipeline.
 *
 * A "run" = one topic processed through:
 *   script → storyboard → voice → assets → captions → render
 * Every step writes a manifest JSON under runs/<runId>/, so a human producer
 * can inspect and approve each step before the expensive render.
 */

export type PipelineType = 'shorts' | 'longform';

export interface CaptionWord {
  text: string;
  start: number;
  end: number;
}

export interface SceneVisuals {
  character?: { emotion: 'neutral' | 'happy' | 'worried' | 'sad' | 'angry' | 'shocked'; direction?: 'left' | 'right' };
  mapRegion?: string;
  chart?: { data: Array<{ label: string; value: number; color?: string }>; maxValue: number };
  speech?: string;
  lowerThird?: { name: string; role: string };
}

export interface ScriptScene {
  id: string;
  start: number;
  end: number;
  label: string;
  background?: string;
  narration: string;
  visuals?: SceneVisuals;
}

export interface Script {
  title: string;
  topic: string;
  pipeline: PipelineType;
  durationSeconds: number;
  resolution: [number, number];
  scenes: ScriptScene[];
}

export interface Storyboard extends Script {
  scenes: (ScriptScene & { requiredAssets: string[]; imagePrompts: string[] })[];
}

export interface VoiceManifest {
  scriptId: string;
  audioPath: string;
  durationSeconds: number;
  provider: 'openai' | 'elevenlabs' | 'edge-tts' | 'placeholder';
  voice: string;
}

export interface AssetManifest {
  scriptId: string;
  assets: Array<{ sceneId: string; kind: 'map' | 'chart' | 'illustration'; prompt: string; path?: string }>;
}

export interface CaptionManifest {
  scriptId: string;
  words: CaptionWord[];
}

export interface RunManifest {
  runId: string;
  topic: string;
  pipeline: PipelineType;
  createdAt: string;
  steps: { script: string; storyboard: string; voice: string; assets: string; captions: string; render?: string };
}

export interface PipelineOptions {
  runId?: string;
  openAiKey?: string;
  elevenLabsKey?: string;
  voice?: string;
  skipRender?: boolean;
}
