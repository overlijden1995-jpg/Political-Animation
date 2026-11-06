import { useCallback, useEffect, useRef } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { SceneVisuals } from '../agents/types';


/** A single scene in a video script. */
export interface Scene {
  id: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds (exclusive) */
  end: number;
  /** Human readable label for the producer */
  label: string;
  /** Optional background color key from the theme */
  background?: string;
  /** Optional overlay: 'paper' | 'grid' | 'none' */
  overlay?: 'paper' | 'grid' | 'none';
  /** Spoken narration for this scene (used for captions/voiceover) */
  narration?: string;
  /** Visual direction assigned by the storyboard agent */
  visuals?: SceneVisuals;
}

/** Convert seconds to frames given the composition FPS. */
export const secondsToFrames = (seconds: number, fps: number) => Math.round(seconds * fps);

/** Convert frames to seconds. */
export const framesToSeconds = (frames: number, fps: number) => frames / fps;

/**
 * Hook: given the ordered scenes of a video, returns the currently active
 * scene and its local progress (0..1) based on the Remotion playhead.
 */
export function useActiveScene(scenes: Scene[]) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = framesToSeconds(frame, fps);

  const active = scenes.find((s) => time >= s.start && time < s.end) ?? scenes[scenes.length - 1];
  const progress = active
    ? Math.min(Math.max((time - active.start) / Math.max(active.end - active.start, 0.001), 0), 1)
    : 0;

  return { active, progress, time, frame, fps };
}

/**
 * Hook: fires onEnter / onExit callbacks when the playhead crosses a scene
 * boundary. Useful for swapping maps, charts or illustrations per scene.
 */
export function useSceneEvents(
  scenes: Scene[],
  callbacks: { onEnter?: (sceneId: string) => void; onExit?: (sceneId: string) => void },
) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = framesToSeconds(frame, fps);
  const prev = useRef<string | null>(null);

  const active = scenes.find((s) => time >= s.start && time < s.end) ?? null;

  const handleChange = useCallback(
    (next: string | null) => {
      if (prev.current && next !== prev.current) {
        callbacks.onExit?.(prev.current);
      }
      if (next && next !== prev.current) {
        callbacks.onEnter?.(next);
      }
      prev.current = next;
    },
    [callbacks],
  );

  useEffect(() => {
    handleChange(active ? active.id : null);
  }, [time, active?.id, handleChange]);

  return {
    active,
    progress: active ? Math.min(Math.max((time - active.start) / Math.max(active.end - active.start, 0.001), 0), 1) : 0,
    time,
    frame,
    fps,
  };
}
