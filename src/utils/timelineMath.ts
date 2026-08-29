import { Clip } from '../types/timeline';
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
        mediaOffset: Math.max(0, (next.mediaOffset || 0) + actualDelta),
      };
    }
    return c;
  });
}

/**
 * Roll Edit: Moves boundary between two adjacent clips without altering sequence duration.
 */
export function rollEdit(leftClip: Clip, rightClip: Clip, delta: number): { left: Clip; right: Clip } {
  const minDuration = 0.1;
  const maxLeftDelta = rightClip.duration - minDuration;
  const maxRightDelta = leftClip.duration - minDuration;
  const clampedDelta = Math.max(-maxRightDelta, Math.min(maxLeftDelta, delta));

  return {
    left: {
      ...leftClip,
      duration: Math.max(minDuration, leftClip.duration + clampedDelta),
    },
    right: {
      ...rightClip,
      startTime: rightClip.startTime + clampedDelta,
      duration: Math.max(minDuration, rightClip.duration - clampedDelta),
      mediaOffset: Math.max(0, (rightClip.mediaOffset || 0) + clampedDelta),
    },
  };
}

/**
 * Insert Edit: Inserts a new clip at target startTime and shifts downstream clips forward.
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

    // Completely covered -> remove
    if (cStart >= oStart && cEnd <= oEnd) {
      continue;
    }

    // Overlaps start of existing clip
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

    // Overlaps end of existing clip
    if (cStart < oStart && cEnd > oStart && cEnd <= oEnd) {
      result.push({
        ...c,
        duration: oStart - cStart,
      });
      continue;
    }

    // Overwrites middle of existing clip (splits into left and right)
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

    // No overlap
    result.push(c);
  }

  result.push(newClip);
  return result.sort((a, b) => a.startTime - b.startTime);
}
