import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { useTimelineStore } from '../store/timelineStore';
import { Clip } from '../types/timeline';
import { renderTransitionEffect, findPreviousClipOnSameTrack } from './transitionEngine';
import { renderCaption, DEFAULT_CAPTION_STYLES } from './captionEngine';
import { buildCSSFilterString, renderPostProcessingEffects } from './filterEngine';
import { renderShape, renderSticker } from './graphicsEngine';
import { applyChromaKeyToCanvas } from './chromaKeyEngine';
import { applyCanvasMask } from './maskEngine';
import { audioBufferToWav } from './audioWavEncoder';
import { getSourceTimeForTimelineTime } from './timelineMath';
import { getInterpolatedTransform, getInterpolatedFilter } from './keyframeEngine';

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

  const ffmpeg = new FFmpeg();
  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      onProgress(Math.round(progress * 100));
    });
  }

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  await ffmpeg.load({
    coreURL: `${baseURL}/ffmpeg-core.js`,
    wasmURL: `${baseURL}/ffmpeg-core.wasm`,
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

function seekVideoFrame(video: HTMLVideoElement, targetTime: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - targetTime) < 0.03) {
      resolve();
      return;
    }
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = targetTime;
  });
}

export async function exportVideoProject(
  settings: ExportSettings,
  onProgress: (statusText: string, percentage: number) => void
): Promise<Blob> {
  const store = useTimelineStore.getState();
  const { tracks, aspectRatio, mediaAssets } = store;

  const totalDuration = store.getProjectDuration();
  if (totalDuration <= 0) {
    throw new Error('Timeline is empty. Please add media or text clips before exporting.');
  }

  let width = 1920;
  let height = 1080;

  if (settings.resolution === '720p') {
    width = 1280;
    height = 720;
  }

  if (aspectRatio === '9:16') {
    const tmp = width;
    width = height;
    height = tmp;
  } else if (aspectRatio === '1:1') {
    height = width;
  } else if (aspectRatio === '4:5') {
    height = Math.round(width * (5 / 4));
  } else if (aspectRatio === '4:3') {
    height = Math.round(width * (3 / 4));
  } else if (aspectRatio === '21:9') {
    height = Math.round(width * (9 / 21));
  }

  // Ensure dimensions are divisible by 2 for FFmpeg H.264
  width = Math.floor(width / 2) * 2;
  height = Math.floor(height / 2) * 2;

  const fps = settings.fps || 30;
  const frameDuration = 1 / fps;
  const totalFrames = Math.ceil(totalDuration * fps);

  onProgress('Initializing FFmpeg WebAssembly core...', 5);
  const ffmpeg = await getFFmpegInstance();

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to initialize 2D Canvas Context');

  const videoElementsMap = new Map<string, HTMLVideoElement>();
  const imageElementsMap = new Map<string, HTMLImageElement>();

  onProgress('Loading media resources for offline frame rendering...', 10);

  for (const track of tracks) {
    for (const clip of track.clips) {
      if (clip.type === 'video' && clip.src && !videoElementsMap.has(clip.id)) {
        const video = document.createElement('video');
        video.src = clip.src;
        video.crossOrigin = 'anonymous';
        video.muted = true;

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
    const currentFilter = getInterpolatedFilter(clip, relTime);

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

    ctx.filter = buildCSSFilterString(currentFilter);

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
    } else if (clip.type === 'shape' && clip.shape) {
      renderShape(ctx, clip.shape, width, height);
    } else if (clip.type === 'sticker' && clip.sticker) {
      renderSticker(ctx, clip.sticker, width, height);
    }

    if (clip.chromaKey?.enabled) {
      applyChromaKeyToCanvas(ctx, clip.chromaKey, width, height);
    }

    if (clip.mask && clip.mask.type !== 'none') {
      applyCanvasMask(ctx, clip.mask, width, height);
    }

    renderPostProcessingEffects(ctx, currentFilter, width, height);

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
      const prevClip = findPreviousClipOnSameTrack(tracks, clip);
      if (clip.transition && clip.transition.type !== 'none' && prevClip) {
        const transStart = clip.startTime;
        const transDur = clip.transition.duration;
        if (time >= transStart && time <= transStart + transDur) {
          const progress = (time - transStart) / transDur;
          renderTransitionEffect({
            type: clip.transition.type,
            progress,
            ctx,
            width,
            height,
            drawOutgoing: () => drawClip(prevClip, time),
            drawIncoming: () => drawClip(clip, time),
            frameSeed: frameIdx,
          });
          continue;
        }
      }

      await drawClip(clip, time);
    }

    const frameBlob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.85));
    const frameData = new Uint8Array(await frameBlob.arrayBuffer());
    const frameFileName = `frame_${String(frameIdx).padStart(5, '0')}.jpg`;
    await ffmpeg.writeFile(frameFileName, frameData);

    const progressPct = 15 + Math.round((frameIdx / totalFrames) * 60);
    onProgress(`Rendering video frame ${frameIdx + 1} of ${totalFrames}...`, progressPct);
  }

  onProgress('Synthesizing offline audio track mixdown...', 78);

  const sampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);

  let hasAudioSource = false;
  for (const track of tracks) {
    if (track.muted) continue;
    for (const clip of track.clips) {
      if ((clip.type === 'video' || clip.type === 'audio') && !clip.audio.muted && clip.src) {
        try {
          const res = await fetch(clip.src);
          const arrayBuf = await res.arrayBuffer();
          const decodedBuffer = await offlineCtx.decodeAudioData(arrayBuf);

          const sourceNode = offlineCtx.createBufferSource();
          sourceNode.buffer = decodedBuffer;

          if (clip.speed !== 1) {
            sourceNode.playbackRate.value = clip.speed;
          }

          const gainNode = offlineCtx.createGain();
          const volumeGain = clip.audio.volume ?? 1;
          gainNode.gain.setValueAtTime(volumeGain, clip.startTime);

          if (clip.audio.fadeIn > 0) {
            gainNode.gain.setValueAtTime(0, clip.startTime);
            gainNode.gain.linearRampToValueAtTime(volumeGain, clip.startTime + clip.audio.fadeIn);
          }
          if (clip.audio.fadeOut > 0) {
            const fadeOutStart = clip.startTime + clip.duration - clip.audio.fadeOut;
            gainNode.gain.setValueAtTime(volumeGain, Math.max(clip.startTime, fadeOutStart));
            gainNode.gain.linearRampToValueAtTime(0, clip.startTime + clip.duration);
          }

          sourceNode.connect(gainNode);
          gainNode.connect(offlineCtx.destination);

          sourceNode.start(clip.startTime, clip.mediaOffset, clip.duration * clip.speed);
          hasAudioSource = true;
        } catch (e) {
          console.warn(`Failed to process audio for clip "${clip.name}":`, e);
        }
      }
    }
  }

  if (hasAudioSource) {
    const renderedAudioBuf = await offlineCtx.startRendering();
    const wavData = audioBufferToWav(renderedAudioBuf);
    await ffmpeg.writeFile('audio_mix.wav', wavData);
  }

  onProgress('Encoding H.264 MP4 with FFmpeg WASM...', 85);

  const ffmpegArgs = [
    '-framerate',
    String(fps),
    '-i',
    'frame_%05d.jpg',
  ];

  if (hasAudioSource) {
    ffmpegArgs.push('-i', 'audio_mix.wav');
  }

  ffmpegArgs.push(
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    settings.quality === 'high' ? 'slow' : 'ultrafast',
    '-crf',
    settings.quality === 'high' ? '18' : '23'
  );

  if (hasAudioSource) {
    ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  }

  ffmpegArgs.push('output.mp4');

  await ffmpeg.exec(ffmpegArgs);

  onProgress('Finalizing MP4 file creation...', 95);
  const data = (await ffmpeg.readFile('output.mp4')) as Uint8Array;

  // Cleanup FFmpeg virtual filesystem frames
  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    const frameFileName = `frame_${String(frameIdx).padStart(5, '0')}.jpg`;
    try {
      await ffmpeg.deleteFile(frameFileName);
    } catch (e) {}
  }
  if (hasAudioSource) {
    try {
      await ffmpeg.deleteFile('audio_mix.wav');
      await ffmpeg.deleteFile('output.mp4');
    } catch (e) {}
  }

  onProgress('Export Complete!', 100);
  return new Blob([data.buffer as ArrayBuffer], { type: 'video/mp4' });
}
