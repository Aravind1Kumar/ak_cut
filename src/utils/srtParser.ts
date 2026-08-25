export interface SRTSubtitle {
  id: number;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
}

// Convert "00:01:23,456" into seconds
export function parseSRTTimecode(timecode: string): number {
  const match = timecode.trim().match(/(\d+):(\d+):(\d+)[.,](\d+)/);
  if (!match) return 0;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const milliseconds = parseInt(match[4].padEnd(3, '0').slice(0, 3), 10);
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

// Convert seconds into "00:01:23,456"
export function formatSRTTimecode(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const ms = Math.floor((totalSeconds % 1) * 1000);

  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');
  const mmm = ms.toString().padStart(3, '0');

  return `${hh}:${mm}:${ss},${mmm}`;
}

// Parse entire .srt file string into array of subtitles
export function parseSRT(srtContent: string): SRTSubtitle[] {
  const blocks = srtContent.trim().replace(/\r\n/g, '\n').split(/\n\n+/);
  const subtitles: SRTSubtitle[] = [];

  blocks.forEach((block, index) => {
    const lines = block.split('\n');
    if (lines.length >= 2) {
      const timeLineIndex = lines[0].includes('-->') ? 0 : 1;
      const timeLine = lines[timeLineIndex];
      const textLines = lines.slice(timeLineIndex + 1).join('\n');

      if (timeLine && timeLine.includes('-->')) {
        const [startStr, endStr] = timeLine.split('-->');
        const startTime = parseSRTTimecode(startStr);
        const endTime = parseSRTTimecode(endStr);

        if (endTime > startTime) {
          subtitles.push({
            id: index + 1,
            startTime,
            endTime,
            text: textLines.replace(/<[^>]*>/g, '').trim(),
          });
        }
      }
    }
  });

  return subtitles;
}

// Export array of subtitles back into .srt string format
export function exportSRT(subtitles: { startTime: number; duration: number; text: string }[]): string {
  return subtitles
    .map((sub, idx) => {
      const start = formatSRTTimecode(sub.startTime);
      const end = formatSRTTimecode(sub.startTime + sub.duration);
      return `${idx + 1}\n${start} --> ${end}\n${sub.text}\n`;
    })
    .join('\n');
}
