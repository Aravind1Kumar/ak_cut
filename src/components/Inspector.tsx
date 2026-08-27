import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  Volume2,
  Maximize2,
  RotateCcw,
  Crop,
  Layers,
  ChevronDown,
  ChevronRight,
  Move,
  Film,
  Type,
  Music,
  CheckCircle,
  Copy,
  FolderPlus,
  FolderMinus,
  Sparkle,
  Pipette,
  Blend,
  Grid,
  Zap,
  Bookmark,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { BlendMode, CaptionStyle, FilterProps, KeyframeEasing } from '../types/timeline';
import { DEFAULT_CAPTION_STYLES } from '../utils/captionEngine';

let copiedFilterProps: FilterProps | null = null;
let copiedCaptionStyle: CaptionStyle | null = null;

export const Inspector: React.FC = () => {
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    keyframes: true,
    transform: true,
    filter: true,
    effects: true,
    chromaKey: true,
    audio: true,
    text: true,
    caption: true,
    shape: true,
    sticker: true,
  });

  const {
    tracks,
    selectedClipId,
    selectedClipIds,
    currentTime,
    updateClipTransform,
    updateClipFilter,
    updateClipAudio,
    updateClipText,
    updateClipCaption,
    updateClipChromaKey,
    updateClip,
    detachAudioFromSelectedClip,
    freezeFrameSelectedClip,
    addKeyframeToClip,
    removeKeyframeFromClip,
    groupSelectedClips,
    ungroupSelectedClips,
    beginTransaction,
    commitTransaction,
  } = useTimelineStore();

  let selectedClip = null;
  if (selectedClipId) {
    for (const track of tracks) {
      const found = track.clips.find((c) => c.id === selectedClipId);
      if (found) {
        selectedClip = found;
        break;
      }
    }
  }

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (!selectedClip) {
    return (
      <aside className="w-80 bg-dark-900 border-l border-dark-700 flex flex-col p-4 select-none shrink-0 overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-500">
          <Sliders className="w-12 h-12 text-gray-600 mb-3 stroke-1" />
          <h3 className="text-sm font-bold text-gray-300 mb-1">No Clip Selected</h3>
          <p className="text-xs text-gray-500">Click a clip on the timeline to edit properties, keyframes, transforms, or filters.</p>
        </div>
      </aside>
    );
  }

  const handleCopyCaptionStyle = () => {
    if (!selectedClip || selectedClip.type !== 'caption') return;
    const currentStyle = selectedClip.caption?.customStyle || DEFAULT_CAPTION_STYLES[selectedClip.caption?.stylePreset || 'social'];
    copiedCaptionStyle = { ...currentStyle };
  };

  const handlePasteCaptionStyle = () => {
    if (!selectedClip || selectedClip.type !== 'caption' || !copiedCaptionStyle) return;
    beginTransaction();
    updateClipCaption(selectedClip.id, {
      customStyle: { ...copiedCaptionStyle },
    });
    commitTransaction();
  };

  const handleCopyEffects = () => {
    if (!selectedClip) return;
    copiedFilterProps = { ...selectedClip.filter };
  };

  const handlePasteEffects = () => {
    if (!selectedClip || !copiedFilterProps) return;
    beginTransaction();
    updateClipFilter(selectedClip.id, { ...copiedFilterProps });
    commitTransaction();
  };

  const handleApplyFilterPreset = (presetKey: string) => {
    if (!selectedClip) return;
    beginTransaction();
    updateClipFilter(selectedClip.id, {
      presetKey,
      presetIntensity: selectedClip.filter.presetIntensity ?? 100,
    });
    commitTransaction();
  };

  const handleFreezeFrame = () => {
    if (!selectedClip || selectedClip.type !== 'video') return;

    const previewCanvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!previewCanvas) return;

    const dataUrl = previewCanvas.toDataURL('image/png');
    freezeFrameSelectedClip(dataUrl);
  };

  const handleApplyPipPreset = (position: 'br' | 'bl' | 'tr' | 'tl' | 'center') => {
    if (!selectedClip) return;
    beginTransaction();
    if (position === 'br') updateClipTransform(selectedClip.id, { x: 30, y: 30, scale: 0.35 });
    else if (position === 'bl') updateClipTransform(selectedClip.id, { x: -30, y: 30, scale: 0.35 });
    else if (position === 'tr') updateClipTransform(selectedClip.id, { x: 30, y: -30, scale: 0.35 });
    else if (position === 'tl') updateClipTransform(selectedClip.id, { x: -30, y: -30, scale: 0.35 });
    else updateClipTransform(selectedClip.id, { x: 0, y: 0, scale: 1.0 });
    commitTransaction();
  };

  const resetProperty = (prop: 'position' | 'scale' | 'rotation' | 'opacity' | 'volume' | 'filter') => {
    if (!selectedClip) return;
    beginTransaction();
    if (prop === 'position') updateClipTransform(selectedClip.id, { x: 0, y: 0 });
    else if (prop === 'scale') updateClipTransform(selectedClip.id, { scale: 1.0 });
    else if (prop === 'rotation') updateClipTransform(selectedClip.id, { rotation: 0 });
    else if (prop === 'opacity') updateClipTransform(selectedClip.id, { opacity: 1.0 });
    else if (prop === 'volume') updateClipAudio(selectedClip.id, { volume: 1.0 });
    else if (prop === 'filter') updateClipFilter(selectedClip.id, { brightness: 100, contrast: 100, saturation: 100, blur: 0, hueRotate: 0, sepia: 0, presetKey: undefined });
    commitTransaction();
  };

  const handleUpdateKeyframeEasing = (keyframeId: string, easing: KeyframeEasing) => {
    if (!selectedClip) return;
    beginTransaction();
    const updatedKfs = selectedClip.keyframes.map((kf) => (kf.id === keyframeId ? { ...kf, easing } : kf));
    updateClip(selectedClip.id, { keyframes: updatedKfs });
    commitTransaction();
  };

  return (
    <aside className="w-80 bg-dark-900 border-l border-dark-700 flex flex-col p-4 select-none shrink-0 overflow-y-auto space-y-4">
      {/* Header Info */}
      <div className="border-b border-dark-700 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-100 truncate w-48">{selectedClip.name}</h2>
          <span className="text-[10px] text-cyan-400 font-mono uppercase font-bold">{selectedClip.type} Clip</span>
        </div>
        {selectedClip.groupId && (
          <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded font-bold">
            Grouped
          </span>
        )}
      </div>

      {/* Multi-selection Grouping Bar */}
      {selectedClipIds.length > 1 && (
        <div className="flex items-center space-x-2 bg-dark-800 p-2 rounded-xl border border-dark-700">
          <button
            onClick={groupSelectedClips}
            className="flex-1 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Group ({selectedClipIds.length})</span>
          </button>
          <button
            onClick={ungroupSelectedClips}
            className="flex-1 py-1.5 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1"
          >
            <FolderMinus className="w-3.5 h-3.5" />
            <span>Ungroup</span>
          </button>
        </div>
      )}

      {/* KEYFRAMES & MOTION SECTION */}
      <div className="border border-dark-700 rounded-xl bg-dark-900/40 overflow-hidden">
        <button
          onClick={() => toggleSection('keyframes')}
          className="w-full px-3 py-2.5 bg-dark-900/80 flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider"
        >
          <span className="flex items-center space-x-1.5">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>Keyframes & Easing ({selectedClip.keyframes?.length || 0})</span>
          </span>
          {openSections.keyframes ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {openSections.keyframes && (
          <div className="p-3 space-y-3">
            <button
              onClick={() => addKeyframeToClip(selectedClip!.id)}
              className="w-full py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Add Keyframe at Playhead</span>
            </button>

            {selectedClip.keyframes.length === 0 ? (
              <p className="text-[11px] text-gray-500 text-center py-2">No keyframes added yet.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {selectedClip.keyframes.map((kf, idx) => (
                  <div key={kf.id} className="p-2 bg-dark-800 border border-dark-700 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-cyan-300">
                        KF #{idx + 1} @ {kf.time.toFixed(2)}s
                      </span>
                      <button
                        onClick={() => removeKeyframeFromClip(selectedClip!.id, kf.id)}
                        className="text-[10px] text-red-400 hover:text-red-300 font-semibold"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-gray-400">Easing Curve:</span>
                      <select
                        value={kf.easing || 'linear'}
                        onChange={(e) => handleUpdateKeyframeEasing(kf.id, e.target.value as KeyframeEasing)}
                        className="bg-dark-900 border border-dark-700 rounded px-2 py-0.5 text-xs text-white outline-none focus:border-cyan-500"
                      >
                        <option value="linear">Linear</option>
                        <option value="easeIn">Ease In</option>
                        <option value="easeOut">Ease Out</option>
                        <option value="easeInOut">Ease In Out</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* TRANSFORM SECTION */}
      <div className="border border-dark-700 rounded-xl bg-dark-900/40 overflow-hidden">
        <button
          onClick={() => toggleSection('transform')}
          className="w-full px-3 py-2.5 bg-dark-900/80 flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider"
        >
          <span className="flex items-center space-x-1.5">
            <Maximize2 className="w-4 h-4 text-cyan-400" />
            <span>Transform & Layout</span>
          </span>
          {openSections.transform ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {openSections.transform && (
          <div className="p-3 space-y-3">
            {/* Scale Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-gray-400">
                  Scale ({Math.round(selectedClip.transform.scale * 100)}%)
                </span>
                <button onClick={() => resetProperty('scale')} className="text-[10px] text-gray-500 hover:text-cyan-400 flex items-center space-x-0.5">
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset</span>
                </button>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.05"
                value={selectedClip.transform.scale}
                onChange={(e) => updateClipTransform(selectedClip!.id, { scale: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
              />
            </div>

            {/* Rotation Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-gray-400">Rotation ({selectedClip.transform.rotation}°)</span>
                <button onClick={() => resetProperty('rotation')} className="text-[10px] text-gray-500 hover:text-cyan-400 flex items-center space-x-0.5">
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset</span>
                </button>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={selectedClip.transform.rotation}
                onChange={(e) => updateClipTransform(selectedClip!.id, { rotation: parseInt(e.target.value, 10) })}
                className="w-full accent-cyan-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
              />
            </div>

            {/* Opacity Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-gray-400">
                  Opacity ({Math.round(selectedClip.transform.opacity * 100)}%)
                </span>
                <button onClick={() => resetProperty('opacity')} className="text-[10px] text-gray-500 hover:text-cyan-400 flex items-center space-x-0.5">
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset</span>
                </button>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.02"
                value={selectedClip.transform.opacity}
                onChange={(e) => updateClipTransform(selectedClip!.id, { opacity: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* AUDIO SECTION */}
      {(selectedClip.type === 'video' || selectedClip.type === 'audio') && (
        <div className="border border-dark-700 rounded-xl bg-dark-900/40 overflow-hidden">
          <button
            onClick={() => toggleSection('audio')}
            className="w-full px-3 py-2.5 bg-dark-900/80 flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider"
          >
            <span className="flex items-center space-x-1.5">
              <Music className="w-4 h-4 text-green-400" />
              <span>Audio & Gain</span>
            </span>
            {openSections.audio ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {openSections.audio && (
            <div className="p-3 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-gray-400">
                    Volume Gain ({Math.round(selectedClip.audio.volume * 100)}%)
                  </span>
                  <button onClick={() => resetProperty('volume')} className="text-[10px] text-gray-500 hover:text-cyan-400 flex items-center space-x-0.5">
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset</span>
                  </button>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.05"
                  value={selectedClip.audio.volume}
                  onChange={(e) => updateClipAudio(selectedClip!.id, { volume: parseFloat(e.target.value) })}
                  className="w-full accent-green-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
