import { Clip, Keyframe, TransformProps, FilterProps, AudioProps, KeyframeEasing } from '../types/timeline';

function applyEasing(t: number, easing: KeyframeEasing = 'linear'): number {
  const clampT = Math.max(0, Math.min(1, t));
  switch (easing) {
    case 'easeIn':
      return clampT * clampT * clampT;
    case 'easeOut':
      return 1 - Math.pow(1 - clampT, 3);
    case 'easeInOut':
      return clampT < 0.5 ? 4 * clampT * clampT * clampT : 1 - Math.pow(-2 * clampT + 2, 3) / 2;
    case 'linear':
    default:
      return clampT;
  }
}

function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

export function getInterpolatedTransform(clip: Clip, relativeTime: number): TransformProps {
  const base = clip.transform;
  if (!clip.keyframes || clip.keyframes.length === 0) return base;

  const sorted = [...clip.keyframes].sort((a, b) => a.time - b.time);

  if (relativeTime <= sorted[0].time) {
    return { ...base, ...sorted[0].transform };
  }

  if (relativeTime >= sorted[sorted.length - 1].time) {
    return { ...base, ...sorted[sorted.length - 1].transform };
  }

  let prevKf = sorted[0];
  let nextKf = sorted[sorted.length - 1];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (relativeTime >= sorted[i].time && relativeTime <= sorted[i + 1].time) {
      prevKf = sorted[i];
      nextKf = sorted[i + 1];
      break;
    }
  }

  const duration = nextKf.time - prevKf.time;
  const rawT = duration > 0 ? (relativeTime - prevKf.time) / duration : 0;
  const easedT = applyEasing(rawT, nextKf.easing || 'linear');

  const pTr = prevKf.transform || {};
  const nTr = nextKf.transform || {};

  return {
    ...base,
    x: lerp(pTr.x ?? base.x, nTr.x ?? base.x, easedT),
    y: lerp(pTr.y ?? base.y, nTr.y ?? base.y, easedT),
    scale: lerp(pTr.scale ?? base.scale, nTr.scale ?? base.scale, easedT),
    rotation: lerp(pTr.rotation ?? base.rotation, nTr.rotation ?? base.rotation, easedT),
    opacity: lerp(pTr.opacity ?? base.opacity, nTr.opacity ?? base.opacity, easedT),
    cropTop: lerp(pTr.cropTop ?? base.cropTop ?? 0, nTr.cropTop ?? base.cropTop ?? 0, easedT),
    cropBottom: lerp(pTr.cropBottom ?? base.cropBottom ?? 0, nTr.cropBottom ?? base.cropBottom ?? 0, easedT),
    cropLeft: lerp(pTr.cropLeft ?? base.cropLeft ?? 0, nTr.cropLeft ?? base.cropLeft ?? 0, easedT),
    cropRight: lerp(pTr.cropRight ?? base.cropRight ?? 0, nTr.cropRight ?? base.cropRight ?? 0, easedT),
  };
}

export function getInterpolatedFilter(clip: Clip, relativeTime: number): FilterProps {
  const base = clip.filter;
  if (!clip.keyframes || clip.keyframes.length === 0) return base;

  const sorted = [...clip.keyframes].sort((a, b) => a.time - b.time);

  if (relativeTime <= sorted[0].time) {
    return { ...base, ...(sorted[0].filter || {}) };
  }

  if (relativeTime >= sorted[sorted.length - 1].time) {
    return { ...base, ...(sorted[sorted.length - 1].filter || {}) };
  }

  let prevKf = sorted[0];
  let nextKf = sorted[sorted.length - 1];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (relativeTime >= sorted[i].time && relativeTime <= sorted[i + 1].time) {
      prevKf = sorted[i];
      nextKf = sorted[i + 1];
      break;
    }
  }

  const duration = nextKf.time - prevKf.time;
  const rawT = duration > 0 ? (relativeTime - prevKf.time) / duration : 0;
  const easedT = applyEasing(rawT, nextKf.easing || 'linear');

  const pF = prevKf.filter || {};
  const nF = nextKf.filter || {};

  return {
    ...base,
    brightness: lerp(pF.brightness ?? base.brightness, nF.brightness ?? base.brightness, easedT),
    contrast: lerp(pF.contrast ?? base.contrast, nF.contrast ?? base.contrast, easedT),
    saturation: lerp(pF.saturation ?? base.saturation, nF.saturation ?? base.saturation, easedT),
    blur: lerp(pF.blur ?? base.blur, nF.blur ?? base.blur, easedT),
    hueRotate: lerp(pF.hueRotate ?? base.hueRotate, nF.hueRotate ?? base.hueRotate, easedT),
    sepia: lerp(pF.sepia ?? base.sepia, nF.sepia ?? base.sepia, easedT),
  };
}

export function getInterpolatedAudio(clip: Clip, relativeTime: number): AudioProps {
  const base = clip.audio;
  if (!clip.keyframes || clip.keyframes.length === 0) return base;

  const sorted = [...clip.keyframes].sort((a, b) => a.time - b.time);

  if (relativeTime <= sorted[0].time) {
    return { ...base, ...(sorted[0].audio || {}) };
  }

  if (relativeTime >= sorted[sorted.length - 1].time) {
    return { ...base, ...(sorted[sorted.length - 1].audio || {}) };
  }

  let prevKf = sorted[0];
  let nextKf = sorted[sorted.length - 1];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (relativeTime >= sorted[i].time && relativeTime <= sorted[i + 1].time) {
      prevKf = sorted[i];
      nextKf = sorted[i + 1];
      break;
    }
  }

  const duration = nextKf.time - prevKf.time;
  const rawT = duration > 0 ? (relativeTime - prevKf.time) / duration : 0;
  const easedT = applyEasing(rawT, nextKf.easing || 'linear');

  const pA = prevKf.audio || {};
  const nA = nextKf.audio || {};

  return {
    ...base,
    volume: lerp(pA.volume ?? base.volume, nA.volume ?? base.volume, easedT),
  };
}
