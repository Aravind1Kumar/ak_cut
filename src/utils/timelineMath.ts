import { Clip } from '../types/timeline';

// Unified Source/Timeline Time Math function used across Preview, Exporter, Audio & Timeline actions
export function getSourceTimeForTimelineTime(clip: Clip, timelineTime: number): number {
  if (timelineTime < clip.startTime) {
    return clip.mediaOffset;
  }

  const relativeTimelineTime = timelineTime - clip.startTime;
  const speed = clip.speed || 1;
  const sourceTime = clip.mediaOffset + relativeTimelineTime * speed;

  const maxSourceTime = clip.mediaOffset + (clip.sourceDuration || clip.duration * speed);
  return Math.max(clip.mediaOffset, Math.min(maxSourceTime, sourceTime));
}
