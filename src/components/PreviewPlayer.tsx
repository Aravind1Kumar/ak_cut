import React, { useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { AspectRatio, Clip } from '../types/timeline';

export const PreviewPlayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const activeVideoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  const {
    isPlaying,
    currentTime,
    maxTimelineDuration,
    aspectRatio,
    tracks,
    setIsPlaying,
    setCurrentTime,
  } = useTimelineStore();

  // Playback Loop
  useEffect(() => {
    let lastTime = performance.now();

    const update = (now: number) => {
      if (isPlaying) {
        const delta = (now - lastTime) / 1000;
        const nextTime = currentTime + delta;

        if (nextTime >= maxTimelineDuration) {
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
  }, [isPlaying, currentTime, maxTimelineDuration]);

  // Render Frame to Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions based on aspect ratio
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

    // Filter visible clips active at current time
    const visibleClips: Clip[] = [];
    tracks.forEach((track) => {
      if (track.hidden) return;
      track.clips.forEach((clip) => {
        if (currentTime >= clip.startTime && currentTime <= clip.startTime + clip.duration) {
          visibleClips.push(clip);
        }
      });
    });

    // Sort by track order (render bottom tracks first, top tracks on top)
    // Reverse tracks so video is under text
    visibleClips.sort((a, b) => {
      const trackAIdx = tracks.findIndex((t) => t.id === a.trackId);
      const trackBIdx = tracks.findIndex((t) => t.id === b.trackId);
      return trackBIdx - trackAIdx;
    });

    visibleClips.forEach((clip) => {
      ctx.save();

      // Transform
      const centerX = width / 2 + (clip.transform.x / 100) * width;
      const centerY = height / 2 + (clip.transform.y / 100) * height;
      ctx.translate(centerX, centerY);
      ctx.rotate((clip.transform.rotation * Math.PI) / 180);
      ctx.scale(clip.transform.scale, clip.transform.scale);
      ctx.globalAlpha = clip.transform.opacity;

      // Filter string
      const f = clip.filter;
      ctx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) blur(${f.blur}px) hue-rotate(${f.hueRotate}deg) sepia(${f.sepia}%)`;

      if (clip.type === 'video' && clip.src) {
        let videoEl = activeVideoElementsRef.current.get(clip.id);
        if (!videoEl) {
          videoEl = document.createElement('video');
          videoEl.src = clip.src;
          videoEl.crossOrigin = 'anonymous';
          videoEl.muted = true;
          activeVideoElementsRef.current.set(clip.id, videoEl);
        }

        const mediaTime = (currentTime - clip.startTime) * clip.speed + clip.mediaOffset;
        if (Math.abs(videoEl.currentTime - mediaTime) > 0.1) {
          videoEl.currentTime = mediaTime;
        }

        try {
          ctx.drawImage(videoEl, -width / 2, -height / 2, width, height);
        } catch (e) {
          // Video element not ready
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

      ctx.restore();
    });
  }, [currentTime, aspectRatio, tracks]);

  // Format Timecode HH:MM:SS:FF
  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 30); // 30 FPS frame count
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
  };

  const handleStepFrame = (frames: number) => {
    const frameTime = 1 / 30; // 30 fps
    setCurrentTime(currentTime + frames * frameTime);
  };

  return (
    <main className="flex-1 flex flex-col bg-dark-900 overflow-hidden relative select-none">
      {/* Canvas Viewport */}
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden bg-black/40">
        <div className="relative shadow-2xl rounded-lg overflow-hidden border border-dark-700/60 max-h-full flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="max-h-[55vh] max-w-full object-contain rounded bg-black"
          />
        </div>
      </div>

      {/* Playback Control Bar */}
      <div className="h-12 bg-dark-800 border-t border-dark-700 px-6 flex items-center justify-between z-10">
        {/* Left: Timecode Display */}
        <div className="font-mono text-xs text-cyan-400 font-bold bg-dark-900/80 px-3 py-1.5 rounded-md border border-dark-700">
          {formatTimecode(currentTime)}{' '}
          <span className="text-gray-500 font-normal">/ {formatTimecode(maxTimelineDuration)}</span>
        </div>

        {/* Center: Playback Controls */}
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

        {/* Right: Fullscreen / Video Stats */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-semibold text-gray-400 bg-dark-700/50 px-2 py-1 rounded">
            30 FPS
          </span>
        </div>
      </div>
    </main>
  );
};
