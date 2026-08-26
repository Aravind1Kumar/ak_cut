import React, { useRef, useState, useEffect } from 'react';
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
  Magnet,
  FileAudio,
  ArrowRightLeft,
  Bookmark,
  Layers,
  Edit3,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { Clip, Track, MediaType } from '../types/timeline';
import { extractAudioPeaks } from '../utils/audioWaveform';

const ZOOM_PRESETS = [10, 25, 50, 75, 100, 150, 200, 400];

export const Timeline: React.FC = () => {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [draggingClip, setDraggingClip] = useState<{ id: string; startX: number; originalStart: number } | null>(null);
  const [trimmingClip, setTrimmingClip] = useState<{ id: string; edge: 'left' | 'right'; startX: number; originalStart: number; originalDuration: number } | null>(null);
  const [isScrubbingPlayhead, setIsScrubbingPlayhead] = useState(false);
  const [clipWaveforms, setClipWaveforms] = useState<Record<string, number[]>>({});
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // Context Menu State
  const [clipContextMenu, setClipContextMenu] = useState<{ x: number; y: number; clipId: string } | null>(null);
  const [trackContextMenu, setTrackContextMenu] = useState<{ x: number; y: number; trackId: string } | null>(null);
  const [markerContextMenu, setMarkerContextMenu] = useState<{ x: number; y: number; markerId: string } | null>(null);

  const {
    tracks,
    currentTime,
    maxTimelineDuration,
    zoomLevel,
    selectedClipId,
    selectedClipIds,
    snappingEnabled,
    rippleDeleteEnabled,
    markers,
    setCurrentTime,
    setZoomLevel,
    setSelectedClipId,
    toggleSelectClipId,
    clearSelection,
    setSnappingEnabled,
    setRippleDeleteEnabled,
    addMarker,
    removeMarker,
    addTrack,
    deleteTrack,
    renameTrack,
    toggleTrackMute,
    toggleTrackHidden,
    toggleTrackLocked,
    updateClip,
    splitSelectedClip,
    duplicateSelectedClip,
    deleteSelectedClip,
    detachAudioFromSelectedClip,
    getProjectDuration,
  } = useTimelineStore();

  // Keyboard Navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }

      const fps = 30;
      const frameTime = 1 / fps;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? frameTime * 10 : frameTime;
        setCurrentTime(Math.max(0, currentTime - step));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? frameTime * 10 : frameTime;
        setCurrentTime(currentTime + step);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentTime(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentTime(getProjectDuration());
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        addMarker();
      } else if (e.key === 'Escape') {
        clearSelection();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentTime, getProjectDuration]);

  // Extract PCM Waveforms
  useEffect(() => {
    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        if ((clip.type === 'audio' || clip.type === 'video') && clip.src && !clipWaveforms[clip.id]) {
          extractAudioPeaks(clip.src, 60).then((peaks) => {
            setClipWaveforms((prev) => ({ ...prev, [clip.id]: peaks }));
          });
        }
      });
    });
  }, [tracks]);

  // Close context menus on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setClipContextMenu(null);
      setTrackContextMenu(null);
      setMarkerContextMenu(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const updateScrubPosition = (clientX: number) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const newTime = Math.max(0, clickX / zoomLevel);
    setCurrentTime(newTime);
  };

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbingPlayhead(true);
    updateScrubPosition(e.clientX);
  };

  // Context Menus
  const handleClipContextMenu = (e: React.MouseEvent, clipId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedClipId(clipId);
    setClipContextMenu({ x: e.clientX, y: e.clientY, clipId });
  };

  const handleTrackHeaderContextMenu = (e: React.MouseEvent, trackId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setTrackContextMenu({ x: e.clientX, y: e.clientY, trackId });
  };

  const handleMarkerContextMenu = (e: React.MouseEvent, markerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setMarkerContextMenu({ x: e.clientX, y: e.clientY, markerId });
  };

  // Safe Track Deletion Check
  const handleDeleteTrackSafely = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (track && track.clips.length > 0) {
      const ok = window.confirm(`Track "${track.name}" contains ${track.clips.length} clip(s). Delete track and its clips?`);
      if (!ok) return;
    }
    deleteTrack(trackId);
  };

  // Drag / Trim Handlers with Lock Enforcement & Magnet Snapping
  const handleClipMouseDown = (e: React.MouseEvent, clip: Clip, track: Track) => {
    if (track.locked) {
      alert(`Track "${track.name}" is locked. Unlock track to move or edit clips.`);
      return;
    }
    e.stopPropagation();

    if (e.ctrlKey || e.metaKey) {
      toggleSelectClipId(clip.id);
    } else {
      setSelectedClipId(clip.id);
    }

    setDraggingClip({
      id: clip.id,
      startX: e.clientX,
      originalStart: clip.startTime,
    });
  };

  const handleTrimMouseDown = (e: React.MouseEvent, clip: Clip, track: Track, edge: 'left' | 'right') => {
    if (track.locked) {
      alert(`Track "${track.name}" is locked. Unlock track to trim clips.`);
      return;
    }
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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isScrubbingPlayhead) {
      updateScrubPosition(e.clientX);
    } else if (draggingClip) {
      const deltaX = e.clientX - draggingClip.startX;
      let deltaTime = deltaX / zoomLevel;
      let newStart = Math.max(0, draggingClip.originalStart + deltaTime);

      // Intelligent Magnet Snapping with Shift Bypass
      const effectiveSnapping = snappingEnabled && !isShiftPressed;
      if (effectiveSnapping) {
        const snapTargets = [0, currentTime, ...markers.map((m) => m.time)];
        tracks.forEach((t) => {
          t.clips.forEach((c) => {
            if (c.id !== draggingClip.id) {
              snapTargets.push(c.startTime);
              snapTargets.push(c.startTime + c.duration);
            }
          });
        });

        for (const target of snapTargets) {
          if (Math.abs(newStart - target) < 0.2) {
            newStart = target;
            break;
          }
        }
      }

      updateClip(draggingClip.id, { startTime: newStart });
    } else if (trimmingClip) {
      const deltaX = e.clientX - trimmingClip.startX;
      const deltaTime = deltaX / zoomLevel;

      if (trimmingClip.edge === 'left') {
        const newStart = Math.max(0, trimmingClip.originalStart + deltaTime);
        const newDuration = Math.max(0.3, trimmingClip.originalDuration - deltaTime);
        updateClip(trimmingClip.id, { startTime: newStart, duration: newDuration });
      } else {
        const newDuration = Math.max(0.3, trimmingClip.originalDuration + deltaTime);
        updateClip(trimmingClip.id, { duration: newDuration });
      }
    }
  };

  const handleMouseUp = () => {
    setIsScrubbingPlayhead(false);
    setDraggingClip(null);
    setTrimmingClip(null);
  };

  const getTrackIcon = (type: MediaType) => {
    switch (type) {
      case 'video':
        return <Film className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-green-400 shrink-0" />;
      case 'text':
      case 'caption':
        return <Type className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
  };

  const totalRulerWidth = maxTimelineDuration * zoomLevel;
  const timeStep = zoomLevel > 100 ? 1 : zoomLevel > 40 ? 5 : 10;
  const rulerTicks = [];
  for (let i = 0; i <= maxTimelineDuration; i += timeStep) {
    rulerTicks.push(i);
  }

  return (
    <div
      className="h-64 bg-dark-800 border-t border-dark-700 flex flex-col select-none z-30 overflow-hidden relative"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Timeline Toolbar Bar */}
      <div className="h-10 bg-dark-900/60 border-b border-dark-700 px-4 flex items-center justify-between overflow-x-auto scrollbar-none">
        {/* Toolbar Buttons with Shortcut Tooltips */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={splitSelectedClip}
            title="Split selected clip at playhead — S"
            className="flex items-center space-x-1 px-2.5 py-1 bg-dark-700/60 hover:bg-dark-700 text-gray-200 hover:text-cyan-400 rounded-md text-xs font-semibold transition"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Split (S)</span>
          </button>

          <button
            onClick={duplicateSelectedClip}
            title="Duplicate selected clip — Ctrl+D"
            className="flex items-center space-x-1 px-2.5 py-1 bg-dark-700/60 hover:bg-dark-700 text-gray-200 hover:text-cyan-400 rounded-md text-xs font-semibold transition"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>

          <button
            onClick={detachAudioFromSelectedClip}
            title="Detach Audio from Video clip"
            className="flex items-center space-x-1 px-2.5 py-1 bg-dark-700/60 hover:bg-dark-700 text-gray-200 hover:text-cyan-400 rounded-md text-xs font-semibold transition"
          >
            <FileAudio className="w-3.5 h-3.5" />
            <span>Detach Audio</span>
          </button>

          <button
            onClick={deleteSelectedClip}
            title="Delete selected clip — Delete"
            className="flex items-center space-x-1 px-2.5 py-1 bg-dark-700/60 hover:bg-dark-700 text-gray-200 hover:text-red-400 rounded-md text-xs font-semibold transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <div className="h-4 w-[1px] bg-dark-700 mx-1.5" />

          {/* Add Marker Shortcut */}
          <button
            onClick={() => addMarker()}
            title="Add marker at playhead — M"
            className="flex items-center space-x-1 px-2.5 py-1 bg-dark-700/60 hover:bg-dark-700 text-gray-200 hover:text-amber-400 rounded-md text-xs font-semibold transition"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Marker (M)</span>
          </button>

          <div className="h-4 w-[1px] bg-dark-700 mx-1.5" />

          {/* Magnet Snapping Toggle */}
          <button
            onClick={() => setSnappingEnabled(!snappingEnabled)}
            title="Toggle Magnet Snapping (Hold Shift to bypass)"
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
              snappingEnabled
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-dark-700/60 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Snap</span>
          </button>

          {/* Ripple Delete Toggle */}
          <button
            onClick={() => setRippleDeleteEnabled(!rippleDeleteEnabled)}
            title="Toggle Track-Aware Ripple Delete"
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
              rippleDeleteEnabled
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'bg-dark-700/60 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Ripple</span>
          </button>
        </div>

        {/* Timeline Zoom Presets & Slider */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="hidden lg:flex items-center space-x-1 bg-dark-900/80 p-0.5 rounded-lg border border-dark-700 text-[10px]">
            {ZOOM_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setZoomLevel(preset)}
                className={`px-1.5 py-0.5 rounded transition ${
                  Math.abs(zoomLevel - preset) < 5
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1">
            <ZoomOut className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="range"
              min="10"
              max="400"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseInt(e.target.value))}
              className="w-20 sm:w-24 accent-cyan-400 bg-dark-900 rounded-lg cursor-pointer h-1.5"
            />
            <ZoomIn className="w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Main Track & Timeline Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Track Headers (Left Column) */}
        <div className="w-56 bg-dark-800 border-r border-dark-700 flex flex-col z-20 shadow-lg shrink-0">
          <div className="h-7 border-b border-dark-700 bg-dark-900/40 px-3 flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tracks</span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => addTrack('video', 'New Video Track')}
                className="p-0.5 text-gray-400 hover:text-cyan-400 rounded transition"
                title="Add New Video Track"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {tracks.map((track) => (
              <div
                key={track.id}
                onContextMenu={(e) => handleTrackHeaderContextMenu(e, track.id)}
                className={`h-14 border-b border-dark-700/60 px-3 flex items-center justify-between transition group ${
                  track.locked ? 'bg-red-950/20' : 'bg-dark-800/80 hover:bg-dark-700/30'
                }`}
              >
                <div className="flex items-center space-x-2 truncate max-w-[110px]">
                  {getTrackIcon(track.type)}
                  <span className="text-xs font-semibold text-gray-300 truncate">{track.name}</span>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => toggleTrackHidden(track.id)}
                    title={track.hidden ? 'Show Track (Visible in Export)' : 'Hide Track (Invisible in Export)'}
                    className={`p-1 rounded hover:bg-dark-600 transition ${
                      track.hidden ? 'text-amber-400' : 'text-gray-500 hover:text-gray-200'
                    }`}
                  >
                    {track.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => toggleTrackMute(track.id)}
                    title={track.muted ? 'Unmute Track (Audible in Export)' : 'Mute Track (Silent in Export)'}
                    className={`p-1 rounded hover:bg-dark-600 transition ${
                      track.muted ? 'text-red-400' : 'text-gray-500 hover:text-gray-200'
                    }`}
                  >
                    {track.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => toggleTrackLocked(track.id)}
                    title={track.locked ? 'Unlock Track' : 'Lock Track (Prevents editing clips)'}
                    className={`p-1 rounded hover:bg-dark-600 transition ${
                      track.locked ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-200'
                    }`}
                  >
                    {track.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => handleDeleteTrackSafely(track.id)}
                    title="Delete Track"
                    className="p-1 text-gray-500 hover:text-red-400 hover:bg-dark-600 rounded transition opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Ruler & Track Content Canvas */}
        <div
          className="flex-1 overflow-x-auto overflow-y-auto relative"
          ref={timelineRef}
          onMouseDown={handleTimelineMouseDown}
        >
          {/* Playhead Red Needle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
            style={{ left: `${currentTime * zoomLevel}px` }}
          >
            <div className="w-3 h-3 bg-red-500 transform -translate-x-[5px] rotate-45 rounded-sm shadow-md" />
          </div>

          {/* Time Ruler & Timeline Markers */}
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

            {/* Persistent Timeline Markers (Hidden in export) */}
            {markers.map((marker) => (
              <div
                key={marker.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentTime(marker.time);
                }}
                onContextMenu={(e) => handleMarkerContextMenu(e, marker.id)}
                className="absolute top-0 z-20 flex items-center space-x-1 bg-amber-500 text-black px-1.5 py-0.5 rounded-b text-[9px] font-bold shadow-md cursor-pointer hover:bg-amber-400 transition"
                style={{ left: `${marker.time * zoomLevel}px` }}
                title={`Marker: ${marker.label} (${marker.time.toFixed(1)}s)`}
              >
                <Bookmark className="w-2.5 h-2.5 fill-current" />
                <span>{marker.label}</span>
              </div>
            ))}
          </div>

          {/* Tracks Clip Container */}
          <div style={{ width: `${totalRulerWidth}px` }} className="relative">
            {tracks.map((track) => (
              <div
                key={track.id}
                className={`h-14 border-b border-dark-700/60 relative ${
                  track.locked ? 'bg-dark-900/60 opacity-60' : 'bg-dark-900/20'
                }`}
              >
                {track.clips.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-600 font-medium italic pointer-events-none">
                    Empty track — Drag media here
                  </div>
                )}

                {track.clips.map((clip) => {
                  const clipLeft = clip.startTime * zoomLevel;
                  const clipWidth = clip.duration * zoomLevel;
                  const isSelected = selectedClipIds.includes(clip.id);
                  const hasTransition = clip.transition && clip.transition.type !== 'none';
                  const peaks = clipWaveforms[clip.id];

                  return (
                    <div
                      key={clip.id}
                      onMouseDown={(e) => handleClipMouseDown(e, clip, track)}
                      onContextMenu={(e) => handleClipContextMenu(e, clip.id)}
                      style={{
                        left: `${clipLeft}px`,
                        width: `${clipWidth}px`,
                      }}
                      className={`absolute top-1.5 bottom-1.5 rounded-lg p-2 cursor-grab active:cursor-grabbing border flex items-center justify-between overflow-hidden shadow-sm transition-shadow relative ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-900/80 to-blue-900/80 border-cyan-400 ring-2 ring-cyan-500/40'
                          : clip.type === 'video'
                          ? 'bg-blue-950/60 border-blue-700/60 hover:border-blue-500'
                          : clip.type === 'audio'
                          ? 'bg-emerald-950/60 border-emerald-700/60 hover:border-emerald-500'
                          : 'bg-purple-950/60 border-purple-700/60 hover:border-purple-500'
                      }`}
                    >
                      {/* Waveform Overlay */}
                      {peaks && (clip.type === 'audio' || clip.type === 'video') && (
                        <div className="absolute inset-x-2 bottom-1 top-5 flex items-end justify-between opacity-30 pointer-events-none">
                          {peaks.map((val, idx) => (
                            <div
                              key={idx}
                              className="w-0.5 bg-emerald-300 rounded-t"
                              style={{ height: `${val * 100}%` }}
                            />
                          ))}
                        </div>
                      )}

                      {/* Trim Handles */}
                      <div
                        onMouseDown={(e) => handleTrimMouseDown(e, clip, track, 'left')}
                        className={`absolute left-0 top-0 bottom-0 w-2 hover:w-3.5 cursor-ew-resize rounded-l transition-all z-10 ${
                          isSelected ? 'bg-cyan-400' : 'bg-white/30 hover:bg-cyan-400'
                        }`}
                        title="Trim start duration"
                      />

                      {/* Clip Label */}
                      <div className="flex items-center space-x-1.5 ml-2.5 truncate z-10">
                        {getTrackIcon(clip.type)}
                        <span className="text-[11px] font-bold text-white truncate">{clip.name}</span>
                      </div>

                      {/* Visual Transition Badge */}
                      {hasTransition && (
                        <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-gradient-to-r from-purple-600 to-cyan-500 text-white rounded text-[9px] font-extrabold shadow z-10">
                          <ArrowRightLeft className="w-3 h-3" />
                          <span className="uppercase">{clip.transition?.type}</span>
                        </div>
                      )}

                      {/* Duration Badge */}
                      <span className="text-[10px] font-mono text-gray-300 mr-2.5 bg-black/40 px-1.5 py-0.5 rounded z-10">
                        {clip.duration.toFixed(1)}s
                      </span>

                      <div
                        onMouseDown={(e) => handleTrimMouseDown(e, clip, track, 'right')}
                        className={`absolute right-0 top-0 bottom-0 w-2 hover:w-3.5 cursor-ew-resize rounded-r transition-all z-10 ${
                          isSelected ? 'bg-cyan-400' : 'bg-white/30 hover:bg-cyan-400'
                        }`}
                        title="Trim end duration"
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clip Context Menu */}
      {clipContextMenu && (
        <div
          style={{ top: `${clipContextMenu.y}px`, left: `${clipContextMenu.x}px` }}
          className="fixed bg-dark-800 border border-dark-600 rounded-xl shadow-2xl py-1 z-50 min-w-[160px] text-xs font-semibold text-gray-200"
        >
          <button
            onClick={splitSelectedClip}
            className="w-full px-3 py-2 text-left hover:bg-dark-700 flex items-center space-x-2 text-cyan-300"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Split at Playhead (S)</span>
          </button>
          <button
            onClick={duplicateSelectedClip}
            className="w-full px-3 py-2 text-left hover:bg-dark-700 flex items-center space-x-2"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate Clip (Ctrl+D)</span>
          </button>
          <button
            onClick={deleteSelectedClip}
            className="w-full px-3 py-2 text-left hover:bg-dark-700 flex items-center space-x-2 text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Clip</span>
          </button>
        </div>
      )}

      {/* Track Header Context Menu */}
      {trackContextMenu && (
        <div
          style={{ top: `${trackContextMenu.y}px`, left: `${trackContextMenu.x}px` }}
          className="fixed bg-dark-800 border border-dark-600 rounded-xl shadow-2xl py-1 z-50 min-w-[160px] text-xs font-semibold text-gray-200"
        >
          <button
            onClick={() => {
              const name = prompt('Enter new track name:');
              if (name) renameTrack(trackContextMenu.trackId, name);
            }}
            className="w-full px-3 py-2 text-left hover:bg-dark-700 flex items-center space-x-2"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Rename Track</span>
          </button>
          <button
            onClick={() => toggleTrackLocked(trackContextMenu.trackId)}
            className="w-full px-3 py-2 text-left hover:bg-dark-700 flex items-center space-x-2"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock / Unlock Track</span>
          </button>
          <button
            onClick={() => toggleTrackMute(trackContextMenu.trackId)}
            className="w-full px-3 py-2 text-left hover:bg-dark-700 flex items-center space-x-2"
          >
            <VolumeX className="w-3.5 h-3.5" />
            <span>Mute / Unmute Track</span>
          </button>
          <button
            onClick={() => toggleTrackHidden(trackContextMenu.trackId)}
            className="w-full px-3 py-2 text-left hover:bg-dark-700 flex items-center space-x-2"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Hide / Show Track</span>
          </button>
          <div className="h-[1px] bg-dark-700 my-1" />
          <button
            onClick={() => handleDeleteTrackSafely(trackContextMenu.trackId)}
            className="w-full px-3 py-2 text-left hover:bg-dark-700 flex items-center space-x-2 text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Track</span>
          </button>
        </div>
      )}

      {/* Marker Context Menu */}
      {markerContextMenu && (
        <div
          style={{ top: `${markerContextMenu.y}px`, left: `${markerContextMenu.x}px` }}
          className="fixed bg-dark-800 border border-dark-600 rounded-xl shadow-2xl py-1 z-50 min-w-[140px] text-xs font-semibold text-gray-200"
        >
          <button
            onClick={() => {
              removeMarker(markerContextMenu.markerId);
            }}
            className="w-full px-3 py-2 text-left hover:bg-dark-700 flex items-center space-x-2 text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Marker</span>
          </button>
        </div>
      )}
    </div>
  );
};
