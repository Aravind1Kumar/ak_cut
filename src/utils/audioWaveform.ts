const waveformCache = new Map<string, number[]>();

export async function extractAudioPeaks(audioUrl: string, samplesCount = 100): Promise<number[]> {
  if (waveformCache.has(audioUrl)) {
    return waveformCache.get(audioUrl)!;
  }

  try {
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const channelData = audioBuffer.getChannelData(0); // Left channel
    const step = Math.floor(channelData.length / samplesCount);
    const peaks: number[] = [];

    for (let i = 0; i < samplesCount; i++) {
      const start = i * step;
      let max = 0;
      for (let j = 0; j < step; j += 10) { // Sample every 10th item for speed
        const val = Math.abs(channelData[start + j] || 0);
        if (val > max) max = val;
      }
      peaks.push(max);
    }

    // Normalize peaks to range 0.1 -> 1.0
    const maxPeak = Math.max(...peaks, 0.01);
    const normalizedPeaks = peaks.map((p) => Math.max(0.1, p / maxPeak));

    waveformCache.set(audioUrl, normalizedPeaks);
    audioContext.close();
    return normalizedPeaks;
  } catch (e) {
    // Fallback pseudo-peaks if audio decoding fails
    const fallbackPeaks = Array.from({ length: samplesCount }, () => 0.2 + Math.random() * 0.6);
    waveformCache.set(audioUrl, fallbackPeaks);
    return fallbackPeaks;
  }
}
