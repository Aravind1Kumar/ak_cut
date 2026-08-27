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
  Gauge,
  Activity,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Square,
  Sparkles as SparklesIcon,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { BlendMode, CaptionStyle, FilterProps, KeyframeEasing, SpeedCurveType, TextAnimationType, TextProps } from '../types/timeline';
import { DEFAULT_CAPTION_STYLES } from '../utils/captionEngine';
import { normalizeClipAudioGain } from '../utils/audioNormalizeEngine';
import { SPEED_CURVE_PRESETS } from '../utils/speedEngine';
import { applyMotionPresetToClip, MotionPresetType } from '../utils/motionEngine';
import { TEXT_PRESETS } from '../utils/textRenderEngine';

const SUPPORTED_FONTS = [
  'Inter, sans-serif',
  'Poppins, sans-serif',
  'Roboto, sans-serif',
  'Montserrat, sans-serif',
  'Arial, sans-serif',
  'Helvetica, sans-serif',
  'Open Sans, sans-serif',
  'Georgia, serif',
  'Times New Roman, serif',
  'Courier New, monospace',
  'Impact, sans-serif',
];

const COLOR_SWATCHES = [
  { name: 'White', hex: '#ffffff' },
  { name: 'Black', hex: '#000000' },
  { name: 'Red', hex: '#ff0000' },
  { name: 'Green', hex: '#00ff00' },
  { name: 'Blue', hex: '#0000ff' },
  { name: 'Yellow', hex: '#ffff00' },
  { name: 'Cyan', hex: '#00ffff' },
  { name: 'Magenta', hex: '#ff00ff' },
];

