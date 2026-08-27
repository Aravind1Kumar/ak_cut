import React, { useState, useRef, useEffect } from 'react';
import {
  Scissors,
  Copy,
  Trash2,
  Bookmark,
  Plus,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Film,
  Music,
  Type,
  FileAudio,
  Magnet,
  Maximize2,
  Layers,
  ZoomIn,
  ZoomOut,
  FolderPlus,
  FolderMinus,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { Clip, Track, MediaType } from '../types/timeline';

export const Timeline: React.FC = () => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const trackHeaderContainerRef = useRef<HTMLDivElement>(null);
  const trackContentContainerRef = useRef<HTMLDivElement>(null);

  const [isScrubbingPlayhead, setIsScrubbingPlayhead] = useState(false);
  const [draggingClip, setDraggingClip] = useState<{
    id: string;
    startX: number;
    originalStart: number;
    groupId?: string;
    groupOriginalStarts?: { id: string; start: number }[];
  } | null>(null);

  const [trimmingClip, setTrimmingClip] = useState<{
    id: string;
    edge: 'left' | 'right';
    startX: number;
    originalStart: number;
    originalDuration: number;
  } | null>(null);

  const [clipContextMenu, setClipContextMenu] = useState<{ x: number; y: number; clipId: string } | null>(null);
  const [trackContextMenu, setTrackContextMenu] = useState<{ x: number; y: number; trackId: string } | null>(null);
  const [markerContextMenu, setMarkerContextMenu] = useState<{ x: number; y: number; markerId: string } | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  const {
    currentTime,
    zoomLevel,
    snappingEnabled,
    rippleDeleteEnabled,
    tracks,
    markers,
    selectedClipId,
    selectedClipIds,
    setCurrentTime,
    setZoomLevel,
    setSelectedClipId,
    toggleSelectClipId,
    setSelectedClipIds,
    setSnappingEnabled,
    setRippleDeleteEnabled,
    addTrack,
    deleteTrack,
    toggleTrackMute,
    toggleTrackHidden,
    toggleTrackLocked,
    updateClip,
    splitSelectedClip,
    duplicateSelectedClip,
    deleteSelectedClip,
    detachAudioFromSelectedClip,
    addMarker,
    removeMarker,
    groupSelectedClips,
    ungroupSelectedClips,
    getProjectDuration,
  } = useTimelineStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);

      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isContentEditable = (document.activeElement as HTMLElement)?.isContentEditable;
      const { editingTextClipId } = useTimelineStore.getState();

      if (editingTextClipId || activeTag === 'input' || activeTag === 'textarea' || isContentEditable) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        const { isPlaying, setIsPlaying } = useTimelineStore.getState();
        setIsPlaying(!isPlaying);
      } else if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        splitSelectedClip();
      } else if (e.key.toLowerCase() === 'b' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        splitSelectedClip();
      } else if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        addMarker();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedClip();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelectedClip();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) ungroupSelectedClips();
        else groupSelectedClips();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [splitSelectedClip, addMarker, deleteSelectedClip, duplicateSelectedClip, groupSelectedClips, ungroupSelectedClips]);

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

  const handleDeleteTrackSafely = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (track && track.clips.length > 0) {
      const ok = window.confirm(`Track "${track.name}" contains ${track.clips.length} clip(s). Delete track and its clips?`);
      if (!ok) return;
    }
    deleteTrack(trackId);
  };

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

    const groupStarts: { id: string; start: number }[] = [];
    if (clip.groupId || selectedClipIds.length > 1) {
      tracks.forEach((t) => {
        t.clips.forEach((c) => {
          if ((clip.groupId && c.groupId === clip.groupId) || selectedClipIds.includes(c.id)) {
            groupStarts.push({ id: c.id, start: c.startTime });
          }
        });
      });
    }

    setDraggingClip({
      id: clip.id,
      startX: e.clientX,
      originalStart: clip.startTime,
      groupId: clip.groupId,
      groupOriginalStarts: groupStarts,
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

      const actualDelta = newStart - draggingClip.originalStart;
      updateClip(draggingClip.id, { startTime: newStart });

      if (draggingClip.groupOriginalStarts && draggingClip.groupOriginalStarts.length > 0) {
        draggingClip.groupOriginalStarts.forEach((item) => {
          if (item.id !== draggingClip.id) {
            updateClip(item.id, { startTime: Math.max(0, item.start + actualDelta) });
          }
        });
      }
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
        return <Type className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case 'caption':
        return <FileAudio className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      default:
        return <Film className="w-3.5 h-3.5 text-gray-400 shrink-0" />;
    }
  };

  const projectDuration = getProjectDuration();
  const maxTimelineDuration = Math.max(60, projectDuration + 30);
  const totalTimelineWidthPx = maxTimelineDuration * zoomLevel;

  let timeStep = 5;
  if (zoomLevel > 150) timeStep = 1;
  else if (zoomLevel > 80) timeStep = 2;
  else if (zoomLevel < 40) timeStep = 10;

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
        {/* Toolbar Buttons */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={splitSelectedClip}
            title="Razor Blade tool — Split clip at playhead (S or B)"
            className="flex items-center space-x-1 px-2.5 py-1 bg-dark-700/60 hover:bg-dark-700 text-gray-200 hover:text-cyan-400 rounded-md text-xs font-semibold transition"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Blade (B)</span>
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
            onClick={groupSelectedClips}
            disabled={selectedClipIds.length < 2}
            title="Group selected clips — Ctrl+G"
            className="flex items-center space-x-1 px-2.5 py-1 bg-dark-700/60 hover:bg-dark-700 disabled:opacity-30 text-gray-200 hover:text-cyan-400 rounded-md text-xs font-semibold transition"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Group</span>
          </button>

          <button
            onClick={ungroupSelectedClips}
            disabled={selectedClipIds.length === 0}
            title="Ungroup selected clips — Ctrl+Shift+G"
            className="flex items-center space-x-1 px-2.5 py-1 bg-dark-700/60 hover:bg-dark-700 disabled:opacity-30 text-gray-200 hover:text-cyan-400 rounded-md text-xs font-semibold transition"
          >
            <FolderMinus className="w-3.5 h-3.5" />
            <span>Ungroup</span>
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

          <button
            onClick={() => addMarker()}
            title="Add marker at playhead — M"
            className="flex items-center space-x-1 px-2.5 py-1 bg-dark-700/60 hover:bg-dark-700 text-gray-200 hover:text-amber-400 rounded-md text-xs font-semibold transition"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Marker</span>
          </button>
        </div>

        {/* Snapping & Zoom Controls */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setSnappingEnabled(!snappingEnabled)}
            className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-semibold border transition ${
              snappingEnabled
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-dark-800 text-gray-400 border-dark-700 hover:text-gray-200'
            }`}
            title="Toggle Magnet Snapping (Hold Shift to bypass)"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Magnet</span>
          </button>

          {/* Timeline Zoom Slider Controls */}
          <div className="flex items-center space-x-1.5 bg-dark-800/80 px-2 py-1 rounded-lg border border-dark-700">
            <button
              onClick={() => setZoomLevel(zoomLevel * 0.75)}
              className="text-gray-400 hover:text-white transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <input
              type="range"
              min="20"
              max="300"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseInt(e.target.value, 10))}
              className="w-20 accent-cyan-400 h-1 bg-dark-700 rounded cursor-pointer"
            />

            <button
              onClick={() => setZoomLevel(zoomLevel * 1.25)}
              className="text-gray-400 hover:text-white transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <span className="text-[10px] font-mono text-cyan-400 font-bold w-9 text-right">
              {Math.round((zoomLevel / 100) * 100)}%
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => addTrack('video')}
              className="p-1 text-gray-400 hover:text-cyan-400 hover:bg-dark-800 rounded transition"
              title="Add Video Track"
            >
              <Film className="w-4 h-4" />
            </button>
            <button
              onClick={() => addTrack('audio')}
              className="p-1 text-gray-400 hover:text-green-400 hover:bg-dark-800 rounded transition"
              title="Add Audio Track"
            >
              <Music className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Track Workspace (Headers + Content Split Layout) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers List (Left Sidebar) */}
        <div
          ref={trackHeaderContainerRef}
          className="w-48 bg-dark-900/90 border-r border-dark-700 flex flex-col shrink-0 overflow-y-hidden select-none"
        >
          {/* Header Gap for Ruler */}
          <div className="h-6 bg-dark-900 border-b border-dark-700 border-r border-dark-700 shrink-0" />

          {/* Track Headers */}
          <div className="flex-1 overflow-y-auto scrollbar-none">
            {tracks.map((track) => (
              <div
                key={track.id}
                onContextMenu={(e) => handleTrackHeaderContextMenu(e, track.id)}
                className={`h-14 px-3 border-b border-dark-700/60 flex items-center justify-between text-xs font-semibold group transition ${
                  track.locked ? 'bg-dark-950/80 text-gray-500' : 'hover:bg-dark-800/80 text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2 truncate pr-1">
                  {getTrackIcon(track.type)}
                  <span className="truncate">{track.name}</span>
                </div>

                <div className="flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition">
                  <button
                    onClick={() => toggleTrackMute(track.id)}
                    className={`p-1 rounded hover:bg-dark-700 transition ${
                      track.muted ? 'text-red-400' : 'text-gray-400 hover:text-white'
                    }`}
                    title={track.muted ? 'Unmute Track' : 'Mute Track'}
                  >
                    {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>

                  <button
                    onClick={() => toggleTrackHidden(track.id)}
                    className={`p-1 rounded hover:bg-dark-700 transition ${
                      track.hidden ? 'text-amber-400' : 'text-gray-400 hover:text-white'
                    }`}
                    title={track.hidden ? 'Unhide Track' : 'Hide Track'}
                  >
                    {track.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>

                  <button
                    onClick={() => toggleTrackLocked(track.id)}
                    className={`p-1 rounded hover:bg-dark-700 transition ${
                      track.locked ? 'text-red-400' : 'text-gray-400 hover:text-white'
                    }`}
                    title={track.locked ? 'Unlock Track' : 'Lock Track'}
                  >
                    {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Ruler & Track Content Workspace (Right Scrollable Area) */}
        <div
          ref={trackContentContainerRef}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-dark-950 scrollbar-thin scrollbar-thumb-dark-700"
        >
          <div style={{ width: `${totalTimelineWidthPx}px`, minWidth: '100%' }} className="relative flex flex-col">
            {/* Timeline Ruler Header */}
            <div
              ref={timelineRef}
              onMouseDown={handleTimelineMouseDown}
              className="h-6 bg-dark-900 border-b border-dark-700 sticky top-0 z-20 cursor-pointer select-none flex items-center"
            >
              {rulerTicks.map((time) => (
                <div
                  key={time}
                  className="absolute top-0 bottom-0 border-l border-dark-700/80 flex items-end pb-0.5 pl-1"
                  style={{ left: `${time * zoomLevel}px` }}
                >
                  <span className="text-[9px] font-mono text-gray-400 select-none">{time}s</span>
                </div>
              ))}

              {/* Markers */}
              {markers.map((marker) => (
                <div
                  key={marker.id}
                  onContextMenu={(e) => handleMarkerContextMenu(e, marker.id)}
                  className="absolute top-0 bottom-0 w-0.5 z-20 cursor-pointer group"
                  style={{ left: `${marker.time * zoomLevel}px`, backgroundColor: marker.color }}
                  title={`${marker.label} at ${marker.time.toFixed(2)}s`}
                >
                  <div
                    className="w-3 h-3 -ml-1.5 top-0 absolute rounded-b-md shadow"
                    style={{ backgroundColor: marker.color }}
                  />
                </div>
              ))}
            </div>

            {/* Playhead Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-30 pointer-events-none shadow-[0_0_8px_rgba(0,242,254,0.8)]"
              style={{ left: `${currentTime * zoomLevel}px` }}
            >
              <div className="w-3 h-3 -ml-1.5 top-0 absolute bg-cyan-400 rotate-45 rounded-sm shadow" />
            </div>

            {/* Tracks Content */}
            <div className="flex-1 flex flex-col">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className={`h-14 border-b border-dark-800/80 relative flex items-center transition ${
                    track.hidden ? 'opacity-30' : ''
                  }`}
                >
                  {track.clips.map((clip) => {
                    const isSelected = selectedClipIds.includes(clip.id);
                    const clipWidthPx = clip.duration * zoomLevel;
                    const clipLeftPx = clip.startTime * zoomLevel;

                    return (
                      <div
                        key={clip.id}
                        onMouseDown={(e) => handleClipMouseDown(e, clip, track)}
                        onContextMenu={(e) => handleClipContextMenu(e, clip.id)}
                        className={`absolute h-10 rounded-lg flex items-center justify-between px-2 cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/10'
                            : clip.groupId
                            ? 'bg-purple-900/50 border-purple-500/50 text-purple-200'
                            : 'bg-dark-700/80 border-dark-600 hover:border-gray-400 text-gray-200'
                        }`}
                        style={{
                          left: `${clipLeftPx}px`,
                          width: `${clipWidthPx}px`,
                        }}
                      >
                        {/* Trim Left Handle */}
                        <div
                          onMouseDown={(e) => handleTrimMouseDown(e, clip, track, 'left')}
                          className="absolute left-0 top-0 bottom-0 w-2 hover:bg-cyan-400/60 rounded-l cursor-ew-resize z-10"
                          title="Trim Left Edge"
                        />

                        {/* Clip Name */}
                        <span className="text-[11px] font-bold truncate select-none z-0 px-1">
                          {clip.name} {clip.groupId ? '🔗' : ''}
                        </span>

                        {/* Trim Right Handle */}
                        <div
                          onMouseDown={(e) => handleTrimMouseDown(e, clip, track, 'right')}
                          className="absolute right-0 top-0 bottom-0 w-2 hover:bg-cyan-400/60 rounded-r cursor-ew-resize z-10"
                          title="Trim Right Edge"
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

      {/* Clip Context Menu */}
      {clipContextMenu && (
        <div
          className="fixed bg-dark-900 border border-dark-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs font-semibold text-gray-200 w-44"
          style={{ left: clipContextMenu.x, top: clipContextMenu.y }}
        >
          <button
            onClick={() => {
              splitSelectedClip();
              setClipContextMenu(null);
            }}
            className="w-full px-3 py-1.5 hover:bg-dark-800 text-left flex items-center space-x-2"
          >
            <Scissors className="w-3.5 h-3.5 text-cyan-400" />
            <span>Split Clip (S)</span>
          </button>
          <button
            onClick={() => {
              duplicateSelectedClip();
              setClipContextMenu(null);
            }}
            className="w-full px-3 py-1.5 hover:bg-dark-800 text-left flex items-center space-x-2"
          >
            <Copy className="w-3.5 h-3.5 text-blue-400" />
            <span>Duplicate (Ctrl+D)</span>
          </button>
          <button
            onClick={() => {
              groupSelectedClips();
              setClipContextMenu(null);
            }}
            className="w-full px-3 py-1.5 hover:bg-dark-800 text-left flex items-center space-x-2"
          >
            <FolderPlus className="w-3.5 h-3.5 text-purple-400" />
            <span>Group Clips</span>
          </button>
          <button
            onClick={() => {
              ungroupSelectedClips();
              setClipContextMenu(null);
            }}
            className="w-full px-3 py-1.5 hover:bg-dark-800 text-left flex items-center space-x-2"
          >
            <FolderMinus className="w-3.5 h-3.5 text-amber-400" />
            <span>Ungroup Clips</span>
          </button>
          <button
            onClick={() => {
              deleteSelectedClip();
              setClipContextMenu(null);
            }}
            className="w-full px-3 py-1.5 hover:bg-dark-800 text-left flex items-center space-x-2 text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Clip</span>
          </button>
        </div>
      )}

      {/* Marker Context Menu */}
      {markerContextMenu && (
        <div
          className="fixed bg-dark-900 border border-dark-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs font-semibold text-gray-200 w-36"
          style={{ left: markerContextMenu.x, top: markerContextMenu.y }}
        >
          <button
            onClick={() => {
              removeMarker(markerContextMenu.markerId);
              setMarkerContextMenu(null);
            }}
            className="w-full px-3 py-1.5 hover:bg-dark-800 text-left text-red-400 flex items-center space-x-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Marker</span>
          </button>
        </div>
      )}

      {/* Track Context Menu */}
      {trackContextMenu && (
        <div
          className="fixed bg-dark-900 border border-dark-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs font-semibold text-gray-200 w-40"
          style={{ left: trackContextMenu.x, top: trackContextMenu.y }}
        >
          <button
            onClick={() => {
              handleDeleteTrackSafely(trackContextMenu.trackId);
              setTrackContextMenu(null);
            }}
            className="w-full px-3 py-1.5 hover:bg-dark-800 text-left text-red-400 flex items-center space-x-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Track</span>
          </button>
        </div>
      )}
    </div>
  );
};
