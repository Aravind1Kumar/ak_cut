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
  Palette,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { DEFAULT_CAPTION_STYLES } from '../utils/captionEngine';
import { FILTER_PRESETS } from '../utils/filterEngine';
import { CaptionStyle, BlendMode, FilterProps } from '../types/timeline';

let copiedCaptionStyle: CaptionStyle | null = null;
let copiedFilterProps: FilterProps | null = null;

export const Inspector: React.FC = () => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    captionPreset: true,
    transform: true,
    presetFilter: true,
    filter: true,
    videoEffects: true,
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

  const handleApplyCaptionPreset = (presetKey: string) => {
    if (!selectedClip || selectedClip.type !== 'caption') return;
    const preset = DEFAULT_CAPTION_STYLES[presetKey] || DEFAULT_CAPTION_STYLES.social;

    beginTransaction();
    updateClipCaption(selectedClip.id, {
      stylePreset: presetKey as any,
      customStyle: { ...preset },
    });
    commitTransaction();
  };

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
    beginTransaction();
    if (prop === 'position') updateClipTransform(selectedClip!.id, { x: 0, y: 0 });
    else if (prop === 'scale') updateClipTransform(selectedClip!.id, { scale: 1.0, flipHorizontal: false, flipVertical: false, cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 });
    else if (prop === 'rotation') updateClipTransform(selectedClip!.id, { rotation: 0 });
    else if (prop === 'opacity') updateClipTransform(selectedClip!.id, { opacity: 1.0 });
    else if (prop === 'volume') updateClipAudio(selectedClip!.id, { volume: 1.0, fadeIn: 0, fadeOut: 0, muted: false });
    else if (prop === 'filter') updateClipFilter(selectedClip!.id, { brightness: 100, contrast: 100, saturation: 100, blur: 0, hueRotate: 0, sepia: 0, exposure: 0, temperature: 0, tint: 0, fade: 0, vignette: 0, glow: 0, colorShift: 0, presetKey: 'original', presetIntensity: 100 });
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
          {(selectedClip.type === 'video' || selectedClip.type === 'image') && (
            <div className="flex items-center space-x-1">
              <button
                onClick={handleCopyEffects}
                className="px-2 py-1 bg-dark-700 hover:bg-dark-600 text-gray-200 border border-dark-600 rounded-lg text-xs font-semibold transition"
                title="Copy Filter & Effects"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={handlePasteEffects}
                disabled={!copiedFilterProps}
                className="px-2 py-1 bg-dark-700 hover:bg-dark-600 text-gray-200 disabled:opacity-30 border border-dark-600 rounded-lg text-xs font-semibold transition"
                title="Paste Filter & Effects"
              >
                <Clipboard className="w-3 h-3" />
              </button>
            </div>
          )}

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
                onClick={handleCopyCaptionStyle}
                className="px-2 py-1 bg-dark-800 hover:bg-dark-700 text-gray-300 rounded text-[11px] font-semibold flex items-center space-x-1 border border-dark-700"
                title="Copy Style"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
              <button
                onClick={handlePasteCaptionStyle}
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
                onClick={() => handleApplyCaptionPreset(key)}
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

      {/* FILTER PRESETS SECTION */}
      {(selectedClip.type === 'video' || selectedClip.type === 'image') && (
        <div className="border border-dark-700 rounded-xl bg-dark-900/40 overflow-hidden">
          <button
            onClick={() => toggleSection('presetFilter')}
            className="w-full px-3 py-2.5 bg-dark-900/80 flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider"
          >
            <span className="flex items-center space-x-1.5">
              <Palette className="w-4 h-4 text-cyan-400" />
              <span>Creator Filter Presets</span>
            </span>
            {openSections.presetFilter ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {openSections.presetFilter && (
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(FILTER_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handleApplyFilterPreset(key)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition text-left ${
                      (selectedClip.filter.presetKey || 'original') === key
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md'
                        : 'bg-dark-900/60 text-gray-400 border-dark-700 hover:text-white'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-gray-400">
                    Preset Intensity ({selectedClip.filter.presetIntensity ?? 100}%)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedClip.filter.presetIntensity ?? 100}
                  onChange={(e) => updateClipFilter(selectedClip!.id, { presetIntensity: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                />
              </div>
            </div>
          )}
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
          </div>
        )}
      </div>

      {/* VIDEO EFFECTS SECTION (Vignette, Glow, Blur, Color Shift) */}
      {(selectedClip.type === 'video' || selectedClip.type === 'image') && (
        <div className="border border-dark-700 rounded-xl bg-dark-900/40 overflow-hidden">
          <button
            onClick={() => toggleSection('videoEffects')}
            className="w-full px-3 py-2.5 bg-dark-900/80 flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider"
          >
            <span className="flex items-center space-x-1.5">
              <Wand2 className="w-4 h-4 text-purple-400" />
              <span>Video Effects</span>
            </span>
            {openSections.videoEffects ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {openSections.videoEffects && (
            <div className="p-3 space-y-3">
              <div>
                <span className="text-[10px] font-semibold text-gray-400 block mb-1">
                  Vignette ({selectedClip.filter.vignette || 0}%)
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedClip.filter.vignette || 0}
                  onChange={(e) => updateClipFilter(selectedClip!.id, { vignette: parseInt(e.target.value, 10) })}
                  className="w-full accent-purple-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                />
              </div>

              <div>
                <span className="text-[10px] font-semibold text-gray-400 block mb-1">
                  Glow ({selectedClip.filter.glow || 0}%)
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedClip.filter.glow || 0}
                  onChange={(e) => updateClipFilter(selectedClip!.id, { glow: parseInt(e.target.value, 10) })}
                  className="w-full accent-purple-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                />
              </div>

              <div>
                <span className="text-[10px] font-semibold text-gray-400 block mb-1">
                  Blur Effect ({selectedClip.filter.blur || 0}px)
                </span>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={selectedClip.filter.blur || 0}
                  onChange={(e) => updateClipFilter(selectedClip!.id, { blur: parseInt(e.target.value, 10) })}
                  className="w-full accent-purple-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                />
              </div>

              <div>
                <span className="text-[10px] font-semibold text-gray-400 block mb-1">
                  Color Shift ({selectedClip.filter.colorShift || 0}°)
                </span>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={selectedClip.filter.colorShift || 0}
                  onChange={(e) => updateClipFilter(selectedClip!.id, { colorShift: parseInt(e.target.value, 10) })}
                  className="w-full accent-purple-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      )}

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
                  Fade ({selectedClip.filter.fade || 0}%)
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedClip.filter.fade || 0}
                  onChange={(e) => updateClipFilter(selectedClip!.id, { fade: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
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
