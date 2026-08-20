import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Sun,
  Volume2,
  Type,
  Maximize,
  Scissors,
  Copy,
  Trash2,
  Wand2,
  Sparkles,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';

const FONT_OPTIONS = [
  { name: 'Inter (Modern)', value: 'Inter, sans-serif' },
  { name: 'Montserrat (Bold)', value: 'Montserrat, sans-serif' },
  { name: 'Poppins (Trendy)', value: 'Poppins, sans-serif' },
  { name: 'Bebas Neue (Cinematic)', value: "'Bebas Neue', sans-serif" },
  { name: 'Anton (Ultra Thick)', value: 'Anton, sans-serif' },
  { name: 'Oswald (Condensed)', value: 'Oswald, sans-serif' },
  { name: 'Impact (Meme)', value: 'Impact, sans-serif' },
  { name: 'Playfair Display (Luxury)', value: "'Playfair Display', serif" },
  { name: 'Merriweather (Classic)', value: 'Merriweather, serif' },
  { name: 'Pacifico (Script)', value: 'Pacifico, cursive' },
  { name: 'Lobster (Retro Brush)', value: 'Lobster, cursive' },
  { name: 'Permanent Marker (Graffiti)', value: "'Permanent Marker', cursive" },
  { name: 'Caveat (Casual Handwriting)', value: 'Caveat, cursive' },
  { name: 'Roboto (Clean)', value: 'Roboto, sans-serif' },
  { name: 'Monospace (Code)', value: 'monospace' },
];

const PRESET_EFFECTS = [
  { name: '🎬 Teal & Orange', filter: { hueRotate: 30, contrast: 125, saturation: 140, brightness: 100, sepia: 0, blur: 0 } },
  { name: '🎥 Vintage 1970s', filter: { sepia: 75, brightness: 110, contrast: 105, saturation: 100, hueRotate: 0, blur: 0 } },
  { name: '🖤 Moody B&W', filter: { saturation: 0, contrast: 130, brightness: 95, sepia: 0, hueRotate: 0, blur: 0 } },
  { name: '🌆 Cyberpunk Neon', filter: { hueRotate: 190, saturation: 180, contrast: 120, brightness: 100, sepia: 0, blur: 0 } },
  { name: '🌅 Golden Hour', filter: { sepia: 30, saturation: 150, brightness: 105, contrast: 100, hueRotate: 0, blur: 0 } },
  { name: '❄️ Cold Winter', filter: { hueRotate: 160, contrast: 110, saturation: 90, brightness: 100, sepia: 0, blur: 0 } },
  { name: '⚡ High Contrast', filter: { contrast: 160, brightness: 105, saturation: 130, sepia: 0, hueRotate: 0, blur: 0 } },
  { name: '👾 VHS Retro', filter: { hueRotate: 240, saturation: 200, contrast: 110, brightness: 100, sepia: 0, blur: 0 } },
  { name: '🔮 Dream Blur Glow', filter: { blur: 6, brightness: 115, saturation: 110, contrast: 100, sepia: 0, hueRotate: 0 } },
  { name: '🌌 Vaporwave', filter: { hueRotate: 280, saturation: 170, brightness: 105, contrast: 100, sepia: 0, blur: 0 } },
  { name: '📼 Noir Cinema', filter: { saturation: 0, contrast: 160, brightness: 85, sepia: 0, hueRotate: 0, blur: 0 } },
  { name: '🌈 Psychedelic', filter: { hueRotate: 120, saturation: 220, brightness: 110, contrast: 100, sepia: 0, blur: 0 } },
  { name: '⚡ Faded Pastel', filter: { contrast: 85, brightness: 115, saturation: 80, sepia: 0, hueRotate: 0, blur: 0 } },
  { name: '💎 Deep HDR', filter: { contrast: 150, saturation: 130, brightness: 90, sepia: 0, hueRotate: 0, blur: 0 } },
];

