import React, { useRef, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';

export const AudioMeter: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isPlaying, currentTime, tracks } = useTimelineStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const renderMeter = () => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Background Track Bar
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, w, h);

      if (isPlaying) {
        // Compute pseudo-RMS & Peak level based on current playing audio clips
        const hasAudioClips = tracks.some((t) =>
          !t.muted && t.clips.some((c) => (c.type === 'video' || c.type === 'audio') && !c.audio.muted && currentTime >= c.startTime && currentTime <= c.startTime + c.duration)
        );

        const level = hasAudioClips ? 0.4 + Math.sin(currentTime * 12) * 0.3 + Math.random() * 0.2 : 0;
        const clampedLevel = Math.max(0, Math.min(1, level));

        const fillW = clampedLevel * w;

        // Gradient Green -> Yellow -> Red
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, '#22c55e');
        grad.addColorStop(0.7, '#eab308');
        grad.addColorStop(1.0, '#ef4444');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, fillW, h);

        // Peak Indicator Line
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.min(w - 2, fillW + 2), 0, 2, h);
      } else {
        ctx.fillStyle = '#27272a';
        ctx.fillRect(0, 0, 4, h);
      }

      animationId = requestAnimationFrame(renderMeter);
    };

    renderMeter();
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, currentTime, tracks]);

  return (
    <div className="flex items-center space-x-2 bg-dark-900 border border-dark-700 px-3 py-1.5 rounded-xl">
      <Volume2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
      <div className="flex flex-col space-y-0.5">
        <span className="text-[9px] font-mono font-bold text-gray-400 uppercase">Audio Output Level</span>
        <canvas ref={canvasRef} width={120} height={6} className="rounded-full overflow-hidden block" />
      </div>
    </div>
  );
};
