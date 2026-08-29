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
  MousePointer,
  Sparkles,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { Clip, Track, MediaType } from '../types/timeline';

export const Timeline: React.FC = () => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const trackHeaderContainerRef = useRef<HTMLDivElement>(null);
  const trackContentContainerRef = useRef<HTMLDivElement>(null);

  const [isScrubbingPlayhead, setIsScrubbingPlayhead] = useState(false);
  const [activeTool, setActiveTool] = useState<'select' | 'blade'>('select');
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
      } else if (e.key.toLowerCase() === 'v' && !e.ctrlKey && !e.metaKey) {
        setActiveTool('select');
      } else if (e.key.toLowerCase() === 'b' && !e.ctrlKey && !e.metaKey) {
        setActiveTool('blade');
        splitSelectedClip();
      } else if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
        splitSelectedClip();
      } else if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) {
        setSnappingEnabled(!snappingEnabled);
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

    const handleWindowClick = () => setClipContextMenu(null);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('click', handleWindowClick);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('click', handleWindowClick);
    };

  }, [
    splitSelectedClip,
    deleteSelectedClip,
    duplicateSelectedClip,
    addMarker,
    groupSelectedClips,
    ungroupSelectedClips,
    snappingEnabled,
    setSnappingEnabled,
  ]);

  const updateScrubPosition = (clientX: number) => {
    if (!trackContentContainerRef.current) return;
    const rect = trackContentContainerRef.current.getBoundingClientRect();
    const scrollLeft = trackContentContainerRef.current.scrollLeft;
    const offsetX = clientX - rect.left + scrollLeft;
    const newTime = Math.max(0, offsetX / zoomLevel);
    setCurrentTime(newTime);
  };

  const handleRulerMouseDown = (e: React.MouseEvent) => {
    setIsScrubbingPlayhead(true);
    updateScrubPosition(e.clientX);
  };

  const handleAddTrack = (type: MediaType) => {
    addTrack(type, `${type.toUpperCase()} Track ${tracks.length + 1}`);
  };

  const handleDeleteTrackConfirm = (trackId: string) => {
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

    if (activeTool === 'blade') {
      splitSelectedClip();
      return;
    }

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

        const snapThresholdTime = 8 / zoomLevel;
        for (const target of snapTargets) {
          if (Math.abs(newStart - target) < snapThresholdTime) {
            newStart = target;
            break;
          }
          if (Math.abs(newStart + (draggingClip.groupOriginalStarts ? 0 : 0) - target) < snapThresholdTime) {
            break;
          }
        }
      }

      if (draggingClip.groupOriginalStarts && draggingClip.groupOriginalStarts.length > 0) {
        const deltaFromOrig = newStart - draggingClip.originalStart;
        draggingClip.groupOriginalStarts.forEach((item) => {
          updateClip(item.id, { startTime: Math.max(0, item.start + deltaFromOrig) });
        });
      } else {
        updateClip(draggingClip.id, { startTime: newStart });
      }
    } else if (trimmingClip) {
      const deltaX = e.clientX - trimmingClip.startX;
      const deltaTime = deltaX / zoomLevel;

      if (trimmingClip.edge === 'right') {
        const newDuration = Math.max(0.5, trimmingClip.originalDuration + deltaTime);
        updateClip(trimmingClip.id, { duration: newDuration });
      } else {
        const maxDelta = trimmingClip.originalDuration - 0.5;
        const boundedDeltaTime = Math.min(maxDelta, deltaTime);
        const newStart = Math.max(0, trimmingClip.originalStart + boundedDeltaTime);
        const newDuration = trimmingClip.originalDuration - (newStart - trimmingClip.originalStart);

        updateClip(trimmingClip.id, {
          startTime: newStart,
          duration: newDuration,
          mediaOffset: Math.max(0, (useTimelineStore.getState().tracks.flatMap((t) => t.clips).find((c) => c.id === trimmingClip.id)?.mediaOffset || 0) + boundedDeltaTime),
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsScrubbingPlayhead(false);
    setDraggingClip(null);
    setTrimmingClip(null);
  };

  const handleTrackScroll = () => {
    if (trackContentContainerRef.current && trackHeaderContainerRef.current) {
      trackHeaderContainerRef.current.scrollTop = trackContentContainerRef.current.scrollTop;
    }
  };

  const getTrackIcon = (type: MediaType) => {
    switch (type) {
      case 'video':
        return <Film className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      case 'image':
        return <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
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
      className="h-64 bg-dark-950 border-t border-dark-800 flex flex-col select-none z-30 overflow-hidden relative shadow-2xl"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Timeline Toolbar Bar */}
      <div className="h-11 bg-dark-900 border-b border-dark-800 px-4 flex items-center justify-between overflow-x-auto no-scrollbar">
        {/* Pointer / Blade Tool Selectors */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <div className="flex items-center space-x-1 bg-dark-950 p-1 rounded-xl border border-dark-800">
            <button
              onClick={() => setActiveTool('select')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                activeTool === 'select'
                  ? 'bg-cyan-500 text-black font-black shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-dark-800'
              }`}
              title="Pointer Selection Tool (V)"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>Select (V)</span>
            </button>
            <button
              onClick={() => {
                setActiveTool('blade');
                splitSelectedClip();
              }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                activeTool === 'blade'
                  ? 'bg-cyan-500 text-black font-black shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-dark-800'
              }`}
              title="Razor Blade Tool — Split clip at playhead (B)"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Blade (B)</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-dark-800" />

          {/* Action Tools */}
          <button
            onClick={duplicateSelectedClip}
            title="Duplicate selected clip — Ctrl+D"
            className="flex items-center space-x-1 px-2.5 py-1 bg-dark-950 hover:bg-dark-800 text-gray-300 hover:text-cyan-300 rounded-xl text-xs font-bold border border-dark-800 transition"
          >
            <Copy className="w-3.5 h-3.5 text-cyan-400" />
            <span>Duplicate</span>
          </button>

          <button
            onClick={groupSelectedClips}
            disabled={selectedClipIds.length < 2}
            title="Group selected clips — Ctrl+G"
            className="flex items-center space-x-1 px-2.5 py-1 bg-dark-950 hover:bg-dark-800 disabled:opacity-30 text-gray-300 rounded-xl text-xs font-bold border border-dark-800 transition"
          >
            <FolderPlus className="w-3.5 h-3.5 text-purple-400" />
            <span>Group</span>
          </button>

          <button
            onClick={deleteSelectedClip}
            title="Delete selected clip — Delete"
            className="flex items-center space-x-1 px-2.5 py-1 bg-dark-950 hover:bg-dark-800 text-gray-300 hover:text-red-400 rounded-xl text-xs font-bold border border-dark-800 transition"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Delete</span>
          </button>

          <button
            onClick={() => addMarker()}
            title="Add Marker at playhead — M"
            className="flex items-center space-x-1 px-2.5 py-1 bg-dark-950 hover:bg-dark-800 text-gray-300 hover:text-amber-400 rounded-xl text-xs font-bold border border-dark-800 transition"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Marker (M)</span>
          </button>
        </div>

        {/* Snapping, Ripple & Zoom Slider */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setSnappingEnabled(!snappingEnabled)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold transition border ${
              snappingEnabled
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-extrabold'
                : 'bg-dark-950 text-gray-400 border-dark-800 hover:text-white'
            }`}
            title="Magnetic Snapping (N)"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Snap (N)</span>
          </button>

          <button
            onClick={() => setRippleDeleteEnabled(!rippleDeleteEnabled)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold transition border ${
              rippleDeleteEnabled
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-extrabold'
                : 'bg-dark-950 text-gray-400 border-dark-800 hover:text-white'
            }`}
            title="Ripple Auto-Gap Closure"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ripple</span>
          </button>

          {/* Timeline Zoom Slider */}
          <div className="flex items-center space-x-1.5 bg-dark-950 px-2 py-1 rounded-xl border border-dark-800">
            <button onClick={() => setZoomLevel(Math.max(20, zoomLevel - 20))} className="text-gray-400 hover:text-white">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min="20"
              max="300"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseInt(e.target.value, 10))}
              className="w-20 accent-cyan-400 bg-dark-900 rounded-lg h-1.5 cursor-pointer"
            />
            <button onClick={() => setZoomLevel(Math.min(300, zoomLevel + 20))} className="text-gray-400 hover:text-white">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Multitrack Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Track Headers Drawer */}
        <div
          ref={trackHeaderContainerRef}
          className="w-48 bg-dark-950 border-r border-dark-800 flex flex-col shrink-0 overflow-hidden divide-y divide-dark-800"
        >
          {/* Header Top Empty Block (aligns with ruler height) */}
          <div className="h-7 bg-dark-900/80 border-b border-dark-800 px-3 flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TRACKS</span>
            <div className="flex items-center space-x-1">
              <button onClick={() => handleAddTrack('video')} className="text-cyan-400 hover:text-cyan-300 text-[10px] font-bold">+ Video</button>
              <button onClick={() => handleAddTrack('audio')} className="text-green-400 hover:text-green-300 text-[10px] font-bold">+ Audio</button>
            </div>
          </div>

          {/* Track Headers List */}
          <div className="flex-1 overflow-hidden space-y-px">
            {tracks.map((track) => (
              <div
                key={track.id}
                className={`h-16 px-2.5 flex items-center justify-between border-b border-dark-800/80 transition ${
                  track.locked ? 'bg-dark-900/60 opacity-60' : 'bg-dark-900/90 hover:bg-dark-900'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  {getTrackIcon(track.type)}
                  <span className="text-xs font-extrabold text-gray-200 truncate w-24">{track.name}</span>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => toggleTrackMute(track.id)}
                    className={`p-1 rounded ${track.muted ? 'text-red-400 bg-red-500/20' : 'text-gray-400 hover:text-white'}`}
                    title={track.muted ? 'Unmute Track' : 'Mute Track'}
                  >
                    {track.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => toggleTrackHidden(track.id)}
                    className={`p-1 rounded ${track.hidden ? 'text-amber-400 bg-amber-500/20' : 'text-gray-400 hover:text-white'}`}
                    title={track.hidden ? 'Show Track' : 'Hide Track'}
                  >
                    {track.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => toggleTrackLocked(track.id)}
                    className={`p-1 rounded ${track.locked ? 'text-cyan-400 bg-cyan-500/20' : 'text-gray-400 hover:text-white'}`}
                    title={track.locked ? 'Unlock Track' : 'Lock Track'}
                  >
                    {track.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Ruler & Clips Canvas Area */}
        <div
          ref={trackContentContainerRef}
          onScroll={handleTrackScroll}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-dark-950"
        >
          {/* Time Ruler */}
          <div
            onClick={handleRulerMouseDown}
            className="h-7 bg-dark-900/90 border-b border-dark-800 relative cursor-pointer font-mono text-[10px] text-gray-400 font-bold shrink-0 sticky top-0 z-10"
            style={{ width: `${totalTimelineWidthPx}px` }}
          >
            {rulerTicks.map((tickTime) => {
              const posX = tickTime * zoomLevel;
              return (
                <div
                  key={tickTime}
                  className="absolute top-0 bottom-0 border-l border-dark-700/80 pl-1 pt-1 pointer-events-none"
                  style={{ left: `${posX}px` }}
                >
                  {tickTime}s
                </div>
              );
            })}

            {/* Timeline Markers */}
            {markers.map((marker) => {
              const mX = marker.time * zoomLevel;
              return (
                <div
                  key={marker.id}
                  className="absolute top-0 w-3 h-4 bg-amber-400 clip-path-polygon cursor-pointer z-20"
                  style={{ left: `${mX - 6}px` }}
                  title={`Marker: ${marker.label} @ ${marker.time.toFixed(2)}s`}
                />
              );
            })}
          </div>

          {/* Tracks Clips Canvas */}
          <div className="relative space-y-px" style={{ width: `${totalTimelineWidthPx}px` }}>
            {/* Playhead Red Indicator Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-30 pointer-events-none shadow-lg shadow-cyan-500/50"
              style={{ left: `${currentTime * zoomLevel}px` }}
            >
              <div className="w-3 h-3 bg-cyan-400 rotate-45 -translate-x-[5px] -translate-y-1.5 shadow-md" />
            </div>

            {tracks.map((track) => (
              <div
                key={track.id}
                className={`h-16 relative border-b border-dark-800/80 ${
                  track.locked ? 'bg-dark-950/40' : 'bg-dark-900/40'
                }`}
              >
                {track.clips.map((clip) => {
                  const clipX = clip.startTime * zoomLevel;
                  const clipW = clip.duration * zoomLevel;
                  const isSelected = selectedClipId === clip.id || selectedClipIds.includes(clip.id);

                  let clipColorClass = 'bg-cyan-900/80 border-cyan-500/60 text-cyan-200';
                  if (clip.type === 'audio') clipColorClass = 'bg-green-900/80 border-green-500/60 text-green-200';
                  else if (clip.type === 'text') clipColorClass = 'bg-purple-900/80 border-purple-500/60 text-purple-200';
                  else if (clip.type === 'caption') clipColorClass = 'bg-amber-900/80 border-amber-500/60 text-amber-200';
                  else if (clip.type === 'image') clipColorClass = 'bg-blue-900/80 border-blue-500/60 text-blue-200';

                  return (
                    <div
                      key={clip.id}
                      onMouseDown={(e) => handleClipMouseDown(e, clip, track)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedClipId(clip.id);
                        setClipContextMenu({ x: e.clientX, y: e.clientY, clipId: clip.id });
                      }}
                      className={`absolute top-1.5 bottom-1.5 rounded-xl border-2 px-2 flex items-center justify-between cursor-move overflow-hidden transition shadow-md ${clipColorClass} ${
                        isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-dark-950 scale-[1.01] z-20 font-black' : ''
                      }`}
                      style={{ left: `${clipX}px`, width: `${clipW}px` }}
                    >

                      {/* Left Trim Handle */}
                      <div
                        onMouseDown={(e) => handleTrimMouseDown(e, clip, track, 'left')}
                        className="absolute left-0 top-0 bottom-0 w-2.5 bg-cyan-400/40 hover:bg-cyan-400 cursor-ew-resize rounded-l-xl z-20"
                      />

                      <div className="flex items-center space-x-1.5 truncate pointer-events-none">
                        {getTrackIcon(clip.type)}
                        <span className="text-xs font-bold truncate">{clip.name}</span>
                      </div>

                      {/* Right Trim Handle */}
                      <div
                        onMouseDown={(e) => handleTrimMouseDown(e, clip, track, 'right')}
                        className="absolute right-0 top-0 bottom-0 w-2.5 bg-cyan-400/40 hover:bg-cyan-400 cursor-ew-resize rounded-r-xl z-20"
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right-Click Clip Context Menu Popover */}
      {clipContextMenu && (
        <div
          className="fixed z-50 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl p-1.5 w-44 text-xs font-bold text-gray-200 select-none"
          style={{ top: `${clipContextMenu.y}px`, left: `${clipContextMenu.x}px` }}
          onClick={() => setClipContextMenu(null)}
        >
          <button
            onClick={() => {
              splitSelectedClip();
              setClipContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 hover:bg-cyan-500/20 hover:text-cyan-300 rounded-lg flex items-center justify-between"
          >
            <span>Split Clip</span>
            <span className="text-[10px] text-gray-500">B</span>
          </button>
          <button
            onClick={() => {
              duplicateSelectedClip();
              setClipContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 hover:bg-cyan-500/20 hover:text-cyan-300 rounded-lg flex items-center justify-between"
          >
            <span>Duplicate</span>
            <span className="text-[10px] text-gray-500">Ctrl+D</span>
          </button>
          <button
            onClick={() => {
              detachAudioFromSelectedClip();
              setClipContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 hover:bg-cyan-500/20 hover:text-cyan-300 rounded-lg flex items-center justify-between"
          >
            <span>Detach Audio</span>
            <span className="text-[10px] text-gray-500">Ctrl+Alt+A</span>
          </button>
          <div className="my-1 border-t border-dark-800" />
          <button
            onClick={() => {
              deleteSelectedClip();
              setClipContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 hover:bg-red-500/20 hover:text-red-300 text-red-400 rounded-lg flex items-center justify-between"
          >
            <span>Delete</span>
            <span className="text-[10px] text-red-500/70">Del</span>
          </button>
        </div>
      )}
    </div>

  );
};
