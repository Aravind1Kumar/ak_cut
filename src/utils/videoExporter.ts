import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { useTimelineStore } from '../store/timelineStore';
import { Clip } from '../types/timeline';
import { renderTransitionEffect, findPreviousClipOnSameTrack } from './transitionEngine';
import { renderCaption, DEFAULT_CAPTION_STYLES } from './captionEngine';
import { buildCSSFilterString, renderPostProcessingEffects } from './filterEngine';
import { audioBufferToWav } from './audioWavEncoder';
import { getSourceTimeForTimelineTime } from './timelineMath';

export interface ExportSettings {
  resolution: '720p' | '1080p';
  fps: number;
  quality: 'medium' | 'high';
}

let ffmpegInstance: FFmpeg | null = null;

async function getFFmpegInstance(onProgress?: (percent: number) => void): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  ffmpegInstance = new FFmpeg();

  ffmpegInstance.on('progress', ({ progress }) => {
    if (onProgress) {
      onProgress(Math.min(99, Math.round(progress * 100)));
    }
  });

  ffmpegInstance.on('log', ({ message }) => {
    console.log('FFmpeg:', message);
  });

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

  try {
    await ffmpegInstance.load({
      coreURL: `${baseURL}/ffmpeg-core.js`,
      wasmURL: `${baseURL}/ffmpeg-core.wasm`,
    });
  } catch (err) {
    console.warn('Primary CDN failed, loading local FFmpeg fallback...', err);
    await ffmpegInstance.load();
  }

  return ffmpegInstance;
}

