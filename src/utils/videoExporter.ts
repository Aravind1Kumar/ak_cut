import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { useTimelineStore } from '../store/timelineStore';
import { Clip } from '../types/timeline';

export interface ExportSettings {
  resolution: '720p' | '1080p' | '4K';
  fps: number;
}

let ffmpegInstance: FFmpeg | null = null;

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

  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      const percent = Math.min(100, Math.round(progress * 100));
      onProgress(percent);
    });
  }

  return ffmpeg;
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

  // 1. Initialize FFmpeg WASM
  const ffmpeg = await getFFmpegInstance(onProgress);

  // 2. Setup Export Canvas Dimensions
  let width = 1920;
  let height = 1080;
  if (aspectRatio === '9:16') {
    width = 1080;
    height = 1920;
  } else if (aspectRatio === '1:1') {
    width = 1080;
    height = 1080;
  } else if (aspectRatio === '4:3') {
    width = 1440;
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

  // Pre-load Image & Video Elements for Rendering
  const imageElementsMap = new Map<string, HTMLImageElement>();
  const videoElementsMap = new Map<string, HTMLVideoElement>();

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

  // 3. Render Frames & Write PNGs to FFmpeg Virtual Filesystem
  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    const time = frameIdx * frameDuration;

    // Clear Canvas
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, width, height);

    // Filter visible clips at current time
    const visibleClips: Clip[] = [];
    tracks.forEach((track) => {
      if (track.hidden) return;
      track.clips.forEach((clip) => {
        if (time >= clip.startTime && time <= clip.startTime + clip.duration) {
          visibleClips.push(clip);
        }
      });
    });

    // Layer Composite Sorting (Background Videos/Images first, Text & Subtitles LAST ON TOP)
    visibleClips.sort((a, b) => {
      const typePriority: Record<string, number> = { audio: 0, video: 1, image: 2, text: 3 };
      const priorityA = typePriority[a.type] ?? 1;
      const priorityB = typePriority[b.type] ?? 1;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const trackAIdx = tracks.findIndex((t) => t.id === a.trackId);
      const trackBIdx = tracks.findIndex((t) => t.id === b.trackId);
      return trackAIdx - trackBIdx;
    });

    for (const clip of visibleClips) {
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

      // Transition Opacity
      let opacity = currentTransform.opacity;
      if (clip.transition && clip.transition.type !== 'none') {
        const transDur = clip.transition.duration || 0.5;
        if (relTime < transDur) {
          opacity *= relTime / transDur;
        }
      }
      ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

      // Filter
      const f = clip.filter;
      ctx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) blur(${f.blur}px) hue-rotate(${f.hueRotate}deg) sepia(${f.sepia}%)`;

      // Render Image Clip
      if (clip.type === 'image') {
        const img = imageElementsMap.get(clip.id);
        if (img) {
          ctx.drawImage(img, -width / 2, -height / 2, width, height);
        }
      }
      // Render Video Clip
      else if (clip.type === 'video') {
        const vid = videoElementsMap.get(clip.id);
        if (vid) {
          const mediaTime = relTime * clip.speed + clip.mediaOffset;
          vid.currentTime = mediaTime;
          ctx.drawImage(vid, -width / 2, -height / 2, width, height);
        }
      }
      // Render Text Clip
      else if (clip.type === 'text' && clip.text) {
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
    }

    // Export frame to Blob -> Uint8Array -> Write to FFmpeg Virtual FS
    const frameBlob: Blob = await new Promise((res) => exportCanvas.toBlob((b) => res(b!), 'image/png'));
    const frameData = await fetchFile(frameBlob);
    const frameName = `frame_${frameIdx.toString().padStart(4, '0')}.png`;
    await ffmpeg.writeFile(frameName, frameData);

    // Report frame rendering progress (0% -> 70%)
    if (onProgress) {
      onProgress(Math.round((frameIdx / totalFrames) * 70));
    }
  }

  // 4. Run FFmpeg Encoding Command to produce MP4
  await ffmpeg.exec([
    '-framerate',
    `${fps}`,
    '-i',
    'frame_%04d.png',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'ultrafast',
    'output.mp4',
  ]);

  // 5. Read Encoded Output MP4 File from Virtual FS
  const outputData = (await ffmpeg.readFile('output.mp4')) as Uint8Array;
  const mp4Blob = new Blob([new Uint8Array(outputData)], { type: 'video/mp4' });

  // 6. Clean up Virtual Filesystem
  for (let i = 0; i < totalFrames; i++) {
    const frameName = `frame_${i.toString().padStart(4, '0')}.png`;
    try {
      await ffmpeg.deleteFile(frameName);
    } catch (e) {}
  }
  try {
    await ffmpeg.deleteFile('output.mp4');
  } catch (e) {}

  if (onProgress) {
    onProgress(100);
  }

  return mp4Blob;
}
