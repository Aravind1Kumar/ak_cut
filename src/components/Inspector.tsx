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
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Square,
  Sparkles as SparklesIcon,
  Search,
  RefreshCw,
  Sun,
  Flame,
  ArrowUp,
  ArrowDown,
  Minus,
  Clock,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import {
  BlendMode,
  CaptionStyle,
  FilterProps,
  KeyframeEasing,
  SpeedCurveType,
  TextAnimationType,
  TextBackgroundPreset,
  TextFillType,
  TextGlowPreset,
  TextOutlinePreset,
  TextProps,
  TextShadowPreset,
  TextTransformType,
} from '../types/timeline';
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
  'Lato, sans-serif',
  'Nunito, sans-serif',
  'Raleway, sans-serif',
  'Oswald, sans-serif',
  'Playfair Display, serif',
  'Georgia, serif',
  'Times New Roman, serif',
  'Courier New, monospace',
  'Impact, sans-serif',
  'Bebas Neue, sans-serif',
];

const QUICK_COLORS = [
  { name: 'White', hex: '#ffffff' },
  { name: 'Black', hex: '#000000' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Pink', hex: '#ec4899' },
];

const GLOW_COLOR_PRESETS = [
  { name: 'Cyan Glow', hex: '#06b6d4' },
  { name: 'Blue Glow', hex: '#3b82f6' },
  { name: 'Purple Glow', hex: '#a855f7' },
  { name: 'Pink Glow', hex: '#ec4899' },
  { name: 'White Glow', hex: '#ffffff' },
];

const FONT_SIZE_PRESETS = [16, 24, 32, 48, 64, 72, 96, 120, 160, 200, 300];

export const Inspector: React.FC = () => {
  const [activeTextTab, setActiveTextTab] = useState<'text' | 'style' | 'effects' | 'presets'>('text');
  const [fontSearchQuery, setFontSearchQuery] = useState('');
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const [recentColors, setRecentColors] = useState<string[]>(['#ffffff', '#00f2fe', '#ef4444', '#a855f7']);

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
    resetSelectedClipTextStyle,
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

  const handleAddRecentColor = (hex: string) => {
    if (!hex || !hex.startsWith('#')) return;
    setRecentColors((prev) => {
      const filtered = prev.filter((c) => c.toLowerCase() !== hex.toLowerCase());
      return [hex, ...filtered].slice(0, 8);
    });
  };

  if (!selectedClip) {
    return (
      <aside className="w-80 bg-dark-900 border-l border-dark-700 flex flex-col p-4 select-none shrink-0 overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-500 space-y-3">
          <Sliders className="w-12 h-12 text-gray-600 stroke-1" />
          <h3 className="text-sm font-bold text-gray-300">No Clip Selected</h3>
          <p className="text-xs text-gray-500">Select a clip on the timeline or click text on canvas to open property controls.</p>
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
    underline: false,
    strikethrough: false,
    textTransform: 'none',
    fillType: 'solid',
  };

  const filteredFonts = SUPPORTED_FONTS.filter((font) =>
    font.toLowerCase().includes(fontSearchQuery.toLowerCase())
  );

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

      {/* DEDICATED PROFESSIONAL TEXT EDITOR */}
      {selectedClip.type === 'text' && (
        <div className="border border-cyan-500/40 rounded-2xl bg-dark-950/90 overflow-hidden shadow-2xl flex flex-col">
          {/* Section Header */}
          <div className="px-3 py-2.5 bg-gradient-to-r from-cyan-950/40 to-dark-900 border-b border-cyan-500/30 flex items-center justify-between">
            <span className="flex items-center space-x-2 text-xs font-black text-cyan-300 uppercase tracking-widest">
              <Type className="w-4 h-4 text-cyan-400" />
              <span>TEXT WORKSPACE</span>
            </span>

            {/* Quick Actions */}
            <div className="flex items-center space-x-1">
              <button
                onClick={copySelectedClipTextStyle}
                className="p-1 hover:bg-dark-800 rounded text-gray-400 hover:text-cyan-300 transition"
                title="Copy TextStyle"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={pasteSelectedClipTextStyle}
                disabled={!copiedTextStyle}
                className="p-1 hover:bg-dark-800 rounded text-gray-400 hover:text-green-400 disabled:opacity-30 transition"
                title="Paste TextStyle"
              >
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={resetSelectedClipTextStyle}
                className="p-1 hover:bg-dark-800 rounded text-gray-400 hover:text-red-400 transition"
                title="Reset TextStyle Defaults"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sticky Tab Navigation Bar */}
          <div className="flex items-center border-b border-dark-800 bg-dark-900/90 text-xs font-bold text-gray-400">
            {(['text', 'style', 'effects', 'presets'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTextTab(tab)}
                className={`flex-1 py-2 text-center uppercase tracking-wider transition border-b-2 ${
                  activeTextTab === tab
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 font-black'
                    : 'border-transparent hover:text-gray-200 hover:bg-dark-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Scrollable Editor Container */}
          <div className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-230px)]">
            {/* TAB 1: TEXT CONTENT */}
            {activeTextTab === 'text' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TEXT CONTENT</span>
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      (e.target as HTMLElement).blur();
                    }
                  }}
                  rows={4}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-xs text-white outline-none focus:border-cyan-400 font-sans resize-none shadow-inner"
                  placeholder="Type text content here..."
                />
              </div>
            )}

            {/* TAB 1 & 2: TYPOGRAPHY & STYLING */}
            {(activeTextTab === 'text' || activeTextTab === 'style') && (
              <>
                {/* SEARCHABLE FONT SELECTOR WITH LIVE PREVIEW */}
                <div className="relative">
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">FONT FAMILY & PREVIEW</label>
                  <button
                    onClick={() => setIsFontMenuOpen(!isFontMenuOpen)}
                    className="w-full bg-dark-900 border border-dark-700 hover:border-cyan-500/60 rounded-xl px-3 py-2 text-xs text-white font-medium flex items-center justify-between transition"
                  >
                    <span style={{ fontFamily: currentText.fontFamily }}>{currentText.fontFamily.split(',')[0]}</span>
                    <ChevronDown className="w-4 h-4 text-cyan-400" />
                  </button>

                  {/* Font Search Dropdown Modal */}
                  {isFontMenuOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl z-30 p-2 space-y-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={fontSearchQuery}
                          onChange={(e) => setFontSearchQuery(e.target.value)}
                          placeholder="Search fonts..."
                          className="w-full bg-dark-950 border border-dark-700 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto space-y-1">
                        {filteredFonts.map((font) => (
                          <button
                            key={font}
                            onClick={() => {
                              pushHistory();
                              updateClipText(selectedClip!.id, { fontFamily: font });
                              setIsFontMenuOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-2 rounded-xl text-xs transition flex items-center justify-between border ${
                              currentText.fontFamily === font ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold' : 'text-gray-300 hover:bg-dark-800 border-transparent'
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="font-bold">{font.split(',')[0]}</span>
                              <span className="text-[11px] text-gray-400 truncate max-w-[180px]" style={{ fontFamily: font }}>
                                Aa Bb Cc 123
                              </span>
                            </div>
                            {currentText.fontFamily === font && <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* FONT SIZE CONTROLS */}
                <div className="p-3 bg-dark-900/80 border border-dark-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">FONT SIZE</span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          pushHistory();
                          updateClipText(selectedClip!.id, { fontSize: Math.max(8, currentText.fontSize - 4) });
                        }}
                        className="w-6 h-6 rounded bg-dark-800 hover:bg-dark-700 text-gray-300 font-bold text-xs flex items-center justify-center border border-dark-700"
                      >
                        -
                      </button>
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
                        className="w-16 bg-dark-950 border border-dark-700 rounded-lg px-2 py-0.5 text-xs text-cyan-300 font-mono font-bold text-center outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={() => {
                          pushHistory();
                          updateClipText(selectedClip!.id, { fontSize: Math.min(300, currentText.fontSize + 4) });
                        }}
                        className="w-6 h-6 rounded bg-dark-800 hover:bg-dark-700 text-gray-300 font-bold text-xs flex items-center justify-center border border-dark-700"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Range Slider */}
                  <input
                    type="range"
                    min="8"
                    max="300"
                    value={currentText.fontSize}
                    onChange={(e) => updateClipText(selectedClip!.id, { fontSize: parseInt(e.target.value, 10) })}
                    onMouseDown={() => pushHistory()}
                    className="w-full accent-cyan-400 bg-dark-950 rounded-lg h-1.5 cursor-pointer"
                  />

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center space-x-1 overflow-x-auto pt-1 no-scrollbar">
                    {FONT_SIZE_PRESETS.map((sz) => (
                      <button
                        key={sz}
                        onClick={() => {
                          pushHistory();
                          updateClipText(selectedClip!.id, { fontSize: sz });
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition ${
                          currentText.fontSize === sz
                            ? 'bg-cyan-500 text-black border-cyan-400 font-black'
                            : 'bg-dark-950 text-gray-400 border-dark-700 hover:text-white'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* WORD-PROCESSOR TOOLBAR: B I U S Aa */}
                <div className="p-3 bg-dark-900/80 border border-dark-800 rounded-xl space-y-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">FORMATTING & CASE</span>
                  <div className="flex items-center justify-between gap-2">
                    {/* B I U S Buttons */}
                    <div className="flex items-center space-x-1 bg-dark-950 p-1 rounded-xl border border-dark-700">
                      <button
                        onClick={() => {
                          pushHistory();
                          updateClipText(selectedClip!.id, { bold: !currentText.bold });
                        }}
                        className={`w-8 h-8 rounded-lg transition text-xs flex items-center justify-center ${
                          currentText.bold ? 'bg-cyan-500 text-black font-black shadow-md' : 'text-gray-400 hover:text-white'
                        }`}
                        title="Bold"
                      >
                        <Bold className="w-4 h-4 stroke-[2.5]" />
                      </button>
                      <button
                        onClick={() => {
                          pushHistory();
                          updateClipText(selectedClip!.id, { italic: !currentText.italic });
                        }}
                        className={`w-8 h-8 rounded-lg transition text-xs flex items-center justify-center ${
                          currentText.italic ? 'bg-cyan-500 text-black font-black shadow-md' : 'text-gray-400 hover:text-white'
                        }`}
                        title="Italic"
                      >
                        <Italic className="w-4 h-4 stroke-[2.5]" />
                      </button>
                      <button
                        onClick={() => {
                          pushHistory();
                          updateClipText(selectedClip!.id, { underline: !currentText.underline });
                        }}
                        className={`w-8 h-8 rounded-lg transition text-xs flex items-center justify-center ${
                          currentText.underline ? 'bg-cyan-500 text-black font-black shadow-md' : 'text-gray-400 hover:text-white'
                        }`}
                        title="Underline"
                      >
                        <Underline className="w-4 h-4 stroke-[2.5]" />
                      </button>
                      <button
                        onClick={() => {
                          pushHistory();
                          updateClipText(selectedClip!.id, { strikethrough: !currentText.strikethrough });
                        }}
                        className={`w-8 h-8 rounded-lg transition text-xs flex items-center justify-center ${
                          currentText.strikethrough ? 'bg-cyan-500 text-black font-black shadow-md' : 'text-gray-400 hover:text-white'
                        }`}
                        title="Strikethrough"
                      >
                        <Strikethrough className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>

                    {/* Text Weight */}
                    <div className="w-28">
                      <select
                        value={currentText.fontWeight || 'bold'}
                        onChange={(e) => {
                          pushHistory();
                          updateClipText(selectedClip!.id, { fontWeight: e.target.value as any });
                        }}
                        className="w-full bg-dark-950 border border-dark-700 rounded-xl px-2 py-2 text-[11px] text-cyan-300 font-bold outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        <option value="100">Thin 100</option>
                        <option value="300">Light 300</option>
                        <option value="400">Regular 400</option>
                        <option value="500">Medium 500</option>
                        <option value="600">Semibold 600</option>
                        <option value="700">Bold 700</option>
                        <option value="800">Extra Bold</option>
                        <option value="900">Black 900</option>
                      </select>
                    </div>

                    {/* Text Transform / Case */}
                    <div className="flex-1">
                      <select
                        value={currentText.textTransform || 'none'}
                        onChange={(e) => {
                          pushHistory();
                          updateClipText(selectedClip!.id, { textTransform: e.target.value as TextTransformType });
                        }}
                        className="w-full bg-dark-950 border border-dark-700 rounded-xl px-2 py-2 text-[11px] text-cyan-300 font-bold outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        <option value="none">Aa Normal Case</option>
                        <option value="uppercase">AA UPPERCASE</option>
                        <option value="lowercase">aa lowercase</option>
                        <option value="titlecase">Aa Title Case</option>
                      </select>
                    </div>
                  </div>


                  {/* Horizontal & Vertical Alignment Toolbar */}
                  <div className="space-y-1.5 pt-1 border-t border-dark-800">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">ALIGNMENT (HORIZONTAL & VERTICAL)</span>
                    <div className="flex items-center space-x-1 bg-dark-950 p-1 rounded-xl border border-dark-700">
                      {(['left', 'center', 'right', 'justify'] as const).map((align) => (
                        <button
                          key={align}
                          onClick={() => {
                            pushHistory();
                            updateClipText(selectedClip!.id, { alignment: align });
                          }}
                          className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center ${
                            currentText.alignment === align ? 'bg-cyan-500 text-black font-black shadow-md' : 'text-gray-400 hover:text-white'
                          }`}
                          title={`Align ${align.toUpperCase()}`}
                        >
                          {align === 'left' ? (
                            <AlignLeft className="w-4 h-4 stroke-[2.5]" />
                          ) : align === 'center' ? (
                            <AlignCenter className="w-4 h-4 stroke-[2.5]" />
                          ) : align === 'right' ? (
                            <AlignRight className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <AlignJustify className="w-4 h-4 stroke-[2.5]" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center space-x-1 bg-dark-950 p-1 rounded-xl border border-dark-700">
                      {(['top', 'center', 'bottom'] as const).map((vAlign) => (
                        <button
                          key={vAlign}
                          onClick={() => {
                            pushHistory();
                            updateClipText(selectedClip!.id, { verticalAlignment: vAlign });
                          }}
                          className={`flex-1 py-1 rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center space-x-1 ${
                            (currentText.verticalAlignment || 'center') === vAlign ? 'bg-cyan-500 text-black font-black shadow-md' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {vAlign === 'top' ? <ArrowUp className="w-3 h-3" /> : vAlign === 'bottom' ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                          <span>{vAlign}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Opacity Slider */}
                  <div className="space-y-1 pt-1 border-t border-dark-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-gray-400 uppercase">TEXT OPACITY</span>
                      <span className="text-[10px] font-mono font-bold text-cyan-300">
                        {Math.round((currentText.textOpacity ?? 1.0) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={currentText.textOpacity ?? 1.0}
                      onChange={(e) => updateClipText(selectedClip!.id, { textOpacity: parseFloat(e.target.value) })}
                      onMouseDown={() => pushHistory()}
                      className="w-full accent-cyan-400 h-1.5 bg-dark-950 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>


                {/* TEXT COLOR & FILL MODE WITH RECENT COLORS */}
                <div className="p-3 bg-dark-900/80 border border-dark-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">FILL TYPE & COLOR</span>
                    <div className="flex items-center space-x-1 bg-dark-950 p-0.5 rounded-lg border border-dark-700 text-[10px] font-bold">
                      <button
                        onClick={() => {
                          pushHistory();
                          updateClipText(selectedClip!.id, { fillType: 'solid' });
                        }}
                        className={`px-2 py-0.5 rounded ${currentText.fillType !== 'gradient' ? 'bg-cyan-500 text-black font-bold' : 'text-gray-400'}`}
                      >
                        Solid
                      </button>
                      <button
                        onClick={() => {
                          pushHistory();
                          updateClipText(selectedClip!.id, { fillType: 'gradient', gradientColorStop2: currentText.gradientColorStop2 || '#00f2fe' });
                        }}
                        className={`px-2 py-0.5 rounded ${currentText.fillType === 'gradient' ? 'bg-cyan-500 text-black font-bold' : 'text-gray-400'}`}
                      >
                        Gradient
                      </button>
                    </div>
                  </div>

                  {/* Color Pickers */}
                  <div className="flex items-center space-x-3">
                    {/* Primary Color Picker */}
                    <div className="flex items-center space-x-2 bg-dark-950 p-2 rounded-xl border border-dark-700 flex-1">
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-dark-600 shrink-0">
                        <input
                          type="color"
                          value={currentText.color && currentText.color.startsWith('#') ? currentText.color : '#ffffff'}
                          onChange={(e) => {
                            updateClipText(selectedClip!.id, { color: e.target.value });
                            handleAddRecentColor(e.target.value);
                          }}
                          onMouseDown={() => pushHistory()}
                          className="absolute -inset-2 w-12 h-12 cursor-pointer border-0 bg-transparent"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-gray-500 uppercase">COLOR 1</span>
                        <input
                          type="text"
                          value={currentText.color}
                          onChange={(e) => {
                            updateClipText(selectedClip!.id, { color: e.target.value });
                            handleAddRecentColor(e.target.value);
                          }}
                          className="w-16 bg-transparent text-xs font-mono font-bold text-cyan-300 uppercase outline-none"
                        />
                      </div>
                    </div>

                    {/* Gradient Secondary Color Picker */}
                    {currentText.fillType === 'gradient' && (
                      <div className="flex items-center space-x-2 bg-dark-950 p-2 rounded-xl border border-dark-700 flex-1">
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-dark-600 shrink-0">
                          <input
                            type="color"
                            value={currentText.gradientColorStop2 || '#00f2fe'}
                            onChange={(e) => {
                              updateClipText(selectedClip!.id, { gradientColorStop2: e.target.value });
                              handleAddRecentColor(e.target.value);
                            }}
                            onMouseDown={() => pushHistory()}
                            className="absolute -inset-2 w-12 h-12 cursor-pointer border-0 bg-transparent"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-gray-500 uppercase">COLOR 2</span>
                          <input
                            type="text"
                            value={currentText.gradientColorStop2 || '#00f2fe'}
                            onChange={(e) => {
                              updateClipText(selectedClip!.id, { gradientColorStop2: e.target.value });
                              handleAddRecentColor(e.target.value);
                            }}
                            className="w-16 bg-transparent text-xs font-mono font-bold text-cyan-300 uppercase outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Gradient Angle Slider */}
                  {currentText.fillType === 'gradient' && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block mb-1">GRADIENT ANGLE ({currentText.gradientAngle || 90}°)</span>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={currentText.gradientAngle || 90}
                        onChange={(e) => updateClipText(selectedClip!.id, { gradientAngle: parseInt(e.target.value, 10) })}
                        onMouseDown={() => pushHistory()}
                        className="w-full accent-cyan-400 bg-dark-950 rounded-lg h-1.5 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Recent Colors Swatches */}
                  {recentColors.length > 0 && (
                    <div>
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 flex items-center space-x-1">
                        <Clock className="w-2.5 h-2.5 text-cyan-400" />
                        <span>RECENT COLORS</span>
                      </span>
                      <div className="flex items-center space-x-1.5">
                        {recentColors.map((hex) => (
                          <button
                            key={hex}
                            onClick={() => {
                              pushHistory();
                              updateClipText(selectedClip!.id, { color: hex });
                            }}
                            className="w-6 h-6 rounded-full border border-dark-600 transition transform hover:scale-110 shrink-0"
                            style={{ backgroundColor: hex }}
                            title={`Use Recent ${hex}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Color Swatches */}
                  <div>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">QUICK PALETTE</span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {QUICK_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          onClick={() => {
                            pushHistory();
                            updateClipText(selectedClip!.id, { color: c.hex });
                            handleAddRecentColor(c.hex);
                          }}
                          className={`py-1 px-1 rounded-lg border border-dark-700 transition flex items-center space-x-1.5 ${
                            currentText.color.toLowerCase() === c.hex.toLowerCase() ? 'ring-2 ring-cyan-400 bg-dark-800 font-black' : 'bg-dark-950'
                          }`}
                        >
                          <span className="w-3.5 h-3.5 rounded-full border border-dark-600 shrink-0" style={{ backgroundColor: c.hex }} />
                          <span className="text-[9px] text-gray-300 font-bold truncate">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SPACING CONTROLS */}
                <div className="p-3 bg-dark-900/80 border border-dark-800 rounded-xl space-y-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">SPACING & LEADING</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block mb-1">LETTER SPACING ({currentText.letterSpacing || 0}px)</span>
                      <input
                        type="range"
                        min="-10"
                        max="40"
                        value={currentText.letterSpacing || 0}
                        onChange={(e) => updateClipText(selectedClip!.id, { letterSpacing: parseInt(e.target.value, 10) })}
                        onMouseDown={() => pushHistory()}
                        className="w-full accent-cyan-400 bg-dark-950 rounded-lg h-1.5 cursor-pointer"
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
                        className="w-full accent-cyan-400 bg-dark-950 rounded-lg h-1.5 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB 3: EFFECTS (BACKGROUND, STROKE, SHADOW, GLOW) */}
            {activeTextTab === 'effects' && (
              <>
                {/* BACKGROUND BOX */}
                <div className="p-3 bg-dark-900/80 border border-dark-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-200">Background Box</span>
                    <input
                      type="checkbox"
                      checked={currentText.backgroundEnabled ?? false}
                      onChange={(e) => {
                        pushHistory();
                        updateClipText(selectedClip!.id, { backgroundEnabled: e.target.checked });
                      }}
                      className="accent-cyan-400 w-4 h-4 rounded cursor-pointer"
                    />
                  </div>

                  {currentText.backgroundEnabled && (
                    <div className="space-y-3 pt-1 border-t border-dark-800">
                      {/* Presets */}
                      <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
                        {(['none', 'solid', 'rounded', 'pill', 'highlight', 'label'] as const).map((preset) => (
                          <button
                            key={preset}
                            onClick={() => {
                              pushHistory();
                              updateClipText(selectedClip!.id, { backgroundPreset: preset });
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition ${
                              currentText.backgroundPreset === preset ? 'bg-cyan-500 text-black font-black' : 'bg-dark-950 text-gray-400 hover:text-white'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      {/* Color */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-gray-400">Box Color</span>
                        <input
                          type="color"
                          value={currentText.backgroundColor === 'transparent' ? '#000000' : currentText.backgroundColor}
                          onChange={(e) => updateClipText(selectedClip!.id, { backgroundColor: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border border-dark-700 bg-transparent"
                        />
                      </div>

                      {/* Opacity, Padding & Radius Sliders */}
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 block mb-1">
                          Background Opacity ({Math.round((currentText.backgroundOpacity ?? 0.8) * 100)}%)
                        </span>
                        <input
                          type="range"
                          min="0.0"
                          max="1.0"
                          step="0.05"
                          value={currentText.backgroundOpacity ?? 0.8}
                          onChange={(e) => updateClipText(selectedClip!.id, { backgroundOpacity: parseFloat(e.target.value) })}
                          onMouseDown={() => pushHistory()}
                          className="w-full accent-cyan-400 bg-dark-950 rounded-lg h-1.5 cursor-pointer"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 block mb-1">
                            Padding ({currentText.backgroundPadding ?? 16}px)
                          </span>
                          <input
                            type="range"
                            min="0"
                            max="40"
                            value={currentText.backgroundPadding ?? 16}
                            onChange={(e) => updateClipText(selectedClip!.id, { backgroundPadding: parseInt(e.target.value, 10) })}
                            onMouseDown={() => pushHistory()}
                            className="w-full accent-cyan-400 bg-dark-950 rounded-lg h-1.5 cursor-pointer"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 block mb-1">
                            Corner Radius ({currentText.borderRadius ?? 8}px)
                          </span>
                          <input
                            type="range"
                            min="0"
                            max="30"
                            value={currentText.borderRadius ?? 8}
                            onChange={(e) => updateClipText(selectedClip!.id, { borderRadius: parseInt(e.target.value, 10) })}
                            onMouseDown={() => pushHistory()}
                            className="w-full accent-cyan-400 bg-dark-950 rounded-lg h-1.5 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* OUTLINE / STROKE */}
                <div className="p-3 bg-dark-900/80 border border-dark-800 rounded-xl space-y-3">
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
                    <div className="space-y-3 pt-1 border-t border-dark-800">
                      {/* Width Presets */}
                      <div className="flex items-center space-x-1">
                        {(['thin', 'medium', 'heavy'] as const).map((preset) => (
                          <button
                            key={preset}
                            onClick={() => {
                              pushHistory();
                              updateClipText(selectedClip!.id, { outlinePreset: preset });
                            }}
                            className={`flex-1 py-1 rounded text-[10px] font-bold uppercase transition ${
                              currentText.outlinePreset === preset ? 'bg-cyan-500 text-black font-black' : 'bg-dark-950 text-gray-400 hover:text-white'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-gray-400">Stroke Color</span>
                        <input
                          type="color"
                          value={currentText.outlineColor || '#000000'}
                          onChange={(e) => updateClipText(selectedClip!.id, { outlineColor: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border border-dark-700 bg-transparent"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-gray-400 block mb-1">
                          Stroke Width ({currentText.outlineWidth || 2}px)
                        </span>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={currentText.outlineWidth || 2}
                          onChange={(e) => updateClipText(selectedClip!.id, { outlineWidth: parseInt(e.target.value, 10) })}
                          onMouseDown={() => pushHistory()}
                          className="w-full accent-cyan-400 bg-dark-950 rounded-lg h-1.5 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* DROP SHADOW */}
                <div className="p-3 bg-dark-900/80 border border-dark-800 rounded-xl space-y-3">
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
                    <div className="space-y-3 pt-1 border-t border-dark-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-gray-400">Shadow Color</span>
                        <input
                          type="color"
                          value={currentText.shadowColor || '#000000'}
                          onChange={(e) => updateClipText(selectedClip!.id, { shadowColor: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border border-dark-700 bg-transparent"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-gray-400 block mb-1">
                          Blur Radius ({currentText.shadowBlur ?? 10}px)
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="50"
                          value={currentText.shadowBlur ?? 10}
                          onChange={(e) => updateClipText(selectedClip!.id, { shadowBlur: parseInt(e.target.value, 10) })}
                          onMouseDown={() => pushHistory()}
                          className="w-full accent-cyan-400 bg-dark-950 rounded-lg h-1.5 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* TEXT GLOW */}
                <div className="p-3 bg-dark-900/80 border border-dark-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-200">Text Glow Effect</span>
                    <input
                      type="checkbox"
                      checked={currentText.glowEnabled ?? false}
                      onChange={(e) => {
                        pushHistory();
                        updateClipText(selectedClip!.id, { glowEnabled: e.target.checked });
                      }}
                      className="accent-cyan-400 w-4 h-4 rounded cursor-pointer"
                    />
                  </div>

                  {currentText.glowEnabled && (
                    <div className="space-y-3 pt-1 border-t border-dark-800">
                      {/* Glow Presets */}
                      <div className="grid grid-cols-3 gap-1">
                        {GLOW_COLOR_PRESETS.map((gp) => (
                          <button
                            key={gp.name}
                            onClick={() => {
                              pushHistory();
                              updateClipText(selectedClip!.id, { glowColor: gp.hex, glowBlur: 30 });
                            }}
                            className="py-1 px-1 rounded text-[9px] font-bold transition flex items-center space-x-1 bg-dark-950 border border-dark-700 hover:border-cyan-400"
                          >
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: gp.hex, boxShadow: `0 0 6px ${gp.hex}` }} />
                            <span className="text-gray-300 truncate">{gp.name.split(' ')[0]}</span>
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-gray-400">Custom Glow Color</span>
                        <input
                          type="color"
                          value={currentText.glowColor || '#00f2fe'}
                          onChange={(e) => updateClipText(selectedClip!.id, { glowColor: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border border-dark-700 bg-transparent"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-gray-400 block mb-1">
                          Glow Blur ({currentText.glowBlur ?? 30}px)
                        </span>
                        <input
                          type="range"
                          min="5"
                          max="60"
                          value={currentText.glowBlur ?? 30}
                          onChange={(e) => updateClipText(selectedClip!.id, { glowBlur: parseInt(e.target.value, 10) })}
                          onMouseDown={() => pushHistory()}
                          className="w-full accent-cyan-400 bg-dark-950 rounded-lg h-1.5 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* TAB 4: 18 VISUAL TEXT PRESET CARDS */}
            {activeTextTab === 'presets' && (
              <div className="p-3 bg-dark-900/80 border border-dark-800 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block flex items-center space-x-1">
                  <SparklesIcon className="w-3.5 h-3.5" />
                  <span>18 VISUAL TEXT STYLE PRESETS</span>
                </span>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {Object.entries(TEXT_PRESETS).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => handleApplyTextPreset(key)}
                      className={`p-2.5 rounded-xl border text-left transition transform hover:scale-[1.02] flex flex-col justify-between h-20 ${
                        currentText.presetKey === key
                          ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400 shadow-lg shadow-cyan-500/10'
                          : 'border-dark-700 bg-dark-950 hover:border-cyan-500/50'
                      }`}
                      style={{
                        backgroundColor: val.style.backgroundEnabled ? val.style.backgroundColor || '#000' : undefined,
                      }}
                    >
                      <span className="text-[10px] font-black text-cyan-300 truncate tracking-wide">{val.name}</span>
                      <span
                        className="text-sm truncate font-bold"
                        style={{
                          fontFamily: val.style.fontFamily || 'sans-serif',
                          color: val.style.color || '#fff',
                          textShadow: val.style.glowEnabled ? `0 0 10px ${val.style.glowColor || '#00f2fe'}` : undefined,
                        }}
                      >
                        Sample Text
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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
