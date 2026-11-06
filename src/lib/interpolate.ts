import { interpolate, spring } from 'remotion';

/**
 * Remotion's interpolate() keyed on a 0..1 progress value instead of a frame
 * range. Handy inside scene components driven by useActiveScene().
 */
export const progressTo = (
  progress: number,
  values: number[],
  options?: Parameters<typeof interpolate>[3],
): number => interpolate(progress, [0, 1], values, options);

/**
 * Gentle hand-drawn jitter. Returns a small stable pseudo-random offset in
 * [-amount, +amount] for a given seed, so static elements don't shimmer.
 */
export const handJitter = (seed: number, time: number, amount = 1.5): number => {
  const t = time * 0.002 + seed * 137.5;
  return ((Math.sin(t * 12.9898) * 43758.5453123) % 1 - 0.5) * amount;
};

/**
 * A spring config that feels "drawn by hand": slightly under-damped, organic.
 */
export const handSpring = (
  frame: number,
  fps: number,
  overrides: { damping?: number; stiffness?: number } = {},
) =>
  spring({ frame, fps, config: { damping: 18, stiffness: 140, ...overrides } });
