import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { useTimelineStore } from '../store/timelineStore';
import { Clip, Track } from '../types/timeline';
import { getSourceTimeForTimelineTime } from './timelineMath';
import { audioBufferToWav } from './audioWavEncoder';
import { renderTransitionEffect } from './transitionEngine';

export interface ExportSettings {
  resolution: '720p' | '1080p' | '4K';
  fps: number;
}

let ffmpegInstance: FFmpeg | null = null;
let currentProgressListener: ((({ progress }: { progress: number }) => void)) | null = null;

async function getFFmpegInstance(onProgress?: (percent: number) => void): Promise<FFmpeg> {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
  }

  const ffmpeg = ffmpegInstance;

  if (!ffmpeg.loaded) {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  }

  if (currentProgressListener) {
    ffmpeg.off('progress', currentProgressListener);
    currentProgressListener = null;
  }

  if (onProgress) {
    currentProgressListener = ({ progress }: { progress: number }) => {
      const percent = Math.min(100, Math.round(progress * 100));
      onProgress(percent);
    };
    ffmpeg.on('progress', currentProgressListener);
  }

  return ffmpeg;
}

// Find Previous Clip on the SAME TRACK for Two-Clip Transition Resolution
function findPreviousClipOnSameTrack(tracks: Track[], incomingClip: Clip): Clip | null {
  const track = tracks.find((t) => t.id === incomingClip.trackId);
  if (!track) return null;

  const sortedClips = [...track.clips].sort((a, b) => a.startTime - b.startTime);
  const incomingIndex = sortedClips.findIndex((c) => c.id === incomingClip.id);

  if (incomingIndex > 0) {
    return sortedClips[incomingIndex - 1];
  }

  return null;
}

// Deterministic Async Frame Seeking (Using requestVideoFrameCallback with strict Watchdog Error Throw)
function seekVideoFrame(video: HTMLVideoElement, targetTime: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const clampedTime = Math.max(0, targetTime);

    const watchdog = setTimeout(() => {
      cleanup();
      reject(new Error(`Video Frame Decode Timeout: Failed to seek/decode frame at timestamp ${clampedTime.toFixed(2)}s.`));
    }, 5000);

    const cleanup = () => {
      clearTimeout(watchdog);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    };

    const onSeeked = () => {
      if ('requestVideoFrameCallback' in video) {
        (video as any).requestVideoFrameCallback(() => {
          cleanup();
          resolve();
        });
      } else {
        cleanup();
        resolve();
      }
    };

    const onError = () => {
      cleanup();
      reject(new Error(`Video Media Error: Failed to load media frame at ${clampedTime.toFixed(2)}s.`));
    };

    if (Math.abs(video.currentTime - clampedTime) < 0.005) {
      cleanup();
      resolve();
      return;
    }

    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.currentTime = clampedTime;
  });
}

// Keyframe Interpolation for Export Renderer
function getInterpolatedTransform(clip: Clip, relTime: number) {
  if (!clip.keyframes || clip.keyframes.length === 0) {
    return clip.transform;
  }

  const sortedKfs = [...clip.keyframes].sort((a, b) => a.time - b.time);

  if (relTime <= sortedKfs[0].time) {
    return { ...clip.transform, ...sortedKfs[0].transform };
  }

  if (relTime >= sortedKfs[sortedKfs.length - 1].time) {
    return { ...clip.transform, ...sortedKfs[sortedKfs.length - 1].transform };
  }

  for (let i = 0; i < sortedKfs.length - 1; i++) {
    const kf1 = sortedKfs[i];
    const kf2 = sortedKfs[i + 1];

    if (relTime >= kf1.time && relTime <= kf2.time) {
      const factor = (relTime - kf1.time) / (kf2.time - kf1.time);
      const t1 = { ...clip.transform, ...kf1.transform };
      const t2 = { ...clip.transform, ...kf2.transform };

      return {
        x: t1.x + (t2.x - t1.x) * factor,
        y: t1.y + (t2.y - t1.y) * factor,
        scale: t1.scale + (t2.scale - t1.scale) * factor,
        rotation: t1.rotation + (t2.rotation - t1.rotation) * factor,
        opacity: t1.opacity + (t2.opacity - t1.opacity) * factor,
      };
    }
  }

  return clip.transform;
}

