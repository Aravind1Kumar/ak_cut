import React, { useState } from 'react';
import {
  Sliders,
  Sun,
  Volume2,
  Type,
  Maximize,
  RotateCw,
  Eye,
  Zap,
  Scissors,
  Copy,
  Trash2,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';

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

  // Find currently selected clip
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

  if (!selectedClip) {
    return (
      <aside className="w-72 bg-dark-800 border-l border-dark-700 p-6 flex flex-col items-center justify-center text-center select-none z-20">
        <div className="w-12 h-12 rounded-full bg-dark-700/60 flex items-center justify-center mb-3">
          <Sliders className="w-6 h-6 text-gray-500" />
        </div>
        <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Inspector Panel</h3>
        <p className="text-[11px] text-gray-500 max-w-[180px]">
          Select any clip on the timeline to edit its properties, transforms, filters, and effects.
        </p>
      </aside>
    );
  }

  const { transform, filter, audio, text, speed } = selectedClip;

  return (
    <aside className="w-80 bg-dark-800 border-l border-dark-700 flex flex-col h-full select-none z-20">
      {/* Header & Quick Action Buttons */}
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
          { id: 'transform', label: 'Basic', icon: <Maximize className="w-3.5 h-3.5" /> },
          { id: 'filters', label: 'Filters', icon: <Sun className="w-3.5 h-3.5" /> },
          { id: 'audio', label: 'Audio', icon: <Volume2 className="w-3.5 h-3.5" /> },
          ...(selectedClip.type === 'text'
            ? [{ id: 'text', label: 'Text', icon: <Type className="w-3.5 h-3.5" /> }]
            : []),
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
        {/* TRANSFORM TAB */}
        {activeTab === 'transform' && (
          <div className="space-y-4">
            {/* Scale */}
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

            {/* Rotation */}
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

            {/* Opacity */}
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

            {/* Speed Multiplier */}
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

        {/* FILTERS TAB */}
        {activeTab === 'filters' && (
          <div className="space-y-4">
            {/* Brightness */}
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

            {/* Contrast */}
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

            {/* Saturation */}
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

            {/* Blur */}
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
            {/* Volume */}
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

        {/* TEXT TAB */}
        {activeTab === 'text' && text && (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 mb-1 font-medium">Text Content</label>
              <textarea
                rows={2}
                value={text.content}
                onChange={(e) => updateClipText(selectedClip.id, { content: e.target.value })}
                className="w-full bg-dark-900 border border-dark-600 focus:border-cyan-500 rounded-lg p-2 text-gray-200 outline-none resize-none"
              />
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
                <label className="block text-gray-400 mb-1 font-medium">Background</label>
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
      </div>
    </aside>
  );
};