export const Inspector: React.FC = () => {
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    text: true,
    keyframes: false,
    speed: false,
    transform: false,
    filter: false,
    effects: false,
    chromaKey: false,
    audio: false,
  });

  const {
    tracks,
    selectedClipId,
    selectedClipIds,
    currentTime,
    editingTextClipId,
    setEditingTextClipId,
    updateClipTransform,
    updateClipFilter,
    updateClipAudio,
    updateClipText,
    updateClipSpeedCurve,
    updateClip,
    addKeyframeToClip,
    removeKeyframeFromClip,
    groupSelectedClips,
    ungroupSelectedClips,
    copySelectedClipTextStyle,
    pasteSelectedClipTextStyle,
    copiedTextStyle,
    beginTransaction,
    commitTransaction,
    pushHistory,
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
          <p className="text-xs text-gray-500">Click a clip on the timeline to edit properties, typography, keyframes, or transforms.</p>
        </div>
      </aside>
    );
  }

  const handleNormalizeAudio = async () => {
    if (!selectedClip) return;
    const normVolume = await normalizeClipAudioGain(selectedClip);
    beginTransaction();
    updateClipAudio(selectedClip.id, { volume: normVolume });
    commitTransaction();
  };

  const handleApplyMotionPreset = (preset: MotionPresetType) => {
    if (!selectedClip) return;
    beginTransaction();
    const newKfs = applyMotionPresetToClip(selectedClip, preset);
    updateClip(selectedClip.id, { keyframes: newKfs });
    commitTransaction();
  };

  const handleApplyTextPreset = (presetKey: string) => {
    if (!selectedClip || !selectedClip.text) return;
    const preset = TEXT_PRESETS[presetKey];
    if (preset) {
      pushHistory();
      updateClipText(selectedClip.id, { ...preset.style, presetKey });
    }
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

  const currentText: TextProps = selectedClip.text || {
    content: 'Type Text Here',
    fontFamily: 'Inter, sans-serif',
    fontSize: 48,
    color: '#ffffff',
    backgroundColor: 'transparent',
    borderColor: '#000000',
    borderWidth: 0,
    alignment: 'center',
    bold: true,
    italic: false,
  };

  return (
    <aside className="w-80 bg-dark-900 border-l border-dark-700 flex flex-col p-4 select-none shrink-0 overflow-y-auto max-h-full space-y-4">
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

      {/* DEDICATED TEXT & TYPOGRAPHY SECTION */}
      {selectedClip.type === 'text' && (
        <div className="border border-cyan-500/40 rounded-xl bg-dark-900/90 overflow-hidden shadow-xl flex flex-col">
          <button
            onClick={() => toggleSection('text')}
            className="w-full px-3 py-2.5 bg-cyan-500/10 flex items-center justify-between text-xs font-bold text-cyan-300 uppercase tracking-wider border-b border-cyan-500/20"
          >
            <span className="flex items-center space-x-1.5">
              <Type className="w-4 h-4 text-cyan-400" />
              <span>TEXT & TYPOGRAPHY</span>
            </span>
            {openSections.text ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {openSections.text && (
            <div className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
              {/* 1. Text Content Input Area */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Text Content (Multiline)</span>
                  <button
                    onClick={() => setEditingTextClipId(selectedClip!.id)}
                    className="text-[10px] text-cyan-400 hover:underline font-bold"
                  >
                    Edit on Canvas
                  </button>
                </div>
                <textarea
                  value={currentText.content}
                  onChange={(e) => updateClipText(selectedClip!.id, { content: e.target.value })}
                  rows={2}
                  className="w-full bg-dark-800 border border-dark-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-500 font-sans resize-none"
                  placeholder="Type text content here..."
                />
              </div>

              {/* 2. WORD-PROCESSOR STYLE TYPOGRAPHY TOOLBAR */}
              <div className="p-3 bg-dark-800/90 border border-dark-700 rounded-xl space-y-3 shadow-inner">
                {/* Row A: Font Family & Size */}
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 block mb-0.5">FONT</label>
                    <select
                      value={currentText.fontFamily}
                      onChange={(e) => {
                        pushHistory();
                        updateClipText(selectedClip!.id, { fontFamily: e.target.value });
                      }}
                      className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500 font-medium cursor-pointer"
                    >
                      {SUPPORTED_FONTS.map((font) => (
                        <option key={font} value={font}>
                          {font.split(',')[0]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <label className="text-[10px] font-bold text-gray-400 block mb-0.5">SIZE (PX)</label>
                    <input
                      type="number"
                      min="8"
                      max="300"
                      value={currentText.fontSize}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          pushHistory();
                          updateClipText(selectedClip!.id, { fontSize: Math.max(8, Math.min(300, val)) });
                        }
                      }}
                      className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2 py-1 text-xs text-cyan-300 font-mono font-bold text-center outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Font Size Range Slider */}
                <div>
                  <input
                    type="range"
                    min="8"
                    max="300"
                    value={currentText.fontSize}
                    onChange={(e) => {
                      updateClipText(selectedClip!.id, { fontSize: parseInt(e.target.value, 10) });
                    }}
                    onMouseDown={() => pushHistory()}
                    className="w-full accent-cyan-400 bg-dark-900 rounded-lg h-1.5 cursor-pointer"
                  />
                </div>

                {/* Row B: Formatting Buttons [ B ] [ I ] [ U ] & Alignment [ Left ] [ Center ] [ Right ] */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-dark-700/60">
                  {/* Style B I U */}
                  <div className="flex items-center space-x-1 bg-dark-900 p-1 rounded-xl border border-dark-700">
                    <button
                      onClick={() => {
                        pushHistory();
                        updateClipText(selectedClip!.id, { bold: !currentText.bold });
                      }}
                      className={`w-8 h-8 rounded-lg transition font-bold text-xs flex items-center justify-center ${
                        currentText.bold
                          ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-extrabold ring-1 ring-cyan-400'
                          : 'text-gray-400 hover:text-white hover:bg-dark-800'
                      }`}
                      title="Bold (B)"
                    >
                      <Bold className="w-4 h-4 stroke-[2.5]" />
                    </button>
                    <button
                      onClick={() => {
                        pushHistory();
                        updateClipText(selectedClip!.id, { italic: !currentText.italic });
                      }}
                      className={`w-8 h-8 rounded-lg transition text-xs flex items-center justify-center ${
                        currentText.italic
                          ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-bold ring-1 ring-cyan-400'
                          : 'text-gray-400 hover:text-white hover:bg-dark-800'
                      }`}
                      title="Italic (I)"
                    >
                      <Italic className="w-4 h-4 stroke-[2.5]" />
                    </button>
                    <button
                      onClick={() => {
                        pushHistory();
                        updateClipText(selectedClip!.id, { underline: !currentText.underline });
                      }}
                      className={`w-8 h-8 rounded-lg transition text-xs flex items-center justify-center ${
                        currentText.underline
                          ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-bold ring-1 ring-cyan-400'
                          : 'text-gray-400 hover:text-white hover:bg-dark-800'
                      }`}
                      title="Underline (U)"
                    >
                      <Underline className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Alignment Left Center Right */}
                  <div className="flex items-center space-x-1 bg-dark-900 p-1 rounded-xl border border-dark-700">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => {
                          pushHistory();
                          updateClipText(selectedClip!.id, { alignment: align });
                        }}
                        className={`w-8 h-8 rounded-lg transition flex items-center justify-center ${
                          currentText.alignment === align
                            ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-bold ring-1 ring-cyan-400'
                            : 'text-gray-400 hover:text-white hover:bg-dark-800'
                        }`}
                        title={`Align ${align.charAt(0).toUpperCase() + align.slice(1)}`}
                      >
                        {align === 'left' ? (
                          <AlignLeft className="w-4 h-4 stroke-[2.5]" />
                        ) : align === 'center' ? (
                          <AlignCenter className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <AlignRight className="w-4 h-4 stroke-[2.5]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row C: Text Color Picker + Editable HEX Input */}
                <div className="pt-2 border-t border-dark-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TEXT COLOR</span>
                    <div className="flex items-center space-x-2 bg-dark-900 px-2 py-1.5 rounded-lg border border-dark-700">
                      <div className="relative w-6 h-6 rounded border border-dark-600 overflow-hidden cursor-pointer flex items-center justify-center">
                        <input
                          type="color"
                          value={currentText.color && currentText.color.startsWith('#') && currentText.color.length === 7 ? currentText.color : '#ffffff'}
                          onChange={(e) => {
                            updateClipText(selectedClip!.id, { color: e.target.value });
                          }}
                          onMouseDown={() => pushHistory()}
                          className="absolute -inset-2 w-10 h-10 cursor-pointer border-0 bg-transparent opacity-100"
                          title="Click to open color picker"
                        />
                      </div>
                      <input
                        type="text"
                        value={currentText.color}
                        onChange={(e) => {
                          updateClipText(selectedClip!.id, { color: e.target.value });
                        }}
                        className="w-16 bg-transparent text-xs font-mono font-bold text-cyan-300 uppercase outline-none"
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>

                  {/* Row D: Quick Color Swatches Grid */}
                  <div>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">QUICK COLORS</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {COLOR_SWATCHES.map((swatch) => (
                        <button
                          key={swatch.hex}
                          onClick={() => {
                            pushHistory();
                            updateClipText(selectedClip!.id, { color: swatch.hex });
                          }}
                          className={`py-1 px-1.5 rounded-lg border border-dark-700 text-[10px] font-bold transition flex items-center space-x-1.5 ${
                            currentText.color.toLowerCase() === swatch.hex.toLowerCase()
                              ? 'ring-2 ring-cyan-400 bg-dark-800'
                              : 'bg-dark-900/80 hover:bg-dark-800'
                          }`}
                        >
                          <span className="w-3.5 h-3.5 rounded-full border border-dark-600 shrink-0" style={{ backgroundColor: swatch.hex }} />
                          <span className="text-gray-300 text-[9px] truncate">{swatch.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row E: Letter Spacing & Line Height */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dark-700/60">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block mb-1">LETTER SPACING ({currentText.letterSpacing || 0}px)</span>
                    <input
                      type="range"
                      min="-10"
                      max="40"
                      value={currentText.letterSpacing || 0}
                      onChange={(e) => updateClipText(selectedClip!.id, { letterSpacing: parseInt(e.target.value, 10) })}
                      onMouseDown={() => pushHistory()}
                      className="w-full accent-cyan-400 bg-dark-900 rounded-lg h-1.5 cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block mb-1">LINE HEIGHT ({currentText.lineHeight || 1.2})</span>
                    <input
                      type="range"
                      min="0.8"
                      max="2.5"
                      step="0.1"
                      value={currentText.lineHeight || 1.2}
                      onChange={(e) => updateClipText(selectedClip!.id, { lineHeight: parseFloat(e.target.value) })}
                      onMouseDown={() => pushHistory()}
                      className="w-full accent-cyan-400 bg-dark-900 rounded-lg h-1.5 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Text Style Presets Grid */}
              <div className="p-3 bg-dark-800/60 border border-dark-700 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block flex items-center space-x-1">
                  <SparklesIcon className="w-3 h-3" />
                  <span>Text Style Presets</span>
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {Object.entries(TEXT_PRESETS).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => handleApplyTextPreset(key)}
                      className="py-1 px-1 bg-dark-900 hover:bg-dark-800 border border-dark-700 hover:border-cyan-500 text-[9px] font-bold text-gray-200 rounded-lg text-center truncate"
                    >
                      {val.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Background Box Settings */}
              <div className="p-2.5 bg-dark-800/80 border border-dark-700 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200">Background Box</span>
                  <input
                    type="checkbox"
                    checked={currentText.backgroundEnabled ?? true}
                    onChange={(e) => {
                      pushHistory();
                      updateClipText(selectedClip!.id, { backgroundEnabled: e.target.checked });
                    }}
                    className="accent-cyan-400 w-4 h-4 rounded cursor-pointer"
                  />
                </div>
                {currentText.backgroundEnabled && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-gray-400">Box Color</span>
                      <input
                        type="color"
                        value={currentText.backgroundColor === 'transparent' ? '#000000' : currentText.backgroundColor}
                        onChange={(e) => updateClipText(selectedClip!.id, { backgroundColor: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer border border-dark-700 bg-transparent"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 block mb-1">
                        Corner Radius ({currentText.borderRadius || 8}px)
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={currentText.borderRadius || 8}
                        onChange={(e) => updateClipText(selectedClip!.id, { borderRadius: parseInt(e.target.value, 10) })}
                        className="w-full accent-cyan-400 bg-dark-900 rounded-lg h-1.5 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Outline Settings */}
              <div className="p-2.5 bg-dark-800/80 border border-dark-700 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200">Outline Stroke</span>
                  <input
                    type="checkbox"
                    checked={currentText.outlineEnabled ?? false}
                    onChange={(e) => {
                      pushHistory();
                      updateClipText(selectedClip!.id, { outlineEnabled: e.target.checked });
                    }}
                    className="accent-cyan-400 w-4 h-4 rounded cursor-pointer"
                  />
                </div>
                {currentText.outlineEnabled && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-gray-400">Outline Color</span>
                      <input
                        type="color"
                        value={currentText.outlineColor || '#000000'}
                        onChange={(e) => updateClipText(selectedClip!.id, { outlineColor: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer border border-dark-700 bg-transparent"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 block mb-1">
                        Width ({currentText.outlineWidth || 2}px)
                      </span>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={currentText.outlineWidth || 2}
                        onChange={(e) => updateClipText(selectedClip!.id, { outlineWidth: parseInt(e.target.value, 10) })}
                        className="w-full accent-cyan-400 bg-dark-900 rounded-lg h-1.5 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 6. Drop Shadow Settings */}
              <div className="p-2.5 bg-dark-800/80 border border-dark-700 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200">Drop Shadow</span>
                  <input
                    type="checkbox"
                    checked={currentText.shadowEnabled ?? false}
                    onChange={(e) => {
                      pushHistory();
                      updateClipText(selectedClip!.id, { shadowEnabled: e.target.checked });
                    }}
                    className="accent-cyan-400 w-4 h-4 rounded cursor-pointer"
                  />
                </div>
                {currentText.shadowEnabled && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-gray-400">Shadow Color</span>
                      <input
                        type="color"
                        value={currentText.shadowColor || '#000000'}
                        onChange={(e) => updateClipText(selectedClip!.id, { shadowColor: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer border border-dark-700 bg-transparent"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 block mb-1">
                        Blur ({currentText.shadowBlur || 10}px)
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={currentText.shadowBlur || 10}
                        onChange={(e) => updateClipText(selectedClip!.id, { shadowBlur: parseInt(e.target.value, 10) })}
                        className="w-full accent-cyan-400 bg-dark-900 rounded-lg h-1.5 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 7. Copy / Paste Style */}
              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={copySelectedClipTextStyle}
                  className="flex-1 py-1.5 bg-dark-800 hover:bg-dark-700 text-gray-200 border border-dark-700 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Copy Style</span>
                </button>
                <button
                  onClick={pasteSelectedClipTextStyle}
                  disabled={!copiedTextStyle}
                  className="flex-1 py-1.5 bg-dark-800 hover:bg-dark-700 text-gray-200 border border-dark-700 disabled:opacity-40 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                  <span>Paste Style</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* SPEED & RAMPING SECTION */}
      {(selectedClip.type === 'video' || selectedClip.type === 'audio') && (
        <div className="border border-dark-700 rounded-xl bg-dark-900/40 overflow-hidden">
          <button
            onClick={() => toggleSection('speed')}
            className="w-full px-3 py-2.5 bg-dark-900/80 flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider"
          >
            <span className="flex items-center space-x-1.5">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <span>Speed & Speed Curves</span>
            </span>
            {openSections.speed ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {openSections.speed && (
            <div className="p-3 space-y-3">
              <div>
                <span className="text-[10px] font-semibold text-gray-400 block mb-1">Speed Curve Preset</span>
                <select
                  value={selectedClip.speedCurve || 'flat'}
                  onChange={(e) => updateClipSpeedCurve(selectedClip!.id, e.target.value as SpeedCurveType)}
                  className="w-full bg-dark-800 border border-dark-700 rounded p-1.5 text-xs text-white outline-none focus:border-cyan-500"
                >
                  {Object.entries(SPEED_CURVE_PRESETS).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-gray-400 block mb-1">
                  Playback Speed Multiplier ({selectedClip.speed}x)
                </span>
                <input
                  type="range"
                  min="0.25"
                  max="4.0"
                  step="0.25"
                  value={selectedClip.speed}
                  onChange={(e) => updateClip(selectedClip!.id, { speed: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 bg-dark-800 rounded-lg h-1.5 cursor-pointer"
                />
              </div>
            </div>
          )}
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
            <span>Keyframes & Motion ({selectedClip.keyframes?.length || 0})</span>
          </span>
          {openSections.keyframes ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {openSections.keyframes && (
          <div className="p-3 space-y-3">
            {/* Motion Presets Grid */}
            <div>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1.5 flex items-center space-x-1">
                <Activity className="w-3 h-3" />
                <span>Quick Motion Presets</span>
              </span>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: 'Fade In', key: 'fadeIn' },
                  { label: 'Fade Out', key: 'fadeOut' },
                  { label: 'Zoom In', key: 'zoomIn' },
                  { label: 'Zoom Out', key: 'zoomOut' },
                  { label: 'Pan L', key: 'panLeft' },
                  { label: 'Pan R', key: 'panRight' },
                  { label: 'Pop', key: 'pop' },
                  { label: 'Bounce', key: 'bounce' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleApplyMotionPreset(item.key as MotionPresetType)}
                    className="py-1 px-1 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-[10px] font-semibold text-gray-300 rounded text-center truncate"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

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
              <button
                onClick={handleNormalizeAudio}
                className="w-full py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Normalize Audio Gain (0 dBFS)</span>
              </button>

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
