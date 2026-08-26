import { Clip } from '../types/timeline';

function formatSRTTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
}

export function exportClipsToSRT(clips: Clip[]): string {
  const textAndCaptionClips = clips
    .filter((c) => (c.type === 'text' || c.type === 'caption') && (c.text?.content || c.caption?.text))
    .sort((a, b) => a.startTime - b.startTime);

  let srtContent = '';
  textAndCaptionClips.forEach((clip, index) => {
    const text = clip.caption?.text || clip.text?.content || '';
    const startTimeStr = formatSRTTime(clip.startTime);
    const endTimeStr = formatSRTTime(clip.startTime + clip.duration);

    srtContent += `${index + 1}\n${startTimeStr} --> ${endTimeStr}\n${text}\n\n`;
  });

  return srtContent;
}