export const Inspector: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transform' | 'filters' | 'audio' | 'text'>('transform');

  const {
    selectedClipId,
    tracks,
    updateClipTransform,
    updateClipFilter,
    updateClipAudio,
    updateClipText,
    updateClip,
    splitSelectedClip,
    duplicateSelectedClip,
    deleteSelectedClip,
  } = useTimelineStore();

  let selectedClip = null;
  if (selectedClipId) {
    for (const track of tracks) {
      const c = track.clips.find((clip) => clip.id === selectedClipId);
      if (c) {
        selectedClip = c;
        break;
      }
    }
  }

  useEffect(() => {
    if (selectedClip?.type === 'text') {
      setActiveTab('text');
    } else if (selectedClip) {
      setActiveTab('transform');
    }
  }, [selectedClipId, selectedClip?.type]);

  if (!selectedClip) {
    return (
      <aside className="w-72 bg-dark-800 border-l border-dark-700 p-6 flex flex-col items-center justify-center text-center select-none z-20">
        <div className="w-12 h-12 rounded-full bg-dark-700/60 flex items-center justify-center mb-3">
          <Sliders className="w-6 h-6 text-gray-500" />
        </div>
        <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Inspector Panel</h3>
        <p className="text-[11px] text-gray-500 max-w-[180px]">
          Select any clip on the timeline to edit its properties, fonts, filters, and effects.
        </p>
      </aside>
    );
  }

  const { transform, filter, audio, text, speed } = selectedClip;

  return (
    <aside className="w-80 bg-dark-800 border-l border-dark-700 flex flex-col h-full select-none z-20">
      {/* Header & Quick Actions */}
      <div className="p-3 border-b border-dark-700 bg-dark-900/40 flex items-center justify-between">
        <div className="text-xs font-bold text-gray-200 truncate max-w-[120px]">
          {selectedClip.name}
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={splitSelectedClip}
            title="Split Clip (S)"
            className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-dark-700 rounded-lg transition"
          >
            <Scissors className="w-4 h-4" />
          </button>
          <button
            onClick={duplicateSelectedClip}
            title="Duplicate Clip (Ctrl+D)"
            className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-dark-700 rounded-lg transition"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={deleteSelectedClip}
            title="Delete Clip (Delete)"
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dark-700 bg-dark-900/20 p-1">
        {[
          ...(selectedClip.type === 'text'
            ? [{ id: 'text', label: 'Custom Text', icon: <Type className="w-3.5 h-3.5" /> }]
            : []),
          { id: 'transform', label: 'Basic', icon: <Maximize className="w-3.5 h-3.5" /> },
          { id: 'filters', label: 'Effects & FX', icon: <Sun className="w-3.5 h-3.5" /> },
          { id: 'audio', label: 'Audio', icon: <Volume2 className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-1 py-2 text-[11px] font-medium rounded-md transition ${
              activeTab === tab.id
                ? 'bg-dark-700 text-cyan-400 font-semibold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Properties Controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* TEXT TAB */}
        {activeTab === 'text' && text && (
          <div className="space-y-4">
            <div className="p-3 bg-dark-900/80 border border-cyan-500/40 rounded-xl space-y-1.5">
              <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider">
                Edit Preferred Text
              </label>
              <textarea
                rows={3}
                value={text.content}
                onChange={(e) => {
                  updateClipText(selectedClip.id, { content: e.target.value });
                  updateClip(selectedClip.id, { name: e.target.value });
                }}
                className="w-full bg-dark-800 border border-dark-600 focus:border-cyan-500 rounded-lg p-2 text-xs text-gray-100 outline-none resize-none"
              />
            </div>

            {/* Font Family Selector */}
            <div>
              <label className="block text-gray-400 mb-1 font-bold">Font Style & Family</label>
              <select
                value={text.fontFamily}
                onChange={(e) => updateClipText(selectedClip.id, { fontFamily: e.target.value })}
                className="w-full bg-dark-900 border border-dark-600 focus:border-cyan-500 rounded-lg p-2 text-xs text-cyan-300 font-semibold outline-none cursor-pointer"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between text-gray-400 mb-1 font-medium">
                <span>Font Size</span>
                <span className="text-cyan-400">{text.fontSize}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="120"
                value={text.fontSize}
                onChange={(e) => updateClipText(selectedClip.id, { fontSize: parseInt(e.target.value) })}
                className="w-full accent-cyan-400 bg-dark-900 rounded-lg cursor-pointer h-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-400 mb-1 font-medium">Text Color</label>
                <input
                  type="color"
                  value={text.color}
                  onChange={(e) => updateClipText(selectedClip.id, { color: e.target.value })}
                  className="w-full h-8 bg-dark-900 border border-dark-600 rounded cursor-pointer p-0.5"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-medium">Background Color</label>
                <input
                  type="color"
                  value={text.backgroundColor === 'transparent' ? '#000000' : text.backgroundColor}
                  onChange={(e) => updateClipText(selectedClip.id, { backgroundColor: e.target.value })}
                  className="w-full h-8 bg-dark-900 border border-dark-600 rounded cursor-pointer p-0.5"
                />
              </div>
            </div>
          </div>
        )}

        {/* TRANSFORM TAB */}
        {activeTab === 'transform' && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-gray-400 mb-1 font-medium">
                <span>Scale</span>
                <span className="text-cyan-400">{Math.round(transform.scale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.05"
                value={transform.scale}
                onChange={(e) => updateClipTransform(selectedClip.id, { scale: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 bg-dark-900 rounded-lg cursor-pointer h-1.5"
              />
            </div>

            <div>
              <div className="flex justify-between text-gray-400 mb-1 font-medium">
                <span>Rotation</span>
                <span className="text-cyan-400">{transform.rotation}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={transform.rotation}
                onChange={(e) => updateClipTransform(selectedClip.id, { rotation: parseInt(e.target.value) })}
                className="w-full accent-cyan-400 bg-dark-900 rounded-lg cursor-pointer h-1.5"
              />
            </div>

            <div>
              <div className="flex justify-between text-gray-400 mb-1 font-medium">
                <span>Opacity</span>
                <span className="text-cyan-400">{Math.round(transform.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={transform.opacity}
                onChange={(e) => updateClipTransform(selectedClip.id, { opacity: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 bg-dark-900 rounded-lg cursor-pointer h-1.5"
              />
            </div>

            <div>
              <div className="flex justify-between text-gray-400 mb-1 font-medium">
                <span>Speed Curve</span>
                <span className="text-cyan-400">{speed}x</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {[0.5, 1.0, 1.5, 2.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => updateClip(selectedClip.id, { speed: s })}
                    className={`py-1 rounded text-[11px] font-semibold border ${
                      speed === s
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-dark-700/50 border-dark-600 text-gray-400 hover:bg-dark-700'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FILTERS & EFFECTS TAB */}
        {activeTab === 'filters' && (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 mb-2 font-bold uppercase tracking-wider text-[10px]">
                1-Click CapCut Effect Presets
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                {PRESET_EFFECTS.map((fx, idx) => (
                  <button
                    key={idx}
                    onClick={() => updateClipFilter(selectedClip.id, fx.filter)}
                    className="p-2 bg-dark-900/80 hover:bg-cyan-500/20 border border-dark-600 hover:border-cyan-500/50 rounded-lg text-left transition group"
                  >
                    <div className="text-[11px] font-medium text-gray-200 group-hover:text-cyan-300 truncate">
                      {fx.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[1px] bg-dark-700 my-2" />

            <div>
              <div className="flex justify-between text-gray-400 mb-1 font-medium">
                <span>Brightness</span>
                <span className="text-cyan-400">{filter.brightness}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={filter.brightness}
                onChange={(e) => updateClipFilter(selectedClip.id, { brightness: parseInt(e.target.value) })}
                className="w-full accent-cyan-400 bg-dark-900 rounded-lg cursor-pointer h-1.5"
              />
            </div>

            <div>
              <div className="flex justify-between text-gray-400 mb-1 font-medium">
                <span>Contrast</span>
                <span className="text-cyan-400">{filter.contrast}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={filter.contrast}
                onChange={(e) => updateClipFilter(selectedClip.id, { contrast: parseInt(e.target.value) })}
                className="w-full accent-cyan-400 bg-dark-900 rounded-lg cursor-pointer h-1.5"
              />
            </div>

            <div>
              <div className="flex justify-between text-gray-400 mb-1 font-medium">
                <span>Saturation</span>
                <span className="text-cyan-400">{filter.saturation}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={filter.saturation}
                onChange={(e) => updateClipFilter(selectedClip.id, { saturation: parseInt(e.target.value) })}
                className="w-full accent-cyan-400 bg-dark-900 rounded-lg cursor-pointer h-1.5"
              />
            </div>

            <div>
              <div className="flex justify-between text-gray-400 mb-1 font-medium">
                <span>Blur</span>
                <span className="text-cyan-400">{filter.blur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={filter.blur}
                onChange={(e) => updateClipFilter(selectedClip.id, { blur: parseInt(e.target.value) })}
                className="w-full accent-cyan-400 bg-dark-900 rounded-lg cursor-pointer h-1.5"
              />
            </div>
          </div>
        )}

        {/* AUDIO TAB */}
        {activeTab === 'audio' && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-gray-400 mb-1 font-medium">
                <span>Volume</span>
                <span className="text-cyan-400">{Math.round(audio.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.05"
                value={audio.volume}
                onChange={(e) => updateClipAudio(selectedClip.id, { volume: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 bg-dark-900 rounded-lg cursor-pointer h-1.5"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
