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

