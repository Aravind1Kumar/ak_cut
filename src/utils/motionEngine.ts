import { Clip, Keyframe } from '../types/timeline';

export type MotionPresetType =
  | 'fadeIn'
  | 'fadeOut'
  | 'zoomIn'
  | 'zoomOut'
  | 'panLeft'
  | 'panRight'
  | 'panUp'
  | 'panDown'
  | 'pop'
  | 'bounce';

export function applyMotionPresetToClip(clip: Clip, preset: MotionPresetType): Keyframe[] {
  const duration = Math.min(clip.duration, 1.0);
  const now = Date.now();

  if (preset === 'fadeIn') {
    return [
      { id: `kf-${now}-1`, time: 0, transform: { opacity: 0 }, easing: 'easeOut' },
      { id: `kf-${now}-2`, time: duration, transform: { opacity: 1 }, easing: 'linear' },
    ];
  } else if (preset === 'fadeOut') {
    const startTime = Math.max(0, clip.duration - duration);
    return [
      { id: `kf-${now}-1`, time: startTime, transform: { opacity: 1 }, easing: 'easeIn' },
      { id: `kf-${now}-2`, time: clip.duration, transform: { opacity: 0 }, easing: 'linear' },
    ];
  } else if (preset === 'zoomIn') {
    return [
      { id: `kf-${now}-1`, time: 0, transform: { scale: 0.5, opacity: 0.5 }, easing: 'easeOut' },
      { id: `kf-${now}-2`, time: duration, transform: { scale: 1.0, opacity: 1.0 }, easing: 'linear' },
    ];
  } else if (preset === 'zoomOut') {
    return [
      { id: `kf-${now}-1`, time: 0, transform: { scale: 1.5, opacity: 1.0 }, easing: 'easeOut' },
      { id: `kf-${now}-2`, time: duration, transform: { scale: 1.0, opacity: 1.0 }, easing: 'linear' },
    ];
  } else if (preset === 'panLeft') {
    return [
      { id: `kf-${now}-1`, time: 0, transform: { x: 50 }, easing: 'easeInOut' },
      { id: `kf-${now}-2`, time: duration, transform: { x: 0 }, easing: 'linear' },
    ];
  } else if (preset === 'panRight') {
    return [
      { id: `kf-${now}-1`, time: 0, transform: { x: -50 }, easing: 'easeInOut' },
      { id: `kf-${now}-2`, time: duration, transform: { x: 0 }, easing: 'linear' },
    ];
  } else if (preset === 'pop') {
    return [
      { id: `kf-${now}-1`, time: 0, transform: { scale: 0.2, opacity: 0 }, easing: 'easeOut' },
      { id: `kf-${now}-2`, time: duration * 0.6, transform: { scale: 1.15, opacity: 1.0 }, easing: 'easeInOut' },
      { id: `kf-${now}-3`, time: duration, transform: { scale: 1.0, opacity: 1.0 }, easing: 'linear' },
    ];
  } else if (preset === 'bounce') {
    return [
      { id: `kf-${now}-1`, time: 0, transform: { y: -40, opacity: 0 }, easing: 'easeOut' },
      { id: `kf-${now}-2`, time: duration * 0.5, transform: { y: 10, opacity: 1.0 }, easing: 'easeInOut' },
      { id: `kf-${now}-3`, time: duration, transform: { y: 0, opacity: 1.0 }, easing: 'linear' },
    ];
  }

  return clip.keyframes;
}
