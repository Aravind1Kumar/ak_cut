import { Clip } from '../types/timeline';
import { audioBufferToWav } from './audioWavEncoder';

/**
 * Extracts clean 16kHz PCM WAV Audio Blob from a video or audio clip for speech transcription.
 * Does NOT modify original media Blob.
 */
export async function extractAudioFromClip(clip: Clip): Promise<Blob> {
  if (!clip.src) {
    throw new Error(`Clip "${clip.name}" has no valid audio source.`);
  }

  const response = await fetch(clip.src);
  if (!response.ok) {
    throw new Error(`Failed to fetch media source for audio extraction: ${clip.name}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  const targetSampleRate = 16000;
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  const duration = clip.duration;
  const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
    1,
    Math.max(1, Math.ceil(duration * targetSampleRate)),
    targetSampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0, clip.mediaOffset, duration);

  const renderedBuffer = await offlineCtx.startRendering();
  const wavArrayBuffer = audioBufferToWav(renderedBuffer);

  return new Blob([wavArrayBuffer.buffer as ArrayBuffer], { type: 'audio/wav' });
}
