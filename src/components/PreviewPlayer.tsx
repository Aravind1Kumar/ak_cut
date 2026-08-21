import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { Clip, Keyframe } from '../types/timeline';

export const PreviewPlayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const activeVideoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());

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

  // Render Frame & Keyframe & Masking & Chroma Key Processor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 1280;
    let height = 720;
    if (aspectRatio === '9:16') {
      width = 720;
      height = 1280;
    } else if (aspectRatio === '1:1') {
      width = 1080;
      height = 1080;
    } else if (aspectRatio === '4:3') {
      width = 960;
      height = 720;
    }

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Clear background
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, width, height);

    // Active clips
    const visibleClips: Clip[] = [];
    tracks.forEach((track) => {
      if (track.hidden) return;
      track.clips.forEach((clip) => {
        if (currentTime >= clip.startTime && currentTime <= clip.startTime + clip.duration) {
          visibleClips.push(clip);
        }
      });
    });

    visibleClips.sort((a, b) => {
      const trackAIdx = tracks.findIndex((t) => t.id === a.trackId);
      const trackBIdx = tracks.findIndex((t) => t.id === b.trackId);
      return trackBIdx - trackAIdx;
    });

    activeVideoElementsRef.current.forEach((videoEl, clipId) => {
      const isActive = visibleClips.some((c) => c.id === clipId);
      if (!isActive || !isPlaying) {
        if (!videoEl.paused) videoEl.pause();
      }
    });

    visibleClips.forEach((clip) => {
      const parentTrack = tracks.find((t) => t.id === clip.trackId);
      const isMuted = parentTrack?.muted || clip.audio.muted;

      const relTime = currentTime - clip.startTime;
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
        }
        ctx.clip();
      }

      // Center transform
      const centerX = width / 2 + (currentTransform.x / 100) * width;
      const centerY = height / 2 + (currentTransform.y / 100) * height;
      ctx.translate(centerX, centerY);
      ctx.rotate((currentTransform.rotation * Math.PI) / 180);
      ctx.scale(currentTransform.scale, currentTransform.scale);

      // Transitions Opacity blending
      let opacity = currentTransform.opacity;
      if (clip.transition && clip.transition.type !== 'none') {
        const transDur = clip.transition.duration || 0.5;
        if (relTime < transDur) {
          opacity *= relTime / transDur;
        }
      }
      ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

      const f = clip.filter;
      ctx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) blur(${f.blur}px) hue-rotate(${f.hueRotate}deg) sepia(${f.sepia}%)`;

      if ((clip.type === 'video' || clip.type === 'audio') && clip.src) {
        let videoEl = activeVideoElementsRef.current.get(clip.id);
        if (!videoEl) {
          videoEl = document.createElement('video');
          videoEl.src = clip.src;
          videoEl.crossOrigin = 'anonymous';
          activeVideoElementsRef.current.set(clip.id, videoEl);
        }

        videoEl.muted = isMuted;
        videoEl.volume = Math.max(0, Math.min(1, clip.audio.volume));

        const mediaTime = relTime * clip.speed + clip.mediaOffset;
        if (Math.abs(videoEl.currentTime - mediaTime) > 0.15) {
          videoEl.currentTime = mediaTime;
        }

        if (isPlaying) {
          if (videoEl.paused) {
            videoEl.play().catch(() => {});
          }
        } else {
          if (!videoEl.paused) {
            videoEl.pause();
          }
        }

        if (clip.type === 'video') {
          try {
            ctx.drawImage(videoEl, -width / 2, -height / 2, width, height);

            // Chroma Key (Green Screen) Pixel Processor
            if (clip.chromaKey?.enabled) {
              const frameData = ctx.getImageData(0, 0, width, height);
              const data = frameData.data;
              const threshold = (clip.chromaKey.threshold / 100) * 255;

              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Check Green Dominance
                if (g > 100 && g > r + threshold / 2 && g > b + threshold / 2) {
                  data[i + 3] = 0; // Transparent
                }
              }
              ctx.putImageData(frameData, 0, 0);
            }
          } catch (e) {}
        }
      } else if (clip.type === 'text' && clip.text) {
        const text = clip.text;
        ctx.font = `${text.bold ? 'bold ' : ''}${text.italic ? 'italic ' : ''}${text.fontSize * 1.5}px ${text.fontFamily}`;
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

      // Selection bounding box
      if (clip.id === selectedClipId) {
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 8]);
        ctx.strokeRect(-width / 2, -height / 2, width, height);
      }

      ctx.restore();
    });
  }, [currentTime, aspectRatio, tracks, selectedClipId, isPlaying]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedClip) return;
    setIsDraggingCanvas(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      initialX: selectedClip.transform.x,
      initialY: selectedClip.transform.y,
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingCanvas || !dragStart || !selectedClip || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

    updateClipTransform(selectedClip.id, {
      x: Math.round(dragStart.initialX + deltaX),
      y: Math.round(dragStart.initialY + deltaY),
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

  const handleStepFrame = (frames: number) => {
    const frameTime = 1 / 30;
    setCurrentTime(currentTime + frames * frameTime);
  };

  const displayDuration = getProjectDuration();

  return (
    <main className="flex-1 flex flex-col bg-dark-900 overflow-hidden relative select-none">
      {/* Canvas Viewport */}
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden bg-black/40">
        <div className="relative shadow-2xl rounded-lg overflow-hidden border border-dark-700/60 max-h-full flex items-center justify-center">
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className={`max-h-[55vh] max-w-full object-contain rounded bg-black ${
              selectedClip ? 'cursor-move' : 'cursor-default'
            }`}
          />
        </div>
      </div>

      {/* Playback Control Bar */}
      <div className="h-12 bg-dark-800 border-t border-dark-700 px-6 flex items-center justify-between z-10">
        {/* Timecode Display */}
        <div className="font-mono text-xs text-cyan-400 font-bold bg-dark-900/80 px-3 py-1.5 rounded-md border border-dark-700">
          {formatTimecode(currentTime)}{' '}
          <span className="text-gray-500 font-normal">/ {formatTimecode(displayDuration)}</span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleStepFrame(-1)}
            title="Step 1 Frame Backward"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition transform active:scale-95"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            onClick={() => handleStepFrame(1)}
            title="Step 1 Frame Forward"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-semibold text-gray-400 bg-dark-700/50 px-2 py-1 rounded">
            30 FPS
          </span>
        </div>
      </div>
    </main>
  );
};
