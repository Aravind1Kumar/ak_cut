import React, { useState } from 'react';
import {
  Sliders,
  Type,
  Wand2,
  Volume2,
  Maximize2,
  RotateCw,
  Eye,
  Sparkles,
  Scissors,
  Bookmark,
  Layers,
  FileText,
  Download,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  VolumeX,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { exportClipsToSRT } from '../utils/srtExporter';

export const Inspector: React.FC = () => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    transform: true,
    text: true,
    audio: true,
    filter: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const {
    tracks,
    selectedClipId,
    updateClipTransform,
    updateClipFilter,
    updateClipAudio,
    updateClipText,
    updateClipCaption,
    addKeyframeToClip,
    beginTransaction,
    commitTransaction,
  } = useTimelineStore();

  let selectedClip = null;
  for (const track of tracks) {
    const clip = track.clips.find((c) => c.id === selectedClipId);
    if (clip) {
      selectedClip = clip;
      break;
    }
  }

  if (!selectedClip) {
    return (
      <aside className="w-80 bg-dark-800 border-l border-dark-700 p-4 flex flex-col items-center justify-center text-center select-none z-20">
        <Sliders className="w-10 h-10 text-gray-600 mb-2" />
        <h3 className="text-sm font-semibold text-gray-300">Select a clip to edit</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
          Click any video, image, text, or caption clip on the timeline to edit properties.
        </p>
      </aside>
    );
  }

  const resetProperty = (prop: 'position' | 'scale' | 'rotation' | 'opacity' | 'volume') => {
    beginTransaction();
    if (prop === 'position') updateClipTransform(selectedClip!.id, { x: 0, y: 0 });
    else if (prop === 'scale') updateClipTransform(selectedClip!.id, { scale: 1.0 });
    else if (prop === 'rotation') updateClipTransform(selectedClip!.id, { rotation: 0 });
    else if (prop === 'opacity') updateClipTransform(selectedClip!.id, { opacity: 1.0 });
    else if (prop === 'volume') updateClipAudio(selectedClip!.id, { volume: 1.0, fadeIn: 0, fadeOut: 0, muted: false });
    commitTransaction();
  };

  return (
    <aside className="w-80 bg-dark-800 border-l border-dark-700 flex flex-col h-full select-none z-20 overflow-y-auto p-4 space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-700">
        <div>
          <h3 className="text-sm font-bold text-gray-100 truncate">{selectedClip.name}</h3>
          <span className="text-[10px] text-cyan-400 font-mono uppercase">{selectedClip.type} Clip</span>
        </div>

        <button
          onClick={() => addKeyframeToClip(selectedClip!.id)}
          className="flex items-center space-x-1 px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-semibold transition"
          title="Add Keyframe at playhead position"
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Keyframe</span>
        </button>
      </div>

      {/* TRANSFORM SECTION */}
      <div className="border border-dark-700 rounded-xl bg-dark-900/40 overflow-hidden">
        <button
          onClick={() => toggleSection('transform')}
          className="w-full px-3 py-2.5 bg-dark-900/80 flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider"
        >
          <span>Transform</span>
          {openSections.transform ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {openSections.transform && (
          <div className="p-3 space-y-3">
            {/* Position X / Y */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-gray-400">Position X / Y (%)</span>
                <button
                  onClick={() => resetProperty('position')}
                  className="text-[10px] text-gray-500 hover:text-cyan-400 flex items-center space-x-0.5"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={Math.round(selectedClip.transform.x)}
                  onChange={(e) => updateClipTransform(selectedClip!.id, { x: parseFloat(e.target.value) || 0 })}
                  className="bg-dark-800 border border-dark-700 rounded p-1 text-xs text-white text-center outline-none focus:border-cyan-500"
                />
                <input
                  type="number"
                  value={Math.round(selectedClip.transform.y)}
                  onChange={(e) => updateClipTransform(selectedClip!.id, { y: parseFloat(e.target.value) || 0 })}
                  className="bg-dark-800 border border-dark-700 rounded p-1 text-xs text-white text-center outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Scale */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-gray-400">Scale ({Math.round(selectedClip.transform.scale * 100)}%)</span>
                <button
                  onClick={() => resetProperty('scale')}
                  className="text-[10px] text-gray-500 hover:text-cyan-400 flex items-center space-x-0.5"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset</span>
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.05"
                  value={selectedClip.transform.scale}
                  onChange={(e) => updateClipTransform(selectedClip!.id, { scale: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                />
                <input
                  type="number"
                  step="0.1"
                  value={selectedClip.transform.scale}
                  onChange={(e) => updateClipTransform(selectedClip!.id, { scale: parseFloat(e.target.value) || 1 })}
                  className="w-14 bg-dark-800 border border-dark-700 rounded p-1 text-xs text-white text-center outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AUDIO SECTION (Volume, Mute, Fade In, Fade Out) */}
      {(selectedClip.type === 'video' || selectedClip.type === 'audio') && (
        <div className="border border-dark-700 rounded-xl bg-dark-900/40 overflow-hidden">
          <button
            onClick={() => toggleSection('audio')}
            className="w-full px-3 py-2.5 bg-dark-900/80 flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider"
          >
            <span>Audio Controls & Fades</span>
            {openSections.audio ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {openSections.audio && (
            <div className="p-3 space-y-3">
              {/* Mute Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Mute Audio</span>
                <button
                  onClick={() => updateClipAudio(selectedClip!.id, { muted: !selectedClip!.audio.muted })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                    selectedClip.audio.muted
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : 'bg-dark-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {selectedClip.audio.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span>{selectedClip.audio.muted ? 'Muted' : 'Audible'}</span>
                </button>
              </div>

              {/* Volume Slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-gray-400">Volume ({Math.round(selectedClip.audio.volume * 100)}%)</span>
                  <button
                    onClick={() => resetProperty('volume')}
                    className="text-[10px] text-gray-500 hover:text-green-400 flex items-center space-x-0.5"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset</span>
                  </button>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2.0"
                  step="0.05"
                  value={selectedClip.audio.volume}
                  onChange={(e) => updateClipAudio(selectedClip!.id, { volume: parseFloat(e.target.value) })}
                  className="w-full accent-green-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                />
              </div>

              {/* Fade In (0-10s) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-gray-400">Fade In ({selectedClip.audio.fadeIn.toFixed(1)}s)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10.0"
                  step="0.1"
                  value={selectedClip.audio.fadeIn}
                  onChange={(e) => updateClipAudio(selectedClip!.id, { fadeIn: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                />
              </div>

              {/* Fade Out (0-10s) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-gray-400">Fade Out ({selectedClip.audio.fadeOut.toFixed(1)}s)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10.0"
                  step="0.1"
                  value={selectedClip.audio.fadeOut}
                  onChange={(e) => updateClipAudio(selectedClip!.id, { fadeOut: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
