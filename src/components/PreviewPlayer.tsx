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

export const PreviewPlayer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [containerBounds, setContainerBounds] = useState({ width: 0, height: 0 });
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 1280, height: 720 });

  const [showSafeZones, setShowSafeZones] = useState(false);
  const [canvasDragState, setCanvasDragState] = useState<{
    type: 'move' | 'scale' | 'rotate';
    startX: number;
    startY: number;
    initialTransform: Clip['transform'];
  } | null>(null);

  const {
    isPlaying,
    currentTime,
    aspectRatio,
    tracks,
    selectedClipId,
    setIsPlaying,
    setCurrentTime,
    updateClipTransform,
    beginTransaction,
    commitTransaction,
    getProjectDuration,
  } = useTimelineStore();

  const imageElementsMap = useRef<Map<string, HTMLImageElement>>(new Map());
  const videoElementsMap = useRef<Map<string, HTMLVideoElement>>(new Map());

  let selectedClip: Clip | null = null;
  for (const track of tracks) {
    const c = track.clips.find((clip) => clip.id === selectedClipId);
    if (c) {
      selectedClip = c;
      break;
    }
  }

  useEffect(() => {
    let w = 1280;
    let h = 720;

    if (aspectRatio === '9:16') {
      w = 720;
      h = 1280;
    } else if (aspectRatio === '1:1') {
      w = 1080;
      h = 1080;
    } else if (aspectRatio === '4:5') {
      w = 1080;
      h = 1350;
    } else if (aspectRatio === '4:3') {
      w = 960;
      h = 720;
    } else if (aspectRatio === '21:9') {
      w = 1680;
      h = 720;
    }

    setCanvasDimensions({ width: w, height: h });

    if (containerRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const cw = entry.contentRect.width;
          const ch = entry.contentRect.height;
          setContainerBounds({ width: cw, height: ch });
        }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [aspectRatio]);

  useEffect(() => {
    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        if (clip.type === 'image' && clip.src && !imageElementsMap.current.has(clip.id)) {
          const img = new Image();
          img.src = clip.src;
          img.crossOrigin = 'anonymous';
          imageElementsMap.current.set(clip.id, img);
        } else if (clip.type === 'video' && clip.src && !videoElementsMap.current.has(clip.id)) {
          const vid = document.createElement('video');
          vid.src = clip.src;
          vid.crossOrigin = 'anonymous';
          vid.muted = true;
          vid.playsInline = true;
          videoElementsMap.current.set(clip.id, vid);
        }
      });
    });
  }, [tracks]);

  const handleCanvasMouseDown = (e: React.MouseEvent, dragType: 'move' | 'scale' | 'rotate') => {
    if (!selectedClip) return;
    e.stopPropagation();

    beginTransaction();

    setCanvasDragState({
      type: dragType,
      startX: e.clientX,
      startY: e.clientY,
      initialTransform: { ...selectedClip.transform },
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!canvasDragState || !selectedClip) return;

    const deltaX = e.clientX - canvasDragState.startX;
    const deltaY = e.clientY - canvasDragState.startY;

    if (canvasDragState.type === 'move') {
      const percentX = canvasDragState.initialTransform.x + (deltaX / (containerBounds.width || 1)) * 100;
      const percentY = canvasDragState.initialTransform.y + (deltaY / (containerBounds.height || 1)) * 100;
      updateClipTransform(selectedClip.id, { x: percentX, y: percentY });
    } else if (canvasDragState.type === 'scale') {
      const scaleDelta = (deltaX + deltaY) * 0.005;
      const newScale = Math.max(0.1, Math.min(3.0, canvasDragState.initialTransform.scale + scaleDelta));
      updateClipTransform(selectedClip.id, { scale: newScale });
    } else if (canvasDragState.type === 'rotate') {
      const rotationDelta = deltaX * 0.5;
      updateClipTransform(selectedClip.id, { rotation: canvasDragState.initialTransform.rotation + rotationDelta });
    }
  };

  const handleCanvasMouseUp = () => {
    if (canvasDragState) {
      setCanvasDragState(null);
      commitTransaction();
    }
  };

  const interpolateTransform = (clip: Clip, relTime: number): Clip['transform'] => {
    if (!clip.keyframes || clip.keyframes.length === 0) return clip.transform;

    const sorted = [...clip.keyframes].sort((a, b) => a.time - b.time);
    if (relTime <= sorted[0].time) {
      return { ...clip.transform, ...sorted[0].transform };
    }
    if (relTime >= sorted[sorted.length - 1].time) {
      return { ...clip.transform, ...sorted[sorted.length - 1].transform };
    }

    let prevKf = sorted[0];
    let nextKf = sorted[sorted.length - 1];

    for (let i = 0; i < sorted.length - 1; i++) {
      if (relTime >= sorted[i].time && relTime <= sorted[i + 1].time) {
        prevKf = sorted[i];
        nextKf = sorted[i + 1];
        break;
      }
    }

    const duration = nextKf.time - prevKf.time;
    const progress = duration > 0 ? (relTime - prevKf.time) / duration : 1;

    const interpX = (prevKf.transform.x ?? clip.transform.x) + ((nextKf.transform.x ?? clip.transform.x) - (prevKf.transform.x ?? clip.transform.x)) * progress;
    const interpY = (prevKf.transform.y ?? clip.transform.y) + ((nextKf.transform.y ?? clip.transform.y) - (prevKf.transform.y ?? clip.transform.y)) * progress;
    const interpScale = (prevKf.transform.scale ?? clip.transform.scale) + ((nextKf.transform.scale ?? clip.transform.scale) - (prevKf.transform.scale ?? clip.transform.scale)) * progress;
    const interpRot = (prevKf.transform.rotation ?? clip.transform.rotation) + ((nextKf.transform.rotation ?? clip.transform.rotation) - (prevKf.transform.rotation ?? clip.transform.rotation)) * progress;

    return {
      ...clip.transform,
      x: interpX,
      y: interpY,
      scale: interpScale,
      rotation: interpRot,
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasDimensions;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

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
      const currentTransform = interpolateTransform(clip, relTime);

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

      renderPostProcessingEffects(ctx, clip.filter, width, height);

      ctx.restore();
    };

    visibleClips.forEach((clip) => {
      const relTime = currentTime - clip.startTime;
      const hasTransition = clip.transition && clip.transition.type !== 'none';

      if (hasTransition && relTime < (clip.transition?.duration || 0.5)) {
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
            if (outgoingClip) drawSingleClip(outgoingClip);
          },
          drawIncoming: () => drawSingleClip(clip),
          frameSeed: Math.floor(currentTime * 30),
        });
      } else {
        drawSingleClip(clip);
      }
    });

    if (showSafeZones && (aspectRatio === '9:16' || aspectRatio === '4:5')) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.6)';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 10]);
      ctx.strokeRect(width * 0.1, height * 0.15, width * 0.8, height * 0.7);
      ctx.fillStyle = 'rgba(0, 242, 254, 0.8)';
      ctx.font = '16px Inter, sans-serif';
      ctx.fillText(`SAFE ZONE (${aspectRatio})`, width * 0.15, height * 0.18);
      ctx.restore();
    }
  }, [currentTime, canvasDimensions, tracks, showSafeZones, aspectRatio]);

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const step = (now: number) => {
      if (isPlaying) {
        const delta = (now - lastTime) / 1000;
        lastTime = now;
        const nextTime = currentTime + delta;
        const maxDur = getProjectDuration();

        if (nextTime >= maxDur) {
          setCurrentTime(0);
          setIsPlaying(false);
        } else {
          setCurrentTime(nextTime);
          animId = requestAnimationFrame(step);
        }
      }
    };

    if (isPlaying) {
      lastTime = performance.now();
      animId = requestAnimationFrame(step);
    }

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, currentTime]);

  let scaleFactor = 1;
  if (containerBounds.width > 0 && containerBounds.height > 0) {
    const scaleW = containerBounds.width / canvasDimensions.width;
    const scaleH = containerBounds.height / canvasDimensions.height;
    scaleFactor = Math.min(scaleW, scaleH) * 0.92;
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      className="flex-1 bg-dark-950 flex flex-col items-center justify-center relative select-none overflow-hidden p-4"
    >
      <div className="absolute top-3 right-3 flex items-center space-x-2 z-20">
        <button
          onClick={() => setShowSafeZones(!showSafeZones)}
          className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition ${
            showSafeZones
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
              : 'bg-dark-800/80 text-gray-400 border-dark-700 hover:text-white'
          }`}
          title="Toggle Social Safe Zones"
        >
          <Grid className="w-4 h-4" />
          <span className="hidden sm:inline">Safe Zone</span>
        </button>
      </div>

      <div
        className="relative bg-black rounded-xl shadow-2xl overflow-hidden border border-dark-800 flex items-center justify-center transition-all duration-150"
        style={{
          width: canvasDimensions.width * scaleFactor,
          height: canvasDimensions.height * scaleFactor,
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          className="w-full h-full object-contain pointer-events-auto cursor-move"
          onMouseDown={(e) => handleCanvasMouseDown(e, 'move')}
        />

        {selectedClip && (
          <div
            className="absolute inset-0 pointer-events-none border-2 border-cyan-400/80 rounded"
            style={{
              transform: `translate(${selectedClip.transform.x}%, ${selectedClip.transform.y}%) rotate(${selectedClip.transform.rotation}deg) scale(${selectedClip.transform.scale})`,
            }}
          >
            <div
              onMouseDown={(e) => handleCanvasMouseDown(e, 'scale')}
              className="absolute -top-2 -right-2 w-4 h-4 bg-cyan-400 rounded-full cursor-nwse-resize pointer-events-auto border-2 border-black shadow"
              title="Drag to Scale"
            />
            <div
              onMouseDown={(e) => handleCanvasMouseDown(e, 'rotate')}
              className="absolute -top-6 left-1/2 -translate-x-1/2 w-4 h-4 bg-cyan-400 rounded-full cursor-grab pointer-events-auto border-2 border-black shadow"
              title="Drag to Rotate"
            />
          </div>
        )}
      </div>

      <div className="h-12 bg-dark-900/90 border border-dark-700/80 rounded-2xl mt-3 px-4 flex items-center justify-between space-x-4 shadow-xl z-20">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-8 h-8 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white flex items-center justify-center shadow-lg transition transform active:scale-95"
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <div className="font-mono text-xs font-bold text-gray-200 tracking-wider">
          <span className="text-cyan-400">{currentTime.toFixed(2)}s</span>
          <span className="text-gray-500 mx-1">/</span>
          <span>{getProjectDuration().toFixed(2)}s</span>
        </div>
      </div>
    </div>
  );
};
