import React from 'react';
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
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { exportClipsToSRT } from '../utils/srtExporter';

const TEXT_PRESETS = [
  { name: '🔥 Bold Headline', content: 'CATCHY HEADLINE TITLE', color: '#00f2fe', bg: 'rgba(0,0,0,0.8)', size: 48 },
  { name: '📺 Breaking News', content: 'BREAKING NEWS: AK CUT EXCLUSIVE', color: '#ff3366', bg: 'rgba(0,0,0,0.9)', size: 40 },
  { name: '🏷️ Lower Third (Name/Role)', content: 'ARAVIND KUMAR\nLead Developer', color: '#ffffff', bg: 'rgba(10,10,20,0.85)', size: 36 },
  { name: '📍 Location Tag', content: '📍 NEW YORK CITY', color: '#ffcc00', bg: 'rgba(0,0,0,0.7)', size: 32 },
  { name: '💬 Quote Callout', content: '"Editing videos is now faster than ever."', color: '#00ffcc', bg: 'transparent', size: 34 },
];

const CAPTION_STYLE_PRESETS = [
  { id: 'bold', name: '⚡ Bold Yellow' },
  { id: 'social', name: '📱 Social Cyan' },
  { id: 'impact', name: '💥 Impact White' },
  { id: 'classic', name: '🎬 Classic Black' },
  { id: 'karaoke', name: '🎤 Karaoke Highlight' },
];

export const Inspector: React.FC = () => {
  const {
    tracks,
    selectedClipId,
    updateClipTransform,
    updateClipFilter,
    updateClipAudio,
    updateClipText,
    updateClipCaption,
    updateClipSpeedCurve,
    addKeyframeToClip,
    removeKeyframeFromClip,
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
        <h3 className="text-sm font-semibold text-gray-300">No Clip Selected</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
          Click any video, image, text, or caption clip on the timeline to edit properties.
        </p>
      </aside>
    );
  }

  const handleSRTExport = () => {
    const allClips = tracks.flatMap((t) => t.clips);
    const srtData = exportClipsToSRT(allClips);
    const blob = new Blob([srtData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ak_cut_subtitles.srt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="w-80 bg-dark-800 border-l border-dark-700 flex flex-col h-full select-none z-20 overflow-y-auto p-4 space-y-5">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-700">
        <div>
          <h3 className="text-sm font-bold text-gray-100 truncate">{selectedClip.name}</h3>
          <span className="text-[10px] text-cyan-400 font-mono uppercase">{selectedClip.type} Clip</span>
        </div>

        <button
          onClick={() => addKeyframeToClip(selectedClip.id)}
          className="flex items-center space-x-1 px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-semibold transition"
          title="Add Keyframe at current playhead position"
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Keyframe</span>
        </button>
      </div>

      {/* TEXT / LOWER THIRD PRESETS */}
      {selectedClip.type === 'text' && selectedClip.text && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Text & Lower-Third Presets</h4>
          <div className="grid grid-cols-1 gap-2">
            {TEXT_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() =>
                  updateClipText(selectedClip!.id, {
                    content: preset.content,
                    color: preset.color,
                    backgroundColor: preset.bg,
                    fontSize: preset.size,
                  })
                }
                className="p-2.5 bg-dark-700/40 hover:bg-dark-700 border border-dark-600 rounded-xl text-left transition"
              >
                <div className="text-xs font-semibold text-gray-200">{preset.name}</div>
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            <label className="block text-xs font-semibold text-gray-300">Edit Text Content</label>
            <textarea
              rows={2}
              value={selectedClip.text.content}
              onChange={(e) => updateClipText(selectedClip!.id, { content: e.target.value })}
              className="w-full bg-dark-900 border border-dark-600 rounded-lg p-2 text-xs text-white outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      )}

      {/* CAPTION STYLES & SRT EXPORT */}
      {selectedClip.type === 'caption' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Caption Preset Styles</h4>
            <button
              onClick={handleSRTExport}
              className="flex items-center space-x-1 px-2 py-1 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded text-[10px] font-bold border border-purple-500/40 transition"
              title="Download timeline captions as .SRT file"
            >
              <Download className="w-3 h-3" />
              <span>Export .SRT</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {CAPTION_STYLE_PRESETS.map((st) => (
              <button
                key={st.id}
                onClick={() => updateClipCaption(selectedClip!.id, { stylePreset: st.id as any })}
                className="p-2.5 bg-dark-700/40 hover:bg-dark-700 border border-dark-600 rounded-xl text-left text-xs font-semibold text-gray-200 transition"
              >
                {st.name}
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            <label className="block text-xs font-semibold text-gray-300">Edit Subtitle Text</label>
            <input
              type="text"
              value={selectedClip.caption?.text || ''}
              onChange={(e) => updateClipCaption(selectedClip!.id, { text: e.target.value })}
              className="w-full bg-dark-900 border border-dark-600 rounded-lg p-2 text-xs text-white outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      )}

      {/* TRANSFORM CONTROLS */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Transform</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-400">Scale ({selectedClip.transform.scale.toFixed(2)}x)</label>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.05"
              value={selectedClip.transform.scale}
              onChange={(e) => updateClipTransform(selectedClip!.id, { scale: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 bg-dark-900 rounded-lg h-1.5 cursor-pointer mt-1"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-gray-400">Rotation ({selectedClip.transform.rotation}°)</label>
            <input
              type="range"
              min="-180"
              max="180"
              value={selectedClip.transform.rotation}
              onChange={(e) => updateClipTransform(selectedClip!.id, { rotation: parseInt(e.target.value) })}
              className="w-full accent-cyan-400 bg-dark-900 rounded-lg h-1.5 cursor-pointer mt-1"
            />
          </div>
        </div>
      </div>

      {/* AUDIO CONTROLS */}
      {(selectedClip.type === 'video' || selectedClip.type === 'audio') && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Audio Controls</h4>
          <div>
            <label className="text-[10px] font-semibold text-gray-400">Volume ({Math.round(selectedClip.audio.volume * 100)}%)</label>
            <input
              type="range"
              min="0"
              max="2.0"
              step="0.05"
              value={selectedClip.audio.volume}
              onChange={(e) => updateClipAudio(selectedClip!.id, { volume: parseFloat(e.target.value) })}
              className="w-full accent-green-400 bg-dark-900 rounded-lg h-1.5 cursor-pointer mt-1"
            />
          </div>
        </div>
      )}
    </aside>
  );
};
