import React, { useRef, useState } from 'react';
import {
  Scissors,
  Copy,
  Trash2,
  ZoomIn,
  ZoomOut,
  Plus,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Film,
  Music,
  Type,
  Image as ImageIcon,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { Clip, Track, MediaType } from '../types/timeline';

export const Timeline: React.FC = () => {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [draggingClip, setDraggingClip] = useState<{ id: string; startX: number; originalStart: number } | null>(null);
  const [trimmingClip, setTrimmingClip] = useState<{ id: string; edge: 'left' | 'right'; startX: number; originalStart: number; originalDuration: number } | null>(null);

  const {
    tracks,
    currentTime,
    maxTimelineDuration,
    zoomLevel,
    selectedClipId,
    setCurrentTime,
    setZoomLevel,
    setSelectedClipId,
    addTrack,
    updateClip,
    splitSelectedClip,
    duplicateSelectedClip,
    deleteSelectedClip,
  } = useTimelineStore();

  // Handle Playhead Scrubbing
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = Math.max(0, clickX / zoomLevel);
    setCurrentTime(newTime);
  };

  // Handle Dragging Clip to Move
  const handleClipMouseDown = (e: React.MouseEvent, clip: Clip) => {
    e.stopPropagation();
    setSelectedClipId(clip.id);
    setDraggingClip({
      id: clip.id,
      startX: e.clientX,
      originalStart: clip.startTime,
    });
  };

  // Handle Trimming Clip Handles
  const handleTrimMouseDown = (e: React.MouseEvent, clip: Clip, edge: 'left' | 'right') => {
    e.stopPropagation();
    setSelectedClipId(clip.id);
    setTrimmingClip({
      id: clip.id,
      edge,
      startX: e.clientX,
      originalStart: clip.startTime,
      originalDuration: clip.duration,
    });
  };

  // Mouse Move Window Listener for Drag & Trim
  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingClip) {
      const deltaX = e.clientX - draggingClip.startX;
      const deltaTime = deltaX / zoomLevel;
      const newStart = Math.max(0, draggingClip.originalStart + deltaTime);
      updateClip(draggingClip.id, { startTime: newStart });
    } else if (trimmingClip) {
      const deltaX = e.clientX - trimmingClip.startX;
      const deltaTime = deltaX / zoomLevel;

      if (trimmingClip.edge === 'left') {
        const newStart = Math.max(0, trimmingClip.originalStart + deltaTime);
        const newDuration = Math.max(0.5, trimmingClip.originalDuration - deltaTime);
        updateClip(trimmingClip.id, { startTime: newStart, duration: newDuration });
      } else {
        const newDuration = Math.max(0.5, trimmingClip.originalDuration + deltaTime);
        updateClip(trimmingClip.id, { duration: newDuration });
      }
    }
  };

  const handleMouseUp = () => {
    setDraggingClip(null);
    setTrimmingClip(null);
  };

  const getTrackIcon = (type: MediaType) => {
    switch (type) {
      case 'video':
        return <Film className="w-3.5 h-3.5 text-cyan-400" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-green-400" />;
      case 'text':
        return <Type className="w-3.5 h-3.5 text-purple-400" />;
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  // Generate Time Ruler Markers
  const totalRulerWidth = maxTimelineDuration * zoomLevel;
  const timeStep = zoomLevel > 60 ? 1 : zoomLevel > 30 ? 5 : 10;
  const rulerTicks = [];
  for (let i = 0; i <= maxTimelineDuration; i += timeStep) {
    rulerTicks.push(i);
  }

  return (
    <div
      className="h-64 bg-dark-800 border-t border-dark-700 flex flex-col select-none z-30 overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Timeline Toolbar Bar */}
      <div className="h-10 bg-dark-900/60 border-b border-dark-700 px-4 flex items-center justify-between">
        {/* Editing Tools */}
        <div className="flex items-center space-x-1">
          <button
            onClick={splitSelectedClip}
            title="Split Clip at Playhead (S)"
            className="flex items-center space-x-1 px-2.5 py-1 bg-dark-700/60 hover:bg-dark-700 text-gray-200 hover:text-cyan-400 rounded-md text-xs font-semibold transition"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>

          <button
            onClick={duplicateSelectedClip}
            title="Duplicate Selected Clip"
            className="flex items-center space-x-1 px-2.5 py-1 bg-dark-700/60 hover:bg-dark-700 text-gray-200 hover:text-cyan-400 rounded-md text-xs font-semibold transition"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>

          <button
            onClick={deleteSelectedClip}
            title="Delete Selected Clip"
            className="flex items-center space-x-1 px-2.5 py-1 bg-dark-700/60 hover:bg-dark-700 text-gray-200 hover:text-red-400 rounded-md text-xs font-semibold transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <div className="h-4 w-[1px] bg-dark-700 mx-2" />

          {/* Add Track Shortcuts */}
          <div className="flex items-center space-x-1">
            <span className="text-[11px] font-semibold text-gray-500 mr-1">+ Track:</span>
            {(['video', 'audio', 'text'] as MediaType[]).map((t) => (
              <button
                key={t}
                onClick={() => addTrack(t)}
                className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-dark-700/40 hover:bg-dark-700 text-gray-300 transition"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Zoom Controls */}
        <div className="flex items-center space-x-2">
          <ZoomOut className="w-3.5 h-3.5 text-gray-400" />
          <input
            type="range"
            min="10"
            max="150"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseInt(e.target.value))}
            className="w-24 accent-cyan-400 bg-dark-900 rounded-lg cursor-pointer h-1.5"
          />
          <ZoomIn className="w-3.5 h-3.5 text-gray-400" />
        </div>
      </div>

      {/* Main Track & Timeline Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Track Headers (Left Column) */}
        <div className="w-48 bg-dark-800 border-r border-dark-700 flex flex-col z-20 shadow-lg">
          {/* Header Spacer for Ruler */}
          <div className="h-7 border-b border-dark-700 bg-dark-900/40 px-3 flex items-center">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tracks</span>
          </div>

          {/* Track Header Rows */}
          <div className="flex-1 overflow-y-auto">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="h-14 border-b border-dark-700/60 px-3 flex items-center justify-between bg-dark-800/80 hover:bg-dark-700/30 transition"
              >
                <div className="flex items-center space-x-2 truncate">
                  {getTrackIcon(track.type)}
                  <span className="text-xs font-semibold text-gray-300 truncate">{track.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Ruler & Track Content Canvas */}
        <div className="flex-1 overflow-x-auto overflow-y-auto relative" ref={timelineRef} onClick={handleTimelineClick}>
          {/* Playhead Red Needle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
            style={{ left: `${currentTime * zoomLevel}px` }}
          >
            <div className="w-3 h-3 bg-red-500 transform -translate-x-[5px] rotate-45 rounded-sm shadow-md" />
          </div>

          {/* Time Ruler */}
          <div
            className="h-7 border-b border-dark-700 bg-dark-900/60 relative cursor-pointer"
            style={{ width: `${totalRulerWidth}px` }}
          >
            {rulerTicks.map((sec) => (
              <div
                key={sec}
                className="absolute top-0 bottom-0 border-l border-dark-600/50 pl-1 text-[10px] font-mono text-gray-500 pt-0.5"
                style={{ left: `${sec * zoomLevel}px` }}
              >
                {sec}s
              </div>
            ))}
          </div>

          {/* Tracks Clip Container */}
          <div style={{ width: `${totalRulerWidth}px` }} className="relative">
            {tracks.map((track) => (
              <div key={track.id} className="h-14 border-b border-dark-700/60 relative bg-dark-900/20">
                {track.clips.map((clip) => {
                  const clipLeft = clip.startTime * zoomLevel;
                  const clipWidth = clip.duration * zoomLevel;
                  const isSelected = clip.id === selectedClipId;

                  return (
                    <div
                      key={clip.id}
                      onMouseDown={(e) => handleClipMouseDown(e, clip)}
                      style={{
                        left: `${clipLeft}px`,
                        width: `${clipWidth}px`,
                      }}
                      className={`absolute top-1.5 bottom-1.5 rounded-lg p-2 cursor-grab active:cursor-grabbing border flex items-center justify-between overflow-hidden shadow-sm transition-shadow ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-900/80 to-blue-900/80 border-cyan-400 ring-2 ring-cyan-500/30'
                          : clip.type === 'video'
                          ? 'bg-blue-950/60 border-blue-700/60 hover:border-blue-500'
                          : clip.type === 'audio'
                          ? 'bg-emerald-950/60 border-emerald-700/60 hover:border-emerald-500'
                          : 'bg-purple-950/60 border-purple-700/60 hover:border-purple-500'
                      }`}
                    >
                      {/* Left Trim Handle */}
                      <div
                        onMouseDown={(e) => handleTrimMouseDown(e, clip, 'left')}
                        className="absolute left-0 top-0 bottom-0 w-2.5 bg-white/20 hover:bg-cyan-400 cursor-ew-resize rounded-l"
                      />

                      {/* Clip Label */}
                      <div className="flex items-center space-x-1.5 ml-2 truncate">
                        {getTrackIcon(clip.type)}
                        <span className="text-[11px] font-bold text-white truncate">{clip.name}</span>
                      </div>

                      {/* Duration Badge */}
                      <span className="text-[10px] font-mono text-gray-300 mr-2 bg-black/40 px-1.5 py-0.5 rounded">
                        {clip.duration.toFixed(1)}s
                      </span>

                      {/* Right Trim Handle */}
                      <div
                        onMouseDown={(e) => handleTrimMouseDown(e, clip, 'right')}
                        className="absolute right-0 top-0 bottom-0 w-2.5 bg-white/20 hover:bg-cyan-400 cursor-ew-resize rounded-r"
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
