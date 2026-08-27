import React, { useState } from 'react';
import {
  Sliders,
  Type,
  Wand2,
  Volume2,
  Bookmark,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  VolumeX,
  Copy,
  Clipboard,
  Sparkles,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Snowflake,
  Sun,
  Thermometer,
  Layers,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { DEFAULT_CAPTION_STYLES } from '../utils/captionEngine';
import { CaptionStyle, BlendMode } from '../types/timeline';

let copiedCaptionStyle: CaptionStyle | null = null;

export const Inspector: React.FC = () => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    captionPreset: true,
    transform: true,
    filter: true,
    text: true,
    audio: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const {
    tracks,
    selectedClipId,
    currentTime,
    updateClipTransform,
    updateClipFilter,
    updateClipAudio,
    updateClipText,
    updateClipCaption,
    addKeyframeToClip,
    freezeFrameSelectedClip,
    addClipToTrack,
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

  const handleApplyPreset = (presetKey: string) => {
    if (!selectedClip || selectedClip.type !== 'caption') return;
    const preset = DEFAULT_CAPTION_STYLES[presetKey] || DEFAULT_CAPTION_STYLES.social;

    beginTransaction();
    updateClipCaption(selectedClip.id, {
      stylePreset: presetKey as any,
      customStyle: { ...preset },
    });
    commitTransaction();
  };

  const handleCopyStyle = () => {
    if (!selectedClip || selectedClip.type !== 'caption') return;
    const currentStyle = selectedClip.caption?.customStyle || DEFAULT_CAPTION_STYLES[selectedClip.caption?.stylePreset || 'social'];
    copiedCaptionStyle = { ...currentStyle };
  };

  const handlePasteStyle = () => {
    if (!selectedClip || selectedClip.type !== 'caption' || !copiedCaptionStyle) return;
    beginTransaction();
    updateClipCaption(selectedClip.id, {
      customStyle: { ...copiedCaptionStyle },
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
    beginTransaction();
    if (prop === 'position') updateClipTransform(selectedClip!.id, { x: 0, y: 0 });
    else if (prop === 'scale') updateClipTransform(selectedClip!.id, { scale: 1.0, flipHorizontal: false, flipVertical: false, cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 });
    else if (prop === 'rotation') updateClipTransform(selectedClip!.id, { rotation: 0 });
    else if (prop === 'opacity') updateClipTransform(selectedClip!.id, { opacity: 1.0 });
    else if (prop === 'volume') updateClipAudio(selectedClip!.id, { volume: 1.0, fadeIn: 0, fadeOut: 0, muted: false });
    else if (prop === 'filter') updateClipFilter(selectedClip!.id, { brightness: 100, contrast: 100, saturation: 100, blur: 0, hueRotate: 0, sepia: 0, exposure: 0, temperature: 0, tint: 0 });
    commitTransaction();
  };

  const hasWordTiming = Boolean(selectedClip.caption?.words && selectedClip.caption.words.length > 0);

  return (
    <aside className="w-80 bg-dark-800 border-l border-dark-700 flex flex-col h-full select-none z-20 overflow-y-auto p-4 space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-700">
        <div>
          <h3 className="text-sm font-bold text-gray-100 truncate">{selectedClip.name}</h3>
          <span className="text-[10px] text-cyan-400 font-mono uppercase">{selectedClip.type} Clip</span>
        </div>

        <div className="flex items-center space-x-1.5">
          {selectedClip.type === 'video' && (
            <button
              onClick={handleFreezeFrame}
              className="flex items-center space-x-1 px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-semibold transition"
              title="Freeze Frame at playhead position"
            >
              <Snowflake className="w-3.5 h-3.5" />
              <span>Freeze</span>
            </button>
          )}

          <button
            onClick={() => addKeyframeToClip(selectedClip!.id)}
            className="flex items-center space-x-1 px-2.5 py-1 bg-dark-700 hover:bg-dark-600 text-gray-200 border border-dark-600 rounded-lg text-xs font-semibold transition"
            title="Add Keyframe at playhead position"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Keyframe</span>
          </button>
        </div>
      </div>

      {/* CAPTION PRESETS & STYLING SECTION */}
      {selectedClip.type === 'caption' && (
        <div className="border border-dark-700 rounded-xl bg-dark-900/40 overflow-hidden space-y-3 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Caption Style Presets</span>
            </span>

            <div className="flex items-center space-x-1">
              <button
                onClick={handleCopyStyle}
                className="px-2 py-1 bg-dark-800 hover:bg-dark-700 text-gray-300 rounded text-[11px] font-semibold flex items-center space-x-1 border border-dark-700"
                title="Copy Style"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
              <button
                onClick={handlePasteStyle}
                disabled={!copiedCaptionStyle}
                className="px-2 py-1 bg-dark-800 hover:bg-dark-700 text-gray-300 disabled:opacity-30 rounded text-[11px] font-semibold flex items-center space-x-1 border border-dark-700"
                title="Paste Style"
              >
                <Clipboard className="w-3 h-3" />
                <span>Paste</span>
              </button>
            </div>
          </div>

          <div className={`p-2.5 rounded-lg border text-xs font-medium flex items-center space-x-1.5 ${
            hasWordTiming
              ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300'
              : 'bg-dark-900/80 border-dark-700 text-gray-400'
          }`}>
            <span>{hasWordTiming ? '✨ Word Timing Active (Karaoke Enabled)' : 'ℹ️ Segment Caption (Word timing unavailable)'}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {Object.entries(DEFAULT_CAPTION_STYLES).map(([key, style]) => (
              <button
                key={key}
                onClick={() => handleApplyPreset(key)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition text-left ${
                  selectedClip.caption?.stylePreset === key
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md'
                    : 'bg-dark-900/60 text-gray-400 border-dark-700 hover:text-white'
                }`}
              >
                {style.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TRANSFORM, COMPOSITING & PIP SECTION */}
      <div className="border border-dark-700 rounded-xl bg-dark-900/40 overflow-hidden">
        <button
          onClick={() => toggleSection('transform')}
          className="w-full px-3 py-2.5 bg-dark-900/80 flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider"
        >
          <span>Transform & Compositing</span>
          {openSections.transform ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {openSections.transform && (
          <div className="p-3 space-y-3">
            {/* PIP Presets */}
            {(selectedClip.type === 'video' || selectedClip.type === 'image') && (
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1.5 flex items-center space-x-1">
                  <Layers className="w-3 h-3" />
                  <span>Picture-in-Picture (PIP) Presets</span>
                </span>
                <div className="grid grid-cols-5 gap-1">
                  <button
                    onClick={() => handleApplyPipPreset('tl')}
                    className="py-1 px-1 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-[10px] font-semibold text-gray-300 rounded text-center"
                    title="Top-Left PIP"
                  >
                    TL
                  </button>
                  <button
                    onClick={() => handleApplyPipPreset('tr')}
                    className="py-1 px-1 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-[10px] font-semibold text-gray-300 rounded text-center"
                    title="Top-Right PIP"
                  >
                    TR
                  </button>
                  <button
                    onClick={() => handleApplyPipPreset('bl')}
                    className="py-1 px-1 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-[10px] font-semibold text-gray-300 rounded text-center"
                    title="Bottom-Left PIP"
                  >
                    BL
                  </button>
                  <button
                    onClick={() => handleApplyPipPreset('br')}
                    className="py-1 px-1 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-[10px] font-semibold text-gray-300 rounded text-center"
                    title="Bottom-Right PIP"
                  >
                    BR
                  </button>
                  <button
                    onClick={() => handleApplyPipPreset('center')}
                    className="py-1 px-1 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-[10px] font-semibold text-gray-400 rounded text-center"
                    title="Reset PIP"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {/* Blend Mode Selector */}
            <div>
              <span className="text-[10px] font-semibold text-gray-400 block mb-1">Blend Mode (Compositing)</span>
              <select
                value={selectedClip.transform.blendMode || 'normal'}
                onChange={(e) => updateClipTransform(selectedClip!.id, { blendMode: e.target.value as BlendMode })}
                className="w-full bg-dark-800 border border-dark-700 rounded p-1.5 text-xs text-white outline-none focus:border-cyan-500"
              >
                <option value="normal">Normal (Source Over)</option>
                <option value="multiply">Multiply (Darken Blend)</option>
                <option value="screen">Screen (Lighten Blend)</option>
                <option value="overlay">Overlay (Contrast Blend)</option>
                <option value="darken">Darken (Min Color)</option>
                <option value="lighten">Lighten (Max Color)</option>
              </select>
            </div>

            {/* Opacity Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-gray-400">
                  Opacity ({Math.round(selectedClip.transform.opacity * 100)}%)
                </span>
                <button
                  onClick={() => resetProperty('opacity')}
                  className="text-[10px] text-gray-500 hover:text-cyan-400 flex items-center space-x-0.5"
                >
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

            {/* Flip Orientation */}
            <div className="flex items-center justify-between pt-2 border-t border-dark-700/60">
              <span className="text-xs font-semibold text-gray-300">Flip Orientation</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    updateClipTransform(selectedClip!.id, {
                      flipHorizontal: !selectedClip!.transform.flipHorizontal,
                    })
                  }
                  className={`p-2 rounded-lg border text-xs font-bold transition ${
                    selectedClip.transform.flipHorizontal
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-dark-800 text-gray-400 border-dark-700 hover:text-white'
                  }`}
                  title="Flip Horizontal"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>

                <button
                  onClick={() =>
                    updateClipTransform(selectedClip!.id, {
                      flipVertical: !selectedClip!.transform.flipVertical,
                    })
                  }
                  className={`p-2 rounded-lg border text-xs font-bold transition ${
                    selectedClip.transform.flipVertical
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-dark-800 text-gray-400 border-dark-700 hover:text-white'
                  }`}
                  title="Flip Vertical"
                >
                  <FlipVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

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

            {/* Video Crop Sliders */}
            <div className="pt-2 border-t border-dark-700/60 space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Video Crop (%)</span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-gray-500 block">Top ({selectedClip.transform.cropTop || 0}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={selectedClip.transform.cropTop || 0}
                    onChange={(e) => updateClipTransform(selectedClip!.id, { cropTop: parseInt(e.target.value, 10) })}
                    className="w-full accent-cyan-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-gray-500 block">Bottom ({selectedClip.transform.cropBottom || 0}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={selectedClip.transform.cropBottom || 0}
                    onChange={(e) => updateClipTransform(selectedClip!.id, { cropBottom: parseInt(e.target.value, 10) })}
                    className="w-full accent-cyan-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-gray-500 block">Left ({selectedClip.transform.cropLeft || 0}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={selectedClip.transform.cropLeft || 0}
                    onChange={(e) => updateClipTransform(selectedClip!.id, { cropLeft: parseInt(e.target.value, 10) })}
                    className="w-full accent-cyan-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-gray-500 block">Right ({selectedClip.transform.cropRight || 0}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={selectedClip.transform.cropRight || 0}
                    onChange={(e) => updateClipTransform(selectedClip!.id, { cropRight: parseInt(e.target.value, 10) })}
                    className="w-full accent-cyan-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* COLOR & FILTERS SECTION */}
      {(selectedClip.type === 'video' || selectedClip.type === 'image') && (
        <div className="border border-dark-700 rounded-xl bg-dark-900/40 overflow-hidden">
          <button
            onClick={() => toggleSection('filter')}
            className="w-full px-3 py-2.5 bg-dark-900/80 flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider"
          >
            <span>Color Adjustments & Filters</span>
            {openSections.filter ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {openSections.filter && (
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-400">Color Profile</span>
                <button
                  onClick={() => resetProperty('filter')}
                  className="text-[10px] text-gray-500 hover:text-cyan-400 flex items-center space-x-0.5"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset All</span>
                </button>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-gray-400 block mb-1">
                  Exposure ({selectedClip.filter.exposure || 0})
                </span>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={selectedClip.filter.exposure || 0}
                  onChange={(e) => updateClipFilter(selectedClip!.id, { exposure: parseInt(e.target.value, 10) })}
                  className="w-full accent-amber-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                />
              </div>

              <div>
                <span className="text-[10px] font-semibold text-gray-400 block mb-1">
                  Temperature ({selectedClip.filter.temperature || 0})
                </span>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={selectedClip.filter.temperature || 0}
                  onChange={(e) => updateClipFilter(selectedClip!.id, { temperature: parseInt(e.target.value, 10) })}
                  className="w-full accent-blue-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                />
              </div>

              <div>
                <span className="text-[10px] font-semibold text-gray-400 block mb-1">
                  Tint ({selectedClip.filter.tint || 0})
                </span>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={selectedClip.filter.tint || 0}
                  onChange={(e) => updateClipFilter(selectedClip!.id, { tint: parseInt(e.target.value, 10) })}
                  className="w-full accent-emerald-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                />
              </div>

              <div>
                <span className="text-[10px] font-semibold text-gray-400 block mb-1">
                  Brightness ({selectedClip.filter.brightness}%)
                </span>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={selectedClip.filter.brightness}
                  onChange={(e) => updateClipFilter(selectedClip!.id, { brightness: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                />
              </div>

              <div>
                <span className="text-[10px] font-semibold text-gray-400 block mb-1">
                  Contrast ({selectedClip.filter.contrast}%)
                </span>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={selectedClip.filter.contrast}
                  onChange={(e) => updateClipFilter(selectedClip!.id, { contrast: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                />
              </div>

              <div>
                <span className="text-[10px] font-semibold text-gray-400 block mb-1">
                  Saturation ({selectedClip.filter.saturation}%)
                </span>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={selectedClip.filter.saturation}
                  onChange={(e) => updateClipFilter(selectedClip!.id, { saturation: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* AUDIO SECTION */}
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
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
