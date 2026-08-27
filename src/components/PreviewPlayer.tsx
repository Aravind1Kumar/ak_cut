import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Maximize,
  Grid,
  Scissors,
  Copy,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { Clip, Keyframe } from '../types/timeline';
import { renderTransitionEffect, findPreviousClipOnSameTrack } from '../utils/transitionEngine';
import { renderCaption, DEFAULT_CAPTION_STYLES } from '../utils/captionEngine';
import { buildCSSFilterString, renderPostProcessingEffects } from '../utils/filterEngine';
import { renderShape, renderSticker } from '../utils/graphicsEngine';
import { applyChromaKeyToCanvas } from '../utils/chromaKeyEngine';
import { getSourceTimeForTimelineTime } from '../utils/timelineMath';
import { getInterpolatedTransform, getInterpolatedFilter } from '../utils/keyframeEngine';

export const PreviewPlayer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const videoElementsMap = useRef<Map<string, HTMLVideoElement>>(new Map());
  const imageElementsMap = useRef<Map<string, HTMLImageElement>>(new Map());

  const [containerBounds, setContainerBounds] = useState({ width: 640, height: 360 });
  const [showGrid, setShowGrid] = useState(false);
  const [canvasDragState, setCanvasDragState] = useState<{
    type: 'move' | 'scale' | 'rotate';
    startX: number;
    startY: number;
    initialTransform: Clip['transform'];
  } | null>(null);

  const {
    isPlaying,
    currentTime,
    maxTimelineDuration,
    aspectRatio,
    tracks,
    selectedClipId,
    setIsPlaying,
    setCurrentTime,
    updateClipTransform,
    beginTransaction,
    commitTransaction,
  } = useTimelineStore();

  let selectedClip: Clip | null = null;
  if (selectedClipId) {
    for (const track of tracks) {
      const found = track.clips.find((c) => c.id === selectedClipId);
      if (found) {
        selectedClip = found;
        break;
      }
    }
  }

  // Dynamic Container Bounds Observer (Responsive fit)
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerBounds({ width, height });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Sync Video & Image Element Cache
  useEffect(() => {
    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        if (clip.type === 'video' && clip.src && !videoElementsMap.current.has(clip.id)) {
          const video = document.createElement('video');
          video.src = clip.src;
          video.crossOrigin = 'anonymous';
          video.muted = true;
          video.load();
          videoElementsMap.current.set(clip.id, video);
        } else if (clip.type === 'image' && clip.src && !imageElementsMap.current.has(clip.id)) {
          const img = new Image();
          img.src = clip.src;
          img.crossOrigin = 'anonymous';
          imageElementsMap.current.set(clip.id, img);
        }
      });
    });
  }, [tracks]);

  // Compute Target Dimensions based on Aspect Ratio
  const getCanvasDimensions = () => {
    let ratioNum = 16 / 9;
    if (aspectRatio === '9:16') ratioNum = 9 / 16;
    else if (aspectRatio === '1:1') ratioNum = 1;
    else if (aspectRatio === '4:5') ratioNum = 4 / 5;
    else if (aspectRatio === '4:3') ratioNum = 4 / 3;
    else if (aspectRatio === '21:9') ratioNum = 21 / 9;

    const maxW = containerBounds.width - 32;
    const maxH = containerBounds.height - 32;

    let width = maxW;
    let height = maxW / ratioNum;

    if (height > maxH) {
      height = maxH;
      width = maxH * ratioNum;
    }

    return { width: Math.max(200, Math.floor(width)), height: Math.max(200, Math.floor(height)) };
  };

  const { width, height } = getCanvasDimensions();

  // Playhead Tick Animation Frame Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      if (isPlaying) {
        const delta = (now - lastTime) / 1000;
        const nextTime = currentTime + delta;
        if (nextTime >= maxTimelineDuration) {
          setIsPlaying(false);
          setCurrentTime(0);
        } else {
          setCurrentTime(nextTime);
        }
      }
      lastTime = now;
      animationFrameId = requestAnimationFrame(loop);
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, currentTime, maxTimelineDuration, setIsPlaying, setCurrentTime]);

  // Canvas Render Frame Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Canvas Background Fill
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, width, height);

    // Render Visible Tracks Bottom-to-Top
    const visibleClips: Clip[] = [];
    tracks.forEach((track) => {
      if (track.hidden) return;
      track.clips.forEach((clip) => {
        if (currentTime >= clip.startTime && currentTime <= clip.startTime + clip.duration) {
          visibleClips.push(clip);
        }
      });
    });

    const drawSingleClip = (clip: Clip) => {
      const relTime = currentTime - clip.startTime;
      const currentTransform = getInterpolatedTransform(clip, relTime);
      const currentFilter = getInterpolatedFilter(clip, relTime);

      ctx.save();

      const posX = (currentTransform.x / 100) * width;
      const posY = (currentTransform.y / 100) * height;

      ctx.translate(width / 2 + posX, height / 2 + posY);

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
        const img = imageElementsMap.current.get(clip.id);
        if (img && img.complete) {
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
        const vid = videoElementsMap.current.get(clip.id);
        if (vid && vid.readyState >= 2) {
          const mediaTime = getSourceTimeForTimelineTime(clip, currentTime);
          if (Math.abs(vid.currentTime - mediaTime) > 0.05) {
            vid.currentTime = mediaTime;
          }
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

        renderCaption(ctx, segment, currentTime, style, width, height);
      } else if (clip.type === 'shape' && clip.shape) {
        renderShape(ctx, clip.shape, width, height);
      } else if (clip.type === 'sticker' && clip.sticker) {
        renderSticker(ctx, clip.sticker, width, height);
      }

      if (clip.chromaKey?.enabled) {
        applyChromaKeyToCanvas(ctx, clip.chromaKey, width, height);
      }

      renderPostProcessingEffects(ctx, currentFilter, width, height);

      ctx.restore();
    };

    visibleClips.forEach((clip) => {
      const prevClip = findPreviousClipOnSameTrack(tracks, clip);
      if (clip.transition && clip.transition.type !== 'none' && prevClip) {
        const transStart = clip.startTime;
        const transDur = clip.transition.duration;
        if (currentTime >= transStart && currentTime <= transStart + transDur) {
          const progress = (currentTime - transStart) / transDur;
          renderTransitionEffect({
            type: clip.transition.type,
            progress,
            ctx,
            width,
            height,
            drawOutgoing: () => drawSingleClip(prevClip),
            drawIncoming: () => drawSingleClip(clip),
          });
          return;
        }
      }

      drawSingleClip(clip);
    });

    // Render Bounding Box Controls on Selected Clip
    if (selectedClip && selectedClip.type !== 'audio' && selectedClip.type !== 'caption') {
      ctx.save();
      const relTime = currentTime - selectedClip.startTime;
      const tf = getInterpolatedTransform(selectedClip, relTime);

      const posX = width / 2 + (tf.x / 100) * width;
      const posY = height / 2 + (tf.y / 100) * height;

      ctx.translate(posX, posY);
      ctx.rotate((tf.rotation * Math.PI) / 180);

      const boxW = (width * 0.4) * tf.scale;
      const boxH = (height * 0.4) * tf.scale;

      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

      // Handles (Scale & Rotation)
      ctx.setLineDash([]);
      ctx.fillStyle = '#00f2fe';

      const handleSize = 8;
      ctx.fillRect(boxW / 2 - handleSize / 2, boxH / 2 - handleSize / 2, handleSize, handleSize);

      ctx.beginPath();
      ctx.arc(0, -boxH / 2 - 20, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Grid Overlay
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;

      for (let x = width / 3; x < width; x += width / 3) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = height / 3; y < height; y += height / 3) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
  }, [width, height, tracks, currentTime, selectedClip, showGrid]);

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-dark-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none"
    >
      {/* Canvas Viewport Frame */}
      <div
        className="relative shadow-2xl rounded-xl overflow-hidden border border-dark-700 bg-black flex items-center justify-center"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <canvas ref={canvasRef} width={width} height={height} className="block" />

        {/* Floating Quick Action Overlay Bar */}
        <div className="absolute top-3 right-3 flex items-center space-x-2 bg-dark-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-dark-700/80 shadow-lg">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-lg transition ${
              showGrid ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-gray-400 hover:text-white'
            }`}
            title="Toggle Rule-of-Thirds Grid"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Playback Controls Bar */}
      <div className="mt-4 flex items-center space-x-4 bg-dark-900/90 border border-dark-700 px-5 py-2.5 rounded-2xl shadow-xl">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition shadow-lg shadow-cyan-500/20"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>

        <span className="font-mono text-sm font-bold text-gray-200">
          {currentTime.toFixed(2)}s <span className="text-gray-500">/ {maxTimelineDuration.toFixed(2)}s</span>
        </span>
      </div>
    </div>
  );
};
