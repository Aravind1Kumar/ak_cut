import { Clip, TransformProps } from '../types/timeline';
import { mapTimelineTimeToSourceTime } from './speedEngine';

// Unified Source/Timeline Time Math function used across Preview, Exporter, Audio & Timeline actions
export function getSourceTimeForTimelineTime(clip: Clip, timelineTime: number): number {
  if (timelineTime < clip.startTime) {
    return clip.mediaOffset || 0;
  }

  const relativeTimelineTime = Math.min(clip.duration, timelineTime - clip.startTime);
  const sourceTime = mapTimelineTimeToSourceTime(clip, relativeTimelineTime);

  const maxSourceTime = (clip.mediaOffset || 0) + (clip.sourceDuration || clip.duration * (clip.speed || 1));
  return Math.max(clip.mediaOffset || 0, Math.min(maxSourceTime, sourceTime));
}

/**
 * Universal Keyframe Interpolation Engine:
 * Computes exact transform, opacity, and scale at any timeline time `timelineTime`.
 */
export function getInterpolatedTransformAtTime(clip: Clip, timelineTime: number): TransformProps {
  const baseTransform: TransformProps = {
    x: clip.transform?.x ?? 0,
    y: clip.transform?.y ?? 0,
    scale: clip.transform?.scale ?? 1,
    rotation: clip.transform?.rotation ?? 0,
    opacity: clip.transform?.opacity ?? 1,
    blendMode: clip.transform?.blendMode ?? 'normal',
    flipHorizontal: clip.transform?.flipHorizontal,
    flipVertical: clip.transform?.flipVertical,
    cropTop: clip.transform?.cropTop,
    cropBottom: clip.transform?.cropBottom,
    cropLeft: clip.transform?.cropLeft,
    cropRight: clip.transform?.cropRight,
  };

  if (!clip.keyframes || clip.keyframes.length === 0) {
    return baseTransform;
  }

  const localTime = Math.max(0, timelineTime - clip.startTime);
  const sorted = [...clip.keyframes].sort((a, b) => a.time - b.time);

  if (localTime <= sorted[0].time) {
    return { ...baseTransform, ...sorted[0].transform };
  }

  if (localTime >= sorted[sorted.length - 1].time) {
    return { ...baseTransform, ...sorted[sorted.length - 1].transform };
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const k1 = sorted[i];
    const k2 = sorted[i + 1];
    if (localTime >= k1.time && localTime <= k2.time) {
      const range = k2.time - k1.time;
      const progress = range > 0 ? (localTime - k1.time) / range : 0;

      const t1 = { ...baseTransform, ...k1.transform };
      const t2 = { ...baseTransform, ...k2.transform };

      return {
        ...baseTransform,
        x: t1.x + (t2.x - t1.x) * progress,
        y: t1.y + (t2.y - t1.y) * progress,
        scale: t1.scale + (t2.scale - t1.scale) * progress,
        rotation: t1.rotation + (t2.rotation - t1.rotation) * progress,
        opacity: t1.opacity + (t2.opacity - t1.opacity) * progress,
      };
    }
  }

  return baseTransform;
}

/**
 * Slip Edit: Adjusts mediaOffset without changing clip startTime or duration.
 */
export function slipClip(clip: Clip, offsetDelta: number): Clip {
  const maxMediaOffset = Math.max(0, (clip.sourceDuration || 100) - clip.duration);
  const newOffset = Math.max(0, Math.min(maxMediaOffset, (clip.mediaOffset || 0) + offsetDelta));
  return {
    ...clip,
    mediaOffset: newOffset,
  };
}

/**
 * Slide Edit: Moves clip startTime while adjusting neighboring clips to maintain overall timeline duration.
 */
