import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Grid, RotateCcw, Maximize2, Type, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { Clip } from '../types/timeline';
import { renderTransitionEffect, findPreviousClipOnSameTrack } from '../utils/transitionEngine';
import { renderCaption, DEFAULT_CAPTION_STYLES } from '../utils/captionEngine';
import { buildCSSFilterString, renderPostProcessingEffects } from '../utils/filterEngine';
import { renderShape, renderSticker } from '../utils/graphicsEngine';
import { applyChromaKeyToCanvas } from '../utils/chromaKeyEngine';
import { applyCanvasMask } from '../utils/maskEngine';
import { getSourceTimeForTimelineTime } from '../utils/timelineMath';
import { getInterpolatedTransform, getInterpolatedFilter } from '../utils/keyframeEngine';
import { renderTextClipOnCanvas } from '../utils/textRenderEngine';

export const PreviewPlayer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [containerBounds, setContainerBounds] = useState({ width: 800, height: 450 });
  const [showGrid, setShowGrid] = useState(false);

  const {
    tracks,
    currentTime,
    maxTimelineDuration,
    isPlaying,
    setIsPlaying,
    setCurrentTime,
    aspectRatio,
    selectedClipId,
    setSelectedClipId,
    editingTextClipId,
    setEditingTextClipId,
    updateClipText,
  } = useTimelineStore();

  const videoElementsMap = useRef<Map<string, HTMLVideoElement>>(new Map());
  const imageElementsMap = useRef<Map<string, HTMLImageElement>>(new Map());

  // Find selected clip
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

  // Auto Focus & Auto Select text when entering edit mode
  useEffect(() => {
    if (editingTextClipId && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingTextClipId]);

  // Container Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerBounds({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Sync Video & Image Elements Map
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

  // Canvas Dimensions
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

  // Playhead Tick Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      if (isPlaying) {
        const delta = (now - lastTime) / 1000;
        const nextTime = currentTime + delta;
        if (nextTime >= maxTimelineDuration) {
          setIsPlaying(false);
          setCurrentTime(maxTimelineDuration);
        } else {
          setCurrentTime(nextTime);
        }
      }
      lastTime = now;
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, currentTime, maxTimelineDuration, setIsPlaying, setCurrentTime]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#0a0a0c';
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
        renderTextClipOnCanvas(ctx, clip, relTime, width, height);
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

      if (clip.mask && clip.mask.type !== 'none') {
        applyCanvasMask(ctx, clip.mask, width, height);
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

    // Bounding Box Controls on Selected Clip
    if (selectedClip && selectedClip.type !== 'audio' && selectedClip.type !== 'caption') {
      ctx.save();
      const relTime = currentTime - selectedClip.startTime;
      const tf = getInterpolatedTransform(selectedClip, relTime);

      const posX = width / 2 + (tf.x / 100) * width;
      const posY = height / 2 + (tf.y / 100) * height;

      ctx.translate(posX, posY);
      ctx.rotate((tf.rotation * Math.PI) / 180);

      const boxW = width * 0.4 * tf.scale;
      const boxH = height * 0.3 * tf.scale;

      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

      // Scale & Rotation Handles
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

  const handleDoubleClickCanvas = () => {
    if (selectedClip && selectedClip.type === 'text') {
      setEditingTextClipId(selectedClip.id);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-dark-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none"
    >
      {/* Canvas Viewport Frame */}
      <div
        onDoubleClick={handleDoubleClickCanvas}
        className="relative shadow-2xl rounded-xl overflow-hidden border border-dark-700 bg-black flex items-center justify-center"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <canvas ref={canvasRef} width={width} height={height} className="block cursor-pointer" />

        {/* Floating Canvas Mini-Toolbar for Selected Text Clip */}
        {selectedClip && selectedClip.type === 'text' && (
          <div className="absolute top-3 left-3 flex items-center space-x-1.5 bg-dark-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-cyan-500/40 shadow-2xl z-20 text-xs">
            {/* Font Select */}
            <select
              value={selectedClip.text?.fontFamily || 'Inter, sans-serif'}
              onChange={(e) => {
                useTimelineStore.getState().pushHistory();
                updateClipText(selectedClip!.id, { fontFamily: e.target.value });
              }}
              className="bg-dark-800 border border-dark-700 text-white rounded-lg px-2 py-1 text-xs outline-none focus:border-cyan-400 cursor-pointer font-medium max-w-[110px] truncate"
            >
              {['Inter, sans-serif', 'Poppins, sans-serif', 'Roboto, sans-serif', 'Montserrat, sans-serif', 'Arial, sans-serif', 'Georgia, serif', 'Courier New, monospace', 'Impact, sans-serif', 'Bebas Neue, sans-serif'].map((font) => (
                <option key={font} value={font}>
                  {font.split(',')[0]}
                </option>
              ))}
            </select>

            <div className="h-4 w-px bg-dark-700" />

            {/* Font Size Stepper */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => {
                  useTimelineStore.getState().pushHistory();
                  const sz = Math.max(8, (selectedClip!.text?.fontSize || 48) - 4);
                  updateClipText(selectedClip!.id, { fontSize: sz });
                }}
                className="w-5 h-5 rounded bg-dark-800 hover:bg-dark-700 text-gray-300 font-bold text-xs flex items-center justify-center"
                title="Decrease Size"
              >
                -
              </button>
              <span className="font-mono text-cyan-300 font-bold text-xs w-6 text-center">
                {selectedClip.text?.fontSize || 48}
              </span>
              <button
                onClick={() => {
                  useTimelineStore.getState().pushHistory();
                  const sz = Math.min(300, (selectedClip!.text?.fontSize || 48) + 4);
                  updateClipText(selectedClip!.id, { fontSize: sz });
                }}
                className="w-5 h-5 rounded bg-dark-800 hover:bg-dark-700 text-gray-300 font-bold text-xs flex items-center justify-center"
                title="Increase Size"
              >
                +
              </button>
            </div>

            <div className="h-4 w-px bg-dark-700" />

            {/* Bold B */}
            <button
              onClick={() => {
                useTimelineStore.getState().pushHistory();
                updateClipText(selectedClip!.id, { bold: !(selectedClip!.text?.bold) });
              }}
              className={`w-6 h-6 rounded transition font-extrabold text-xs flex items-center justify-center ${
                selectedClip.text?.bold ? 'bg-cyan-500 text-black font-extrabold' : 'text-gray-400 hover:text-white'
              }`}
              title="Toggle Bold"
            >
              B
            </button>

            {/* Italic I */}
            <button
              onClick={() => {
                useTimelineStore.getState().pushHistory();
                updateClipText(selectedClip!.id, { italic: !(selectedClip!.text?.italic) });
              }}
              className={`w-6 h-6 rounded transition italic font-bold text-xs flex items-center justify-center ${
                selectedClip.text?.italic ? 'bg-cyan-500 text-black font-bold' : 'text-gray-400 hover:text-white'
              }`}
              title="Toggle Italic"
            >
              I
            </button>

            {/* Underline U */}
            <button
              onClick={() => {
                useTimelineStore.getState().pushHistory();
                updateClipText(selectedClip!.id, { underline: !(selectedClip!.text?.underline) });
              }}
              className={`w-6 h-6 rounded transition underline font-bold text-xs flex items-center justify-center ${
                selectedClip.text?.underline ? 'bg-cyan-500 text-black font-bold' : 'text-gray-400 hover:text-white'
              }`}
              title="Toggle Underline"
            >
              U
            </button>

            <div className="h-4 w-px bg-dark-700" />

            {/* Text Color Picker */}
            <div className="relative w-5 h-5 rounded overflow-hidden border border-dark-600 cursor-pointer flex items-center justify-center" title="Text Color">
              <input
                type="color"
                value={selectedClip.text?.color || '#ffffff'}
                onChange={(e) => {
                  updateClipText(selectedClip!.id, { color: e.target.value });
                }}
                onMouseDown={() => useTimelineStore.getState().pushHistory()}
                className="absolute -inset-2 w-8 h-8 cursor-pointer border-0 bg-transparent"
              />
            </div>

            <div className="h-4 w-px bg-dark-700" />

            {/* Alignment Select */}
            <button
              onClick={() => {
                useTimelineStore.getState().pushHistory();
                const currentAlign = selectedClip!.text?.alignment || 'center';
                const nextAlign = currentAlign === 'left' ? 'center' : currentAlign === 'center' ? 'right' : 'left';
                updateClipText(selectedClip!.id, { alignment: nextAlign });
              }}
              className="px-2 py-0.5 rounded bg-dark-800 hover:bg-dark-700 text-cyan-300 font-bold text-[11px] uppercase tracking-wider"
              title="Toggle Alignment (Left/Center/Right)"
            >
              {selectedClip.text?.alignment || 'center'}
            </button>
          </div>
        )}

        {/* Active Overlay Text Editor Input Box */}
        {selectedClip && selectedClip.type === 'text' && editingTextClipId === selectedClip.id && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-30 p-4">
            <textarea
              ref={textareaRef}
              value={selectedClip.text?.content || ''}
              onChange={(e) => updateClipText(selectedClip!.id, { content: e.target.value })}
              onKeyDown={(e) => {
                e.stopPropagation(); // Block global hotkeys (S split, Space play, Delete clip, etc.)
                if (e.key === 'Escape') {
                  setEditingTextClipId(null);
                }
              }}
              onBlur={() => setEditingTextClipId(null)}
              rows={3}
              placeholder="Type your text..."
              className="bg-dark-900/90 text-cyan-300 border-2 border-cyan-400 rounded-2xl p-4 text-center font-bold text-xl outline-none shadow-2xl w-4/5 max-w-lg resize-none font-sans"
            />
          </div>
        )}

        {/* Floating Toolbar Overlay */}
        <div className="absolute top-3 right-3 flex items-center space-x-2 bg-dark-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-dark-700/80 shadow-lg z-20">
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
      <div className="mt-4 flex items-center space-x-4 bg-dark-900/90 border border-dark-700 px-5 py-2.5 rounded-2xl shadow-xl z-20">
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
