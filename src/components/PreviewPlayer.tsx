import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { Clip, Keyframe } from '../types/timeline';
import { getSourceTimeForTimelineTime } from '../utils/timelineMath';
import { renderTransitionEffect } from '../utils/transitionEngine';

export const PreviewPlayer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const activeVideoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const activeImageElementsRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 640, height: 360 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; initialX: number; initialY: number } | null>(null);

  const {
    isPlaying,
    currentTime,
    maxTimelineDuration,
    aspectRatio,
    tracks,
    selectedClipId,
    getProjectDuration,
    setIsPlaying,
    setCurrentTime,
    updateClipTransform,
  } = useTimelineStore();

  let selectedClip: Clip | null = null;
  if (selectedClipId) {
    for (const track of tracks) {
      const c = track.clips.find((clip) => clip.id === selectedClipId);
      if (c) {
        selectedClip = c;
        break;
      }
    }
  }

  // Monitor container size with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Playback Loop
  useEffect(() => {
    let lastTime = performance.now();

    const update = (now: number) => {
      if (isPlaying) {
        const delta = (now - lastTime) / 1000;
        const nextTime = currentTime + delta;
        const projectEndDuration = getProjectDuration();

        if (nextTime >= projectEndDuration) {
          setCurrentTime(0);
          setIsPlaying(false);
        } else {
          setCurrentTime(nextTime);
        }
      }
      lastTime = now;
      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(update);
      }
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(update);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentTime, getProjectDuration]);

  // Interpolate Keyframes at current time
  const getInterpolatedTransform = (clip: Clip, relTime: number) => {
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
  };

  // Render Canvas Frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let targetWidth = 1280;
    let targetHeight = 720;
    if (aspectRatio === '9:16') {
      targetWidth = 720;
      targetHeight = 1280;
    } else if (aspectRatio === '1:1') {
      targetWidth = 1080;
      targetHeight = 1080;
    } else if (aspectRatio === '4:3') {
      targetWidth = 1024;
      targetHeight = 768;
    }

    // Scale canvas into container with aspect ratio preservation
    const containerW = containerSize.width || 640;
    const containerH = containerSize.height || 360;
    const scaleFactor = Math.min((containerW - 32) / targetWidth, (containerH - 48) / targetHeight, 1);

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    canvas.style.width = `${targetWidth * scaleFactor}px`;
    canvas.style.height = `${targetHeight * scaleFactor}px`;

    // Clear Canvas
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Visible Clips at currentTime
    const visibleClips: Clip[] = [];
    tracks.forEach((track) => {
      if (track.hidden) return;
      track.clips.forEach((clip) => {
        if (currentTime >= clip.startTime && currentTime <= clip.startTime + clip.duration) {
          visibleClips.push(clip);
        }
      });
    });

    // Layer Composite Priority Order
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

    const drawSingleClip = (clip: Clip) => {
      const relTime = currentTime - clip.startTime;
      const currentTransform = getInterpolatedTransform(clip, relTime);

      ctx.save();

      // Masking Path
      if (clip.mask && clip.mask.type !== 'none') {
        ctx.beginPath();
        if (clip.mask.type === 'circle') {
          ctx.arc(targetWidth / 2, targetHeight / 2, Math.min(targetWidth, targetHeight) / 3, 0, Math.PI * 2);
        } else if (clip.mask.type === 'rectangle') {
          ctx.rect(targetWidth * 0.15, targetHeight * 0.15, targetWidth * 0.7, targetHeight * 0.7);
        } else if (clip.mask.type === 'splitLeft') {
          ctx.rect(0, 0, targetWidth / 2, targetHeight);
        } else if (clip.mask.type === 'pen' && clip.mask.points && clip.mask.points.length > 0) {
          clip.mask.points.forEach((pt, i) => {
            const px = targetWidth / 2 + (pt.x / 100) * targetWidth;
            const py = targetHeight / 2 + (pt.y / 100) * targetHeight;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.closePath();
        }
        ctx.clip();
      }

      // Center transform
      const centerX = targetWidth / 2 + (currentTransform.x / 100) * targetWidth;
      const centerY = targetHeight / 2 + (currentTransform.y / 100) * targetHeight;
      ctx.translate(centerX, centerY);
      ctx.rotate((currentTransform.rotation * Math.PI) / 180);
      ctx.scale(currentTransform.scale, currentTransform.scale);
      ctx.globalAlpha = Math.max(0, Math.min(1, currentTransform.opacity));

      // Filter
      const f = clip.filter;
      ctx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) blur(${f.blur}px) hue-rotate(${f.hueRotate}deg) sepia(${f.sepia}%)`;

      // Render Image Clip with Aspect Ratio Preservation
      if (clip.type === 'image' && clip.src) {
        let img = activeImageElementsRef.current.get(clip.id);
        if (!img) {
          img = new Image();
          img.src = clip.src;
          img.crossOrigin = 'anonymous';
          activeImageElementsRef.current.set(clip.id, img);
        }
        if (img.complete) {
          const aspect = (img.naturalWidth || targetWidth) / (img.naturalHeight || targetHeight);
          let drawW = targetWidth;
          let drawH = targetWidth / aspect;
          if (drawH < targetHeight) {
            drawH = targetHeight;
            drawW = targetHeight * aspect;
          }
          ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        }
      }
      // Render Video Clip with Aspect Ratio Preservation & getSourceTimeForTimelineTime
      else if (clip.type === 'video' && clip.src) {
        let video = activeVideoElementsRef.current.get(clip.id);
        if (!video) {
          video = document.createElement('video');
          video.src = clip.src;
          video.crossOrigin = 'anonymous';
          video.muted = true;
          video.playsInline = true;
          activeVideoElementsRef.current.set(clip.id, video);
        }

        const mediaTime = getSourceTimeForTimelineTime(clip, currentTime);
        if (Math.abs(video.currentTime - mediaTime) > 0.05) {
          video.currentTime = mediaTime;
        }

        if (isPlaying && video.paused) {
          video.play().catch(() => {});
        } else if (!isPlaying && !video.paused) {
          video.pause();
        }

        const aspect = (video.videoWidth || targetWidth) / (video.videoHeight || targetHeight);
        let drawW = targetWidth;
        let drawH = targetWidth / aspect;
        if (drawH < targetHeight) {
          drawH = targetHeight;
          drawW = targetHeight * aspect;
        }
        ctx.drawImage(video, -drawW / 2, -drawH / 2, drawW, drawH);
      }
      // Render Text Clip
      else if (clip.type === 'text' && clip.text) {
        const text = clip.text;
        ctx.font = `${text.bold ? 'bold ' : ''}${text.italic ? 'italic ' : ''}${text.fontSize * 2}px ${text.fontFamily}`;
        ctx.textAlign = text.alignment;
        ctx.textBaseline = 'middle';

        if (text.backgroundColor !== 'transparent') {
          const metrics = ctx.measureText(text.content);
          const padding = 20;
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

    // Render Clips / Transitions
    visibleClips.forEach((clip) => {
      const relTime = currentTime - clip.startTime;
      const hasTransition = clip.transition && clip.transition.type !== 'none';

      if (hasTransition && relTime < (clip.transition?.duration || 0.5)) {
        const transDur = clip.transition?.duration || 0.5;
        const progress = relTime / transDur;

        renderTransitionEffect(
          clip.transition!.type,
          progress,
          ctx,
          targetWidth,
          targetHeight,
          () => {},
          () => drawSingleClip(clip)
        );
      } else {
        drawSingleClip(clip);
      }
    });

    // Draw Selected Clip Bounding Box
    if (selectedClip) {
      const relTime = currentTime - selectedClip.startTime;
      const currentTransform = getInterpolatedTransform(selectedClip, relTime);
      const centerX = targetWidth / 2 + (currentTransform.x / 100) * targetWidth;
      const centerY = targetHeight / 2 + (currentTransform.y / 100) * targetHeight;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((currentTransform.rotation * Math.PI) / 180);
      ctx.scale(currentTransform.scale, currentTransform.scale);

      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(-targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);

      // Handle Corner Nodes
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      [
        [-targetWidth / 2, -targetHeight / 2],
        [targetWidth / 2, -targetHeight / 2],
        [-targetWidth / 2, targetHeight / 2],
        [targetWidth / 2, targetHeight / 2],
      ].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      ctx.restore();
    }
  }, [currentTime, isPlaying, aspectRatio, tracks, selectedClip, containerSize]);

  // Interactive Direct Dragging on Canvas
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!selectedClip) return;
    setIsDraggingCanvas(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      initialX: selectedClip.transform.x,
      initialY: selectedClip.transform.y,
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCanvas || !dragStart || !selectedClip || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

    updateClipTransform(selectedClip.id, {
      x: dragStart.initialX + deltaX,
      y: dragStart.initialY + deltaY,
    });
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingCanvas(false);
    setDragStart(null);
  };

  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 30);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
  };

  const totalDuration = getProjectDuration();

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-dark-950 flex flex-col items-center justify-center p-4 relative select-none overflow-hidden"
    >
      {/* Player Canvas Area */}
      <div
        className="flex-1 flex items-center justify-center relative w-full h-full"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        <canvas
          ref={canvasRef}
          className="rounded-xl shadow-2xl border border-dark-700 bg-dark-900 cursor-move transition-transform"
        />
      </div>

      {/* Floating Transport Bar */}
      <div className="absolute bottom-6 bg-dark-800/90 backdrop-blur-md border border-dark-700 rounded-2xl px-5 py-2.5 flex items-center space-x-6 shadow-2xl z-20">
        <button
          onClick={() => setCurrentTime(0)}
          className="p-1.5 text-gray-400 hover:text-cyan-400 rounded-lg transition"
          title="Jump to Start"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 transition transform active:scale-95"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>

        <button
          onClick={() => setCurrentTime(totalDuration)}
          className="p-1.5 text-gray-400 hover:text-cyan-400 rounded-lg transition"
          title="Jump to End"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-dark-700" />

        {/* Timecode Badge */}
        <div className="font-mono text-xs text-gray-300">
          <span className="text-cyan-400 font-bold">{formatTimecode(currentTime)}</span>
          <span className="text-gray-500 mx-1">/</span>
          <span>{formatTimecode(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
};
