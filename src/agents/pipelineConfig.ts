import type { PipelineType } from './types';

/**
 * Pipeline configuration: Shorts vs long-form.
 * Controls duration, aspect ratio, resolution, scene count targets and
 * pacing rules used by the storyboard agent.
 */

export interface PipelineConfig {
  type: PipelineType;
  aspect: string;
  resolution: [number, number];
  durationSeconds: number;
  targetScenes: number;
  minSceneSeconds: number;
  maxSceneSeconds: number;
  fps: number;
}

export const PIPELINES: Record<PipelineType, PipelineConfig> = {
  shorts: {
    type: 'shorts',
    aspect: '9:16',
    resolution: [1080, 1920],
    durationSeconds: 60,
    targetScenes: 6,
    minSceneSeconds: 6,
    maxSceneSeconds: 14,
    fps: 30,
  },
  longform: {
    type: 'longform',
    aspect: '16:9',
    resolution: [1920, 1080],
    durationSeconds: 600,
    targetScenes: 10,
    minSceneSeconds: 30,
    maxSceneSeconds: 90,
    fps: 30,
  },
};

export type { PipelineType };
