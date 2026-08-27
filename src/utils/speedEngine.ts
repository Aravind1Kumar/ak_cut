import { Clip, SpeedCurveType } from '../types/timeline';

export interface SpeedPoint {
  time: number; // relative time (0.0 to 1.0)
  speed: number; // speed multiplier e.g. 0.5x to 3.0x
}

export const SPEED_CURVE_PRESETS: Record<SpeedCurveType, { name: string; multiplier: number }> = {
  flat: { name: 'Standard (1.0x)', multiplier: 1.0 },
  hero: { name: 'Hero Ramping (1.5x)', multiplier: 1.5 },
  montage: { name: 'Fast Montage (2.0x)', multiplier: 2.0 },
  bulletTime: { name: 'Bullet Time Slow-Mo (0.5x)', multiplier: 0.5 },
  flashOut: { name: 'Flash Out (3.0x)', multiplier: 3.0 },
};

export function calculateEffectiveSpeed(clip: Clip, relativeTime: number): number {
  if (!clip.speedCurve || clip.speedCurve === 'flat') {
    return clip.speed || 1.0;
  }
  const preset = SPEED_CURVE_PRESETS[clip.speedCurve];
  return preset ? preset.multiplier : clip.speed || 1.0;
}