export function slideClip(clips: Clip[], targetClipId: string, timeDelta: number): Clip[] {
  const targetIndex = clips.findIndex((c) => c.id === targetClipId);
  if (targetIndex === -1) return clips;

  const target = clips[targetIndex];
  const prev = targetIndex > 0 ? clips[targetIndex - 1] : null;
  const next = targetIndex < clips.length - 1 ? clips[targetIndex + 1] : null;

  let actualDelta = timeDelta;
  if (prev) {
    const minDuration = 0.1;
    const maxPrevExpansion = prev.duration - minDuration;
    if (actualDelta < -maxPrevExpansion) actualDelta = -maxPrevExpansion;
  }
  if (next) {
    const minDuration = 0.1;
    const maxNextExpansion = next.duration - minDuration;
    if (actualDelta > maxNextExpansion) actualDelta = maxNextExpansion;
  }

  return clips.map((c, idx) => {
    if (idx === targetIndex - 1 && prev) {
      return { ...prev, duration: Math.max(0.1, prev.duration + actualDelta) };
    }
    if (idx === targetIndex) {
      return { ...target, startTime: target.startTime + actualDelta };
    }
    if (idx === targetIndex + 1 && next) {
      return {
        ...next,
        startTime: next.startTime + actualDelta,
        duration: Math.max(0.1, next.duration - actualDelta),
        mediaOffset: (next.mediaOffset || 0) + actualDelta,
      };
    }
    return c;
  });
}

/**
 * Roll Edit: Adjusts the boundary between two adjacent clips.
 */
export function rollEdit(leftClip: Clip, rightClip: Clip, delta: number): { left: Clip; right: Clip } {
  const minDuration = 0.1;
  const maxLeftIncrease = (rightClip.duration - minDuration);
  const maxRightIncrease = (leftClip.duration - minDuration);

  const clampedDelta = Math.max(-maxRightIncrease, Math.min(maxLeftIncrease, delta));

  const updatedLeft: Clip = {
    ...leftClip,
    duration: Math.max(minDuration, leftClip.duration + clampedDelta),
  };

  const updatedRight: Clip = {
    ...rightClip,
    startTime: rightClip.startTime + clampedDelta,
    duration: Math.max(minDuration, rightClip.duration - clampedDelta),
    mediaOffset: Math.max(0, (rightClip.mediaOffset || 0) + clampedDelta),
  };

  return { left: updatedLeft, right: updatedRight };
}

/**
 * Insert Edit: Places clip at target position and shifts all downstream clips to the right.
 */
export function insertClip(clips: Clip[], newClip: Clip): Clip[] {
  const targetStart = newClip.startTime;
  const insertDur = newClip.duration;

  const updatedClips = clips.map((c) => {
    if (c.startTime >= targetStart) {
      return { ...c, startTime: c.startTime + insertDur };
    }
    return c;
  });

  return [...updatedClips, newClip].sort((a, b) => a.startTime - b.startTime);
}

/**
 * Overwrite Edit: Places clip at target range, truncating or removing occupied clip ranges.
 */
export function overwriteClip(clips: Clip[], newClip: Clip): Clip[] {
  const oStart = newClip.startTime;
  const oEnd = oStart + newClip.duration;

  const result: Clip[] = [];

  for (const c of clips) {
    const cStart = c.startTime;
    const cEnd = c.startTime + c.duration;

    if (cStart >= oStart && cEnd <= oEnd) {
      continue;
    }

    if (oStart <= cStart && oEnd > cStart && oEnd < cEnd) {
      const trimAmount = oEnd - cStart;
      result.push({
        ...c,
        startTime: oEnd,
        duration: c.duration - trimAmount,
        mediaOffset: (c.mediaOffset || 0) + trimAmount,
      });
      continue;
    }

    if (cStart < oStart && cEnd > oStart && cEnd <= oEnd) {
      result.push({
        ...c,
        duration: oStart - cStart,
      });
      continue;
    }

    if (cStart < oStart && cEnd > oEnd) {
      const leftPart: Clip = {
        ...c,
        duration: oStart - cStart,
      };
      const rightPart: Clip = {
        ...c,
        id: `${c.id}-right-${Date.now()}`,
        startTime: oEnd,
        duration: cEnd - oEnd,
        mediaOffset: (c.mediaOffset || 0) + (oEnd - cStart),
      };
      result.push(leftPart, rightPart);
      continue;
    }

    result.push(c);
  }

  result.push(newClip);
  return result.sort((a, b) => a.startTime - b.startTime);
}
