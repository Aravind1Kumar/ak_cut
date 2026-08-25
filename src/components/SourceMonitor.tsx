import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Scissors,
  Plus,
  ArrowRight,
  Video,
  BookmarkPlus,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { MediaAsset } from '../types/timeline';

interface SourceMonitorProps {
  asset: MediaAsset;
  onClose?: () => void;
}

export const SourceMonitor: React.FC<SourceMonitorProps> = ({ asset, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(asset.duration || 10);
  const [inPoint, setInPoint] = useState<number>(asset.inPoint ?? 0);
  const [outPoint, setOutPoint] = useState<number>(asset.outPoint ?? (asset.duration || 10));

  const { addClipToTrack, addTrack, tracks, setSelectedClipId } = useTimelineStore();

  useEffect(() => {
    setInPoint(asset.inPoint ?? 0);
    setOutPoint(asset.outPoint ?? asset.duration ?? 10);
    setCurrentTime(0);
    setIsPlaying(false);
  }, [asset]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (outPoint > 0 && videoRef.current.currentTime >= outPoint && isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || 10;
      setDuration(dur);
      if (!asset.outPoint) setOutPoint(dur);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        if (currentTime >= outPoint) {
          videoRef.current.currentTime = inPoint;
        }
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMarkIn = () => {
    setInPoint(currentTime);
    if (outPoint <= currentTime) {
      setOutPoint(Math.min(duration, currentTime + 2));
    }
  };

  const handleMarkOut = () => {
    if (currentTime > inPoint) {
      setOutPoint(currentTime);
    }
  };

  const handleInsertSegmentToTimeline = () => {
    const segmentDuration = Math.max(0.5, outPoint - inPoint);
    let targetTrack = tracks.find((t) => t.type === asset.type);
    let targetTrackId = targetTrack?.id || addTrack(asset.type);

    const clipId = addClipToTrack(targetTrackId, {
      name: `${asset.name} (Cut)`,
      type: asset.type,
      src: asset.src,
      duration: segmentDuration,
      mediaOffset: inPoint,
      sourceDuration: duration,
    });

    setSelectedClipId(clipId);
    if (onClose) onClose();
  };

  const formatTimecode = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="bg-dark-900 border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl flex flex-col p-3 space-y-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-dark-700 pb-2">
        <div className="flex items-center space-x-2 truncate">
          <Video className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-bold text-gray-200 truncate">{asset.name}</span>
          <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/40">
            Source Monitor
          </span>
        </div>
      </div>

      {/* Video Preview Box */}
      <div className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center h-44 border border-dark-700">
        {asset.type === 'video' ? (
          <video
            ref={videoRef}
            src={asset.src}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            className="w-full h-full object-contain"
          />
        ) : (
          <img src={asset.src} alt={asset.name} className="w-full h-full object-contain" />
        )}
      </div>

      {/* Scrubber Bar with In/Out Highlight */}
      <div className="space-y-1">
        <div className="relative w-full h-3 bg-dark-950 rounded-lg overflow-hidden border border-dark-700 cursor-pointer">
          {/* Highlighted In-Out Segment */}
          <div
            className="absolute top-0 bottom-0 bg-cyan-500/30 border-x border-cyan-400"
            style={{
              left: `${(inPoint / duration) * 100}%`,
              width: `${((outPoint - inPoint) / duration) * 100}%`,
            }}
          />
          {/* Current Scrubber Head */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-red-500"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
          <input
            type="range"
            min="0"
            max={duration}
            step="0.05"
            value={currentTime}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setCurrentTime(val);
              if (videoRef.current) videoRef.current.currentTime = val;
            }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>

        {/* Timecode & In/Out Information */}
        <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
          <span>Current: <strong className="text-cyan-400">{formatTimecode(currentTime)}</strong></span>
          <span>In: <strong className="text-green-400">{formatTimecode(inPoint)}</strong></span>
          <span>Out: <strong className="text-red-400">{formatTimecode(outPoint)}</strong></span>
          <span>Cut Length: <strong className="text-cyan-300">{(outPoint - inPoint).toFixed(1)}s</strong></span>
        </div>
      </div>

      {/* In / Out Cut Controls */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleMarkIn}
          className="py-1.5 px-2 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg text-xs font-semibold text-gray-200 flex items-center justify-center space-x-1 transition"
        >
          <BookmarkPlus className="w-3.5 h-3.5 text-green-400" />
          <span>Set In (I) [{formatTimecode(inPoint)}]</span>
        </button>

        <button
          onClick={handleMarkOut}
          className="py-1.5 px-2 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg text-xs font-semibold text-gray-200 flex items-center justify-center space-x-1 transition"
        >
          <BookmarkPlus className="w-3.5 h-3.5 text-red-400" />
          <span>Set Out (O) [{formatTimecode(outPoint)}]</span>
        </button>
      </div>

      {/* Insert Selected Cut Segment to Timeline Button */}
      <button
        onClick={handleInsertSegmentToTimeline}
        className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center space-x-2 transition transform active:scale-95"
      >
        <Plus className="w-4 h-4" />
        <span>Insert Cut Segment to Timeline ({(outPoint - inPoint).toFixed(1)}s)</span>
      </button>
    </div>
  );
};