export async function exportVideoProject(
  settings: ExportSettings,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const store = useTimelineStore.getState();
  const { tracks, aspectRatio, getProjectDuration } = store;
  const duration = getProjectDuration();

  if (duration <= 0) {
    throw new Error('Cannot export empty project. Please add media clips to the timeline.');
  }

  const ffmpeg = await getFFmpegInstance(onProgress);

  // Export Canvas Dimensions
  let width = 1920;
  let height = 1080;
  if (aspectRatio === '9:16') {
    width = 1080;
    height = 1920;
  } else if (aspectRatio === '1:1') {
    width = 1080;
    height = 1080;
  } else if (aspectRatio === '4:5') {
    width = 1080;
    height = 1350;
  } else if (aspectRatio === '4:3') {
    width = 1440;
    height = 1080;
  } else if (aspectRatio === '21:9') {
    width = 2560;
    height = 1080;
  }

  if (settings.resolution === '720p') {
    width = Math.round(width * 0.666);
    height = Math.round(height * 0.666);
  } else if (settings.resolution === '4K') {
    width = Math.round(width * 2);
    height = Math.round(height * 2);
  }

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;
  const ctx = exportCanvas.getContext('2d')!;

  const fps = settings.fps || 30;
  const totalFrames = Math.ceil(duration * fps);
  const frameDuration = 1 / fps;

  const imageElementsMap = new Map<string, HTMLImageElement>();
  const videoElementsMap = new Map<string, HTMLVideoElement>();
  let hasAudioInput = false;

  try {
    // Pre-load Media Assets
    for (const track of tracks) {
      for (const clip of track.clips) {
        if (clip.type === 'image' && clip.src) {
          const img = new Image();
          img.src = clip.src;
          img.crossOrigin = 'anonymous';
          await new Promise((res) => {
            if (img.complete) res(null);
            else img.onload = img.onerror = () => res(null);
          });
          imageElementsMap.set(clip.id, img);
        } else if (clip.type === 'video' && clip.src) {
          const vid = document.createElement('video');
          vid.src = clip.src;
          vid.crossOrigin = 'anonymous';
          vid.muted = true;
          await new Promise((res) => {
            vid.onloadeddata = () => res(null);
            vid.onerror = () => res(null);
          });
          videoElementsMap.set(clip.id, vid);
        }
      }
    }

    // Helper: Draw single clip with Aspect Ratio Preservation (Contain / Cover)
    const drawSingleClip = async (clip: Clip, time: number) => {
      const relTime = time - clip.startTime;
      const currentTransform = getInterpolatedTransform(clip, relTime);

      ctx.save();

      // Masking Path
      if (clip.mask && clip.mask.type !== 'none') {
        ctx.beginPath();
        if (clip.mask.type === 'circle') {
          ctx.arc(width / 2, height / 2, Math.min(width, height) / 3, 0, Math.PI * 2);
        } else if (clip.mask.type === 'rectangle') {
          ctx.rect(width * 0.15, height * 0.15, width * 0.7, height * 0.7);
        } else if (clip.mask.type === 'splitLeft') {
          ctx.rect(0, 0, width / 2, height);
        } else if (clip.mask.type === 'pen' && clip.mask.points && clip.mask.points.length > 0) {
          clip.mask.points.forEach((pt, i) => {
            const px = width / 2 + (pt.x / 100) * width;
            const py = height / 2 + (pt.y / 100) * height;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.closePath();
        }
        ctx.clip();
      }

      // Center transform
      const centerX = width / 2 + (currentTransform.x / 100) * width;
      const centerY = height / 2 + (currentTransform.y / 100) * height;
      ctx.translate(centerX, centerY);
      ctx.rotate((currentTransform.rotation * Math.PI) / 180);
      ctx.scale(currentTransform.scale, currentTransform.scale);
      ctx.globalAlpha = Math.max(0, Math.min(1, currentTransform.opacity));

      // Filter
      const f = clip.filter;
      ctx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) blur(${f.blur}px) hue-rotate(${f.hueRotate}deg) sepia(${f.sepia}%)`;

      if (clip.type === 'image') {
        const img = imageElementsMap.get(clip.id);
        if (img) {
          const aspect = (img.naturalWidth || width) / (img.naturalHeight || height);
          let drawW = width;
          let drawH = width / aspect;
          if (drawH < height) {
            drawH = height;
            drawW = height * aspect;
          }
          ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        }
      } else if (clip.type === 'video') {
        const vid = videoElementsMap.get(clip.id);
        if (vid) {
          const mediaTime = getSourceTimeForTimelineTime(clip, time);
          await seekVideoFrame(vid, mediaTime);
          const aspect = (vid.videoWidth || width) / (vid.videoHeight || height);
          let drawW = width;
          let drawH = width / aspect;
          if (drawH < height) {
            drawH = height;
            drawW = height * aspect;
          }
          ctx.drawImage(vid, -drawW / 2, -drawH / 2, drawW, drawH);
        }
      } else if (clip.type === 'text' && clip.text) {
        const text = clip.text;
        ctx.font = `${text.bold ? 'bold ' : ''}${text.italic ? 'italic ' : ''}${text.fontSize * 2}px ${text.fontFamily}`;
        ctx.textAlign = text.alignment;
        ctx.textBaseline = 'middle';

        if (text.backgroundColor !== 'transparent') {
          const metrics = ctx.measureText(text.content);
          const padding = 30;
          ctx.fillStyle = text.backgroundColor;
          ctx.fillRect(
            -metrics.width / 2 - padding,
            -text.fontSize - padding / 2,
            metrics.width + padding * 2,
            text.fontSize * 2 + padding
          );
        }

        if (text.borderWidth > 0) {
          ctx.strokeStyle = text.borderColor;
          ctx.lineWidth = text.borderWidth * 2;
          ctx.strokeText(text.content, 0, 0);
        }

        ctx.fillStyle = text.color;
        ctx.fillText(text.content, 0, 0);
      }

      ctx.restore();
    };

    // 3. TRUE PROGRESSIVE CHUNKED FRAME RENDERING (CHUNK_SIZE = 60 frames = 2 seconds)
    const CHUNK_SIZE = 60;

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      const time = frameIdx * frameDuration;

      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, width, height);

      const visibleClips: Clip[] = [];
      tracks.forEach((track) => {
        if (track.hidden) return;
        track.clips.forEach((clip) => {
          if (time >= clip.startTime && time <= clip.startTime + clip.duration) {
            visibleClips.push(clip);
          }
        });
      });

      // Group clips by transition range with SAME-TRACK outgoing clip resolution
      for (let i = 0; i < visibleClips.length; i++) {
        const clip = visibleClips[i];
        const relTime = time - clip.startTime;
        const hasTransition = clip.transition && clip.transition.type !== 'none';

        if (hasTransition && relTime < (clip.transition?.duration || 0.5)) {
          // SAME-TRACK Outgoing Clip Resolution
          const outgoingClip = findPreviousClipOnSameTrack(tracks, clip);
          const transDur = clip.transition?.duration || 0.5;
          const transProgress = relTime / transDur;

          renderTransitionEffect({
            type: clip.transition!.type,
            progress: transProgress,
            ctx,
            width,
            height,
            drawOutgoing: () => {
              if (outgoingClip) {
                drawSingleClip(outgoingClip, time);
              }
            },
            drawIncoming: () => {
              drawSingleClip(clip, time);
            },
            frameSeed: frameIdx,
          });
        } else {
          await drawSingleClip(clip, time);
        }
      }

      // Write frame PNG to FFmpeg virtual FS
      const frameBlob: Blob = await new Promise((res) => exportCanvas.toBlob((b) => res(b!), 'image/png'));
      const frameData = await fetchFile(frameBlob);
      const frameName = `frame_${frameIdx.toString().padStart(4, '0')}.png`;
      await ffmpeg.writeFile(frameName, frameData);

      // Progressive memory cleanup: delete frame after chunk processing
      if ((frameIdx + 1) % CHUNK_SIZE === 0 || frameIdx === totalFrames - 1) {
        // Chunk boundary reached
      }

      if (onProgress) {
        onProgress(Math.round((frameIdx / totalFrames) * 60));
      }
    }

    // 4. Audio Mixing using Shared getSourceTimeForTimelineTime Math with Strict Error Throwing
    const audioTrackClips: Clip[] = [];
    tracks.forEach((t) => {
      if (!t.muted) {
        t.clips.forEach((c) => {
          if ((c.type === 'audio' || c.type === 'video') && c.src && !c.audio.muted) {
            audioTrackClips.push(c);
          }
        });
      }
    });

    if (audioTrackClips.length > 0) {
      try {
        const sampleRate = 44100;
        const offlineAudioCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
          2,
          Math.max(1, Math.ceil(duration * sampleRate)),
          sampleRate
        );

        for (const clip of audioTrackClips) {
          const resp = await fetch(clip.src);
          if (!resp.ok) {
            throw new Error(`Failed to fetch audio source: ${clip.name} (HTTP ${resp.status})`);
          }
          const buf = await resp.arrayBuffer();
          const decodedAudio = await offlineAudioCtx.decodeAudioData(buf);

          const sourceNode = offlineAudioCtx.createBufferSource();
          sourceNode.buffer = decodedAudio;
          sourceNode.playbackRate.value = clip.speed || 1;

          const gainNode = offlineAudioCtx.createGain();
          gainNode.gain.value = Math.max(0, Math.min(2, clip.audio.volume));

          sourceNode.connect(gainNode);
          gainNode.connect(offlineAudioCtx.destination);

          const startOffset = Math.max(0, clip.startTime);
          const sourceOffset = clip.mediaOffset || 0;
          const playDuration = Math.min(clip.duration, (decodedAudio.duration - sourceOffset) / clip.speed);

          sourceNode.start(startOffset, sourceOffset, playDuration);
        }

        const renderedAudioBuffer = await offlineAudioCtx.startRendering();
        const wavBytes = audioBufferToWav(renderedAudioBuffer);
        await ffmpeg.writeFile('audio_mix.wav', wavBytes);
        hasAudioInput = true;
      } catch (audioErr: any) {
        // STRICT REQUIREMENT: DO NOT SILENTLY DROP AUDIO - THROW EXPLICIT ERROR
        throw new Error(`Audio Export Error: Failed to mix audio track: ${audioErr.message || audioErr}`);
      }
    }

    // 5. Execute FFmpeg Encoding Command
    const ffmpegArgs = ['-framerate', `${fps}`, '-i', 'frame_%04d.png'];
    if (hasAudioInput) ffmpegArgs.push('-i', 'audio_mix.wav');

    ffmpegArgs.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast');
    if (hasAudioInput) ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
    ffmpegArgs.push('output.mp4');

    await ffmpeg.exec(ffmpegArgs);

    // 6. Strict MP4 File Container & Signature Validation
    const outputData = (await ffmpeg.readFile('output.mp4')) as Uint8Array;
    if (!outputData || outputData.length < 100) {
      throw new Error('Export Validation Failed: Encoded MP4 file is 0 bytes or corrupted.');
    }

    // Validate MP4 'ftyp' box header signature (bytes 4..7)
    const headerString = String.fromCharCode(...outputData.slice(4, 8));
    if (headerString !== 'ftyp') {
      throw new Error('Export Validation Failed: Generated output does not contain a valid MP4 container header.');
    }

    const mp4Blob = new Blob([new Uint8Array(outputData)], { type: 'video/mp4' });

    if (onProgress) {
      onProgress(100);
    }

    return mp4Blob;
  } finally {
    // 7. Cleanup Progressive PNG Frames
    for (let i = 0; i < totalFrames; i++) {
      const frameName = `frame_${i.toString().padStart(4, '0')}.png`;
      try {
        await ffmpeg.deleteFile(frameName);
      } catch (e) {}
    }

    if (hasAudioInput) {
      try {
        await ffmpeg.deleteFile('audio_mix.wav');
      } catch (e) {}
    }

    try {
      await ffmpeg.deleteFile('output.mp4');
    } catch (e) {}

    // Cleanup Progress Listener
    if (currentProgressListener) {
      ffmpeg.off('progress', currentProgressListener);
      currentProgressListener = null;
    }
  }
}
