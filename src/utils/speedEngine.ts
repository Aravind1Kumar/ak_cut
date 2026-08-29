import { Clip, SpeedCurveType } from '../types/timeline';

export interface SpeedPoint {
  time: number; // relative time (0.0 to 1.0)
  speed: number; // speed multiplier e.g. 0.5x to 3.0x
}

export const SPEED_CURVE_PRESETS: Record<SpeedCurveType, { name: string; multiplier: number; getSpeedAtRatio: (ratio: number) => number }> = {
  flat: {
    name: 'Standard (1.0x)',
    multiplier: 1.0,
    getSpeedAtRatio: () => 1.0,
  },
  hero: {
    name: 'Hero Ramping (0.5x - 2.5x)',
    multiplier: 1.5,
    getSpeedAtRatio: (r: number) => (r < 0.3 ? 0.5 : r < 0.7 ? 2.5 : 0.8),
  },
  montage: {
    name: 'Fast Montage (1.5x - 3.0x)',
    multiplier: 2.0,
    getSpeedAtRatio: (r: number) => (r < 0.5 ? 1.5 : 3.0),
  },
  bulletTime: {
    name: 'Bullet Time Slow-Mo (0.25x - 1.0x)',
    multiplier: 0.5,
    getSpeedAtRatio: (r: number) => (r > 0.3 && r < 0.7 ? 0.25 : 1.0),
  },
  flashOut: {
    name: 'Flash Out (1.0x - 4.0x)',
    multiplier: 2.5,
    getSpeedAtRatio: (r: number) => (r > 0.6 ? 4.0 : 1.0),
  },
};

export function calculateEffectiveSpeed(clip: Clip, relativeRatio: number): number {
  const baseSpeed = clip.speed || 1.0;
  if (!clip.speedCurve || clip.speedCurve === 'flat') {
    return baseSpeed;
  }
  const preset = SPEED_CURVE_PRESETS[clip.speedCurve];
  const curveFactor = preset ? preset.getSpeedAtRatio(relativeRatio) : 1.0;
  return baseSpeed * curveFactor;
}

/**
 * Canonical speed mapping function: maps local timeline offset (0 to clip.duration)
 * to exact source media offset (seconds relative to clip.mediaOffset).
 */
export function mapTimelineTimeToSourceTime(clip: Clip, localTimelineTime: number): number {
  const baseOffset = clip.mediaOffset || 0;
  const clipDur = Math.max(0.01, clip.duration);
  const clampedLocalTime = Math.max(0, Math.min(localTimelineTime, clipDur));

  if (!clip.speedCurve || clip.speedCurve === 'flat') {
    const speed = clip.speed || 1.0;
    return baseOffset + clampedLocalTime * speed;
  }

  // Numerical integration over steps for curve accuracy
  const steps = 100;
  const stepDt = clampedLocalTime / steps;
  let accumulatedSourceTime = 0;

  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) * stepDt;
    const ratio = Math.min(1.0, Math.max(0.0, t / clipDur));
    const speedAtT = calculateEffectiveSpeed(clip, ratio);
    accumulatedSourceTime += stepDt * speedAtT;
  }

  return baseOffset + accumulatedSourceTime;
}

