import { Clip } from '../types/timeline';

function formatVTTTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

export function exportClipsToVTT(clips: Clip[]): string {
  const textAndCaptionClips = clips
    .filter((c) => (c.type === 'text' || c.type === 'caption') && (c.text?.content || c.caption?.text))
    .sort((a, b) => a.startTime - b.startTime);

  let vttContent = 'WEBVTT\n\n';
  textAndCaptionClips.forEach((clip, index) => {
    const text = clip.caption?.text || clip.text?.content || '';
    const startTimeStr = formatVTTTime(clip.startTime);
    const endTimeStr = formatVTTTime(clip.startTime + clip.duration);

    vttContent += `${index + 1}\n${startTimeStr} --> ${endTimeStr}\n${text}\n\n`;
  });

  return vttContent;
}
