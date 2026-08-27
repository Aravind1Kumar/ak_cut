import { Clip } from '../types/timeline';

export async function normalizeClipAudioGain(clip: Clip): Promise<number> {
  if (!clip.src || clip.type !== 'audio' && clip.type !== 'video') return 1.0;

  try {
    const response = await fetch(clip.src);
    const arrayBuffer = await response.arrayBuffer();

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    let maxPeak = 0;
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        const abs = Math.abs(channelData[i]);
        if (abs > maxPeak) {
          maxPeak = abs;
        }
      }
    }

    audioCtx.close();

    if (maxPeak > 0) {
      // Target peak = 0.95 (-0.45 dBFS) to prevent clipping
      const normalizedGain = Math.min(2.0, Math.max(0.1, 0.95 / maxPeak));
      return parseFloat(normalizedGain.toFixed(2));
    }
    return 1.0;
  } catch (e) {
    console.warn(`Failed to normalize audio for clip "${clip.name}":`, e);
    return 1.0;
  }
}
