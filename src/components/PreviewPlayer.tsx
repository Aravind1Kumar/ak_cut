import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Sparkles, RotateCw } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { Clip, Track } from '../types/timeline';
import { getSourceTimeForTimelineTime } from '../utils/timelineMath';
import { renderTransitionEffect } from '../utils/transitionEngine';
import { renderCaption, DEFAULT_CAPTION_STYLES } from '../utils/captionEngine';

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

export const PreviewPlayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [canvasDimensions, setCanvasDimensions] = useState({ width: 1280, height: 720 });
  const [containerBounds, setContainerBounds] = useState({ width: 800, height: 450 });
  const [showSafeZones, setShowSafeZones] = useState(false);

  const [isEditingCanvasText, setIsEditingCanvasText] = useState(false);
  const [canvasEditingTextContent, setCanvasEditingTextContent] = useState('');

  const [canvasDragState, setCanvasDragState] = useState<{
    type: 'move' | 'scale' | 'rotate';
    startX: number;
    startY: number;
    initialTransform: { x: number; y: number; scale: number; rotation: number };
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
    updateClipText,
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
      const newX = canvasDragState.initialTransform.x + (deltaX / containerBounds.width) * 100;
      const newY = canvasDragState.initialTransform.y + (deltaY / containerBounds.height) * 100;
      updateClipTransform(selectedClip.id, { x: newX, y: newY });
    } else if (canvasDragState.type === 'scale') {
      const scaleDelta = deltaX / 200;
      const newScale = Math.max(0.1, Math.min(4.0, canvasDragState.initialTransform.scale + scaleDelta));
      updateClipTransform(selectedClip.id, { scale: newScale });
    } else if (canvasDragState.type === 'rotate') {
      const newRot = (canvasDragState.initialTransform.rotation + deltaX) % 360;
      updateClipTransform(selectedClip.id, { rotation: newRot });
    }
  };

  const handleCanvasMouseUp = () => {
    if (canvasDragState) {
      commitTransaction();
      setCanvasDragState(null);
    }
  };

  const handleTextDoubleClick = () => {
    if (selectedClip && selectedClip.type === 'text' && selectedClip.text) {
      setCanvasEditingTextContent(selectedClip.text.content);
      setIsEditingCanvasText(true);
    }
  };

  const handleFinishInlineTextEdit = () => {
    if (selectedClip && selectedClip.type === 'text') {
      updateClipText(selectedClip.id, { content: canvasEditingTextContent });
    }
    setIsEditingCanvasText(false);
  };

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasDimensions;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, width, height);

    const visibleClips: Clip[] = [];
    tracks.forEach((track) => {
      if (track.hidden) return; // Enforce track visibility
      track.clips.forEach((clip) => {
        if (currentTime >= clip.startTime && currentTime <= clip.startTime + clip.duration) {
          visibleClips.push(clip);
        }
      });
    });

    const drawSingleClip = (clip: Clip) => {
      const relTime = currentTime - clip.startTime;
      const currentTransform = getInterpolatedTransform(clip, relTime);

      ctx.save();

      const centerX = width / 2 + (currentTransform.x / 100) * width;
      const centerY = height / 2 + (currentTransform.y / 100) * height;
      ctx.translate(centerX, centerY);
      ctx.rotate((currentTransform.rotation * Math.PI) / 180);
      ctx.scale(currentTransform.scale, currentTransform.scale);
      ctx.globalAlpha = Math.max(0, Math.min(1, currentTransform.opacity));

      const f = clip.filter;
      ctx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) blur(${f.blur}px) hue-rotate(${f.hueRotate}deg) sepia(${f.sepia}%)`;

      if (clip.type === 'image') {
        const img = imageElementsMap.current.get(clip.id);
        if (img && img.complete) {
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
        const vid = videoElementsMap.current.get(clip.id);
        if (vid && vid.readyState >= 2) {
          const mediaTime = getSourceTimeForTimelineTime(clip, currentTime);
          if (Math.abs(vid.currentTime - mediaTime) > 0.05) {
            vid.currentTime = mediaTime;
          }
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
      } else if (clip.type === 'caption' && clip.caption) {
        // Phase 3A: Invoke Shared Canonical Caption Renderer
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
      }

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
        }
      }
      animId = requestAnimationFrame(step);
    };

    if (isPlaying) {
      animId = requestAnimationFrame(step);
    }

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, currentTime, getProjectDuration]);

  const aspectNum = canvasDimensions.width / canvasDimensions.height;
  let fittedWidth = containerBounds.width;
  let fittedHeight = containerBounds.width / aspectNum;

  if (fittedHeight > containerBounds.height) {
    fittedHeight = containerBounds.height;
    fittedWidth = containerBounds.height * aspectNum;
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      className="flex-1 bg-dark-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none"
    >
      <div
        className="relative shadow-2xl rounded-lg overflow-hidden border border-dark-700 bg-black flex items-center justify-center"
        style={{ width: `${fittedWidth}px`, height: `${fittedHeight}px` }}
      >
        <canvas ref={canvasRef} className="w-full h-full object-contain" />

        {selectedClip && (
          <div
            onMouseDown={(e) => handleCanvasMouseDown(e, 'move')}
            onDoubleClick={handleTextDoubleClick}
            style={{
              left: `${50 + selectedClip.transform.x}%`,
              top: `${50 + selectedClip.transform.y}%`,
              transform: `translate(-50%, -50%) rotate(${selectedClip.transform.rotation}deg) scale(${selectedClip.transform.scale})`,
            }}
            className="absolute border-2 border-cyan-400 p-4 cursor-move flex items-center justify-center group z-30"
          >
            {isEditingCanvasText ? (
              <input
                type="text"
                autoFocus
                value={canvasEditingTextContent}
                onChange={(e) => setCanvasEditingTextContent(e.target.value)}
                onBlur={handleFinishInlineTextEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') handleFinishInlineTextEdit();
                }}
                className="bg-black/90 text-cyan-300 font-bold text-lg px-2 py-1 outline-none border border-cyan-400 rounded shadow-xl min-w-[150px] text-center"
              />
            ) : (
              <span className="text-white text-xs font-bold pointer-events-none select-none opacity-0 group-hover:opacity-100 bg-black/60 px-2 py-0.5 rounded">
                Double Click to Edit Text
              </span>
            )}

            <div
              onMouseDown={(e) => handleCanvasMouseDown(e, 'scale')}
              className="absolute -right-2 -bottom-2 w-4 h-4 bg-cyan-400 border-2 border-white rounded-full cursor-se-resize shadow-md"
              title="Drag to Scale"
            />

            <div
              onMouseDown={(e) => handleCanvasMouseDown(e, 'rotate')}
              className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-5 h-5 bg-cyan-400 border-2 border-white rounded-full flex items-center justify-center cursor-grab shadow-md"
              title="Drag to Rotate"
            >
              <RotateCw className="w-3 h-3 text-black" />
            </div>
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 flex items-center space-x-2 bg-dark-900/80 backdrop-blur-md border border-dark-700 rounded-lg p-1.5 z-20">
        <button
          onClick={() => setShowSafeZones(!showSafeZones)}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition ${
            showSafeZones ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-gray-400 hover:text-gray-200'
          }`}
          title="Toggle Social Safe-Zones Overlay"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Safe Zones</span>
        </button>
      </div>

      <div className="mt-4 flex items-center space-x-4 bg-dark-800/90 border border-dark-700 rounded-xl px-5 py-2 z-20 shadow-lg">
        <button
          onClick={() => setCurrentTime(0)}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg transition"
          title="Jump to Start (Home)"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-full flex items-center justify-center shadow-lg transition transform active:scale-95"
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>

        <button
          onClick={() => setCurrentTime(getProjectDuration())}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg transition"
          title="Jump to End (End)"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-dark-700 mx-1" />

        <div className="font-mono text-xs text-cyan-400 font-semibold min-w-[70px]">
          {currentTime.toFixed(2)}s / {getProjectDuration()}s
        </div>
      </div>
    </div>
  );
};