function seekVideoFrame(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const clampedTime = Math.max(0, time);

    const cleanup = () => {
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
        flipHorizontal: t1.flipHorizontal,
        flipVertical: t1.flipVertical,
        cropTop: t1.cropTop,
        cropBottom: t1.cropBottom,
        cropLeft: t1.cropLeft,
        cropRight: t1.cropRight,
        blendMode: t1.blendMode,
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

  let width = 1280;
  let height = 720;

  if (settings.resolution === '1080p') {
    width = 1920;
    height = 1080;
  }

  if (aspectRatio === '9:16') {
    if (settings.resolution === '1080p') {
      width = 1080;
      height = 1920;
    } else {
      width = 720;
      height = 1280;
    }
  } else if (aspectRatio === '1:1') {
    width = settings.resolution === '1080p' ? 1080 : 720;
    height = width;
  } else if (aspectRatio === '4:5') {
    width = settings.resolution === '1080p' ? 1080 : 720;
    height = Math.round(width * 1.25);
  }

  const fps = settings.fps || 30;
  const frameDuration = 1 / fps;
  const totalFrames = Math.ceil(duration * fps);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Canvas 2D Context initialization failed.');
  }

  const videoElementsMap = new Map<string, HTMLVideoElement>();
  const imageElementsMap = new Map<string, HTMLImageElement>();

  try {
    for (const track of tracks) {
      for (const clip of track.clips) {
        if (clip.type === 'video' && clip.src && !videoElementsMap.has(clip.id)) {
          const video = document.createElement('video');
          video.crossOrigin = 'anonymous';
          video.src = clip.src;
          video.muted = true;
          video.playsInline = true;
          await new Promise<void>((resolve, reject) => {
            const onLoaded = () => {
              video.removeEventListener('loadeddata', onLoaded);
              video.removeEventListener('error', onError);
              resolve();
            };
            const onError = () => {
              video.removeEventListener('loadeddata', onLoaded);
              video.removeEventListener('error', onError);
              reject(new Error(`Failed to load video source for clip "${clip.name}"`));
            };
            video.addEventListener('loadeddata', onLoaded);
            video.addEventListener('error', onError);
            video.load();
          });
          videoElementsMap.set(clip.id, video);
        } else if (clip.type === 'image' && clip.src && !imageElementsMap.has(clip.id)) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = clip.src;
          await new Promise<void>((resolve) => {
            if (img.complete) resolve();
            else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          });
          imageElementsMap.set(clip.id, img);
        }
      }
    }

    const drawClip = async (clip: Clip, time: number) => {
      const relTime = time - clip.startTime;
      const currentTransform = getInterpolatedTransform(clip, relTime);

      ctx.save();

      const centerX = width / 2 + (currentTransform.x / 100) * width;
      const centerY = height / 2 + (currentTransform.y / 100) * height;
      ctx.translate(centerX, centerY);
      ctx.rotate((currentTransform.rotation * Math.PI) / 180);

      const flipX = currentTransform.flipHorizontal ? -1 : 1;
      const flipY = currentTransform.flipVertical ? -1 : 1;
      ctx.scale(currentTransform.scale * flipX, currentTransform.scale * flipY);

      ctx.globalAlpha = Math.max(0, Math.min(1, currentTransform.opacity));

      const blendMap: Record<string, GlobalCompositeOperation> = {
        normal: 'source-over',
        multiply: 'multiply',
        screen: 'screen',
        overlay: 'overlay',
        darken: 'darken',
        lighten: 'lighten',
      };
      ctx.globalCompositeOperation = blendMap[currentTransform.blendMode || 'normal'] || 'source-over';

      ctx.filter = buildCSSFilterString(clip.filter);

      const rawCropTop = (currentTransform.cropTop || 0) / 100;
      const rawCropBottom = (currentTransform.cropBottom || 0) / 100;
      const rawCropLeft = (currentTransform.cropLeft || 0) / 100;
      const rawCropRight = (currentTransform.cropRight || 0) / 100;

      const cropTop = Math.max(0, Math.min(0.45, rawCropTop));
      const cropBottom = Math.max(0, Math.min(0.45, rawCropBottom));
      const cropLeft = Math.max(0, Math.min(0.45, rawCropLeft));
      const cropRight = Math.max(0, Math.min(0.45, rawCropRight));

      if (clip.type === 'image') {
        const img = imageElementsMap.get(clip.id);
        if (img) {
          const natW = img.naturalWidth || width;
          const natH = img.naturalHeight || height;
          const sx = natW * cropLeft;
          const sy = natH * cropTop;
          const sw = Math.max(1, natW * (1 - cropLeft - cropRight));
          const sh = Math.max(1, natH * (1 - cropTop - cropBottom));

          const aspect = sw / sh;
          let drawW = width;
          let drawH = width / aspect;
          if (drawH < height) {
            drawH = height;
            drawW = height * aspect;
          }
          ctx.drawImage(img, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
        }
      } else if (clip.type === 'video') {
        const vid = videoElementsMap.get(clip.id);
        if (vid) {
          const mediaTime = getSourceTimeForTimelineTime(clip, time);
          await seekVideoFrame(vid, mediaTime);
          const natW = vid.videoWidth || width;
          const natH = vid.videoHeight || height;
          const sx = natW * cropLeft;
          const sy = natH * cropTop;
          const sw = Math.max(1, natW * (1 - cropLeft - cropRight));
          const sh = Math.max(1, natH * (1 - cropTop - cropBottom));

          const aspect = sw / sh;
          let drawW = width;
          let drawH = width / aspect;
          if (drawH < height) {
            drawH = height;
            drawW = height * aspect;
          }
          ctx.drawImage(vid, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
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
      } else if (clip.type === 'caption' && clip.caption) {
        const style = DEFAULT_CAPTION_STYLES[clip.caption.stylePreset] || DEFAULT_CAPTION_STYLES.social;
        const segment = clip.caption.segment || {
          id: clip.id,
          trackId: clip.trackId,
          startTime: clip.startTime,
          endTime: clip.startTime + clip.duration,
          text: clip.caption.text,
          words: clip.caption.words,
        };
        renderCaption(ctx, segment, time, style, width, height);
      }

      renderPostProcessingEffects(ctx, clip.filter, width, height);

      ctx.restore();
    };

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

      for (const clip of visibleClips) {
        const relTime = time - clip.startTime;
        const hasTransition = clip.transition && clip.transition.type !== 'none';

        if (hasTransition && relTime < (clip.transition?.duration || 0.5)) {
          const outgoingClip = findPreviousClipOnSameTrack(tracks, clip);
          const transDur = clip.transition?.duration || 0.5;
          const transProgress = relTime / transDur;

          await renderTransitionEffect({
            type: clip.transition!.type,
            progress: transProgress,
            ctx,
            width,
            height,
            drawOutgoing: async () => {
              if (outgoingClip) await drawClip(outgoingClip, time);
            },
            drawIncoming: async () => await drawClip(clip, time),
            frameSeed: frameIdx,
          });
        } else {
          await drawClip(clip, time);
        }
      }

      const frameData = ctx.getImageData(0, 0, width, height);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(frameData, 0, 0);

      const blob = await new Promise<Blob>((resolve) =>
        tempCanvas.toBlob((b) => resolve(b!), 'image/png')
      );

      const frameNumStr = frameIdx.toString().padStart(5, '0');
      const filename = `frame_${frameNumStr}.png`;
      await ffmpeg.writeFile(filename, await fetchFile(blob));

      if (onProgress && frameIdx % 10 === 0) {
        const renderPercent = Math.round((frameIdx / totalFrames) * 45);
        onProgress(renderPercent);
      }

      if (frameIdx % CHUNK_SIZE === 0 && frameIdx > 0) {
        await new Promise((r) => setTimeout(r, 10));
      }
    }

    const sampleRate = 44100;
    const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
      2,
      Math.ceil(duration * sampleRate),
      sampleRate
    );

    let hasAudioClips = false;

    // Collect all voiceover/speech clips for ducking calculations
    const speechClips: Clip[] = [];
    tracks.forEach((t) => {
      if (!t.muted && t.type === 'audio') {
        t.clips.forEach((c) => {
          if (!c.audio.muted) speechClips.push(c);
        });
      }
    });

    for (const track of tracks) {
      if (track.muted) continue;

      for (const clip of track.clips) {
        if ((clip.type === 'video' || clip.type === 'audio') && clip.src && !clip.audio.muted) {
          try {
            const resp = await fetch(clip.src);
            const arrayBuf = await resp.arrayBuffer();
            const decodedBuf = await offlineCtx.decodeAudioData(arrayBuf);

            const source = offlineCtx.createBufferSource();
            source.buffer = decodedBuf;

            const gainNode = offlineCtx.createGain();
            let vol = clip.audio.volume ?? 1;

            // Apply Ducking if enabled
            if (clip.audio.ducking?.enabled) {
              const reduction = (clip.audio.ducking.duckingAmount || 50) / 100;
              const hasSpeechOverlap = speechClips.some(
                (sc) => sc.id !== clip.id && sc.startTime < clip.startTime + clip.duration && sc.startTime + sc.duration > clip.startTime
              );
              if (hasSpeechOverlap) {
                vol = vol * (1 - reduction);
              }
            }

            gainNode.gain.setValueAtTime(vol, clip.startTime);

            if (clip.audio.fadeIn > 0) {
              gainNode.gain.setValueAtTime(0, clip.startTime);
              gainNode.gain.linearRampToValueAtTime(vol, clip.startTime + clip.audio.fadeIn);
            }

            if (clip.audio.fadeOut > 0) {
              const fadeOutStart = clip.startTime + clip.duration - clip.audio.fadeOut;
              gainNode.gain.setValueAtTime(vol, fadeOutStart);
              gainNode.gain.linearRampToValueAtTime(0, clip.startTime + clip.duration);
            }

            source.connect(gainNode);

            // Apply Stereo Panning
            if ('createStereoPanner' in offlineCtx && clip.audio.pan !== undefined && clip.audio.pan !== 0) {
              const panner = offlineCtx.createStereoPanner();
              panner.pan.setValueAtTime(Math.max(-1, Math.min(1, clip.audio.pan / 100)), clip.startTime);
              gainNode.connect(panner);
              panner.connect(offlineCtx.destination);
            } else {
              gainNode.connect(offlineCtx.destination);
            }

            source.start(clip.startTime, clip.mediaOffset, clip.duration);
            hasAudioClips = true;
          } catch (e) {
            console.warn(`Audio decoding warning for clip ${clip.name}:`, e);
          }
        }
      }
    }

    if (hasAudioClips) {
      const renderedAudioBuffer = await offlineCtx.startRendering();
      const wavArrayBuffer = audioBufferToWav(renderedAudioBuffer);
      await ffmpeg.writeFile('audio.wav', new Uint8Array(wavArrayBuffer));
    }

    if (onProgress) onProgress(50);

    const inputArgs = ['-framerate', fps.toString(), '-i', 'frame_%05d.png'];
    if (hasAudioClips) {
      inputArgs.push('-i', 'audio.wav');
    }

    const outputArgs = [
      ...inputArgs,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-preset',
      'fast',
      '-crf',
      settings.quality === 'high' ? '18' : '23',
    ];

    if (hasAudioClips) {
      outputArgs.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
    }

    outputArgs.push('output.mp4');

    await ffmpeg.exec(outputArgs);

    if (onProgress) onProgress(90);

    const data = await ffmpeg.readFile('output.mp4');

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      const filename = `frame_${frameIdx.toString().padStart(5, '0')}.png`;
      await ffmpeg.deleteFile(filename).catch(() => {});
    }
    if (hasAudioClips) {
      await ffmpeg.deleteFile('audio.wav').catch(() => {});
    }
    await ffmpeg.deleteFile('output.mp4').catch(() => {});

    if (onProgress) onProgress(100);

    const u8 = data as Uint8Array;
    return new Blob([u8.buffer as ArrayBuffer], { type: 'video/mp4' });
  } catch (err: any) {
    console.error('Export Error:', err);
    throw err;
  }
}
