import React, { useState } from 'react';
import {
  Music,
  Mic,
  Type,
  FileText,
  Shapes,
  Sparkles,
  Wand2,
  Layers,
  Plus,
  Play,
  Volume2,
  Film,
  Sparkle,
  Zap,
  Sliders,
  CheckCircle,
  Eye,
  Grid,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { CreatorNavTab } from './CreatorNavRail';
import { TransitionType, MaskType } from '../types/timeline';
import { SPEED_CURVE_PRESETS } from '../utils/speedEngine';

interface CreatorToolPanelsProps {
  activeTab: CreatorNavTab;
  onOpenCaptionsModal: () => void;
  onOpenTranscriptEditor: () => void;
  onOpenVoiceoverModal: () => void;
  onOpenStickersModal: () => void;
  onOpenPresetsModal: () => void;
}

const SAMPLE_MUSIC_TRACKS = [
  { name: 'Upbeat Vlog Theme', category: 'Creator', duration: '2:15' },
  { name: 'Cinematic Ambient Beat', category: 'Cinematic', duration: '3:40' },
  { name: 'Chill Lofi Hip Hop', category: 'Relaxed', duration: '2:45' },
  { name: 'High Energy Electronic', category: 'Action', duration: '1:55' },
];

const SAMPLE_SFX_TRACKS = [
  { name: 'Whoosh Transition', category: 'Impact' },
  { name: 'Mouse Click Snap', category: 'UI' },
  { name: 'Camera Shutter Flash', category: 'Photo' },
  { name: 'Pop Notification', category: 'Social' },
];

const TRANSITION_PRESETS: { type: TransitionType; name: string; icon: string }[] = [
  { type: 'fade', name: 'Cross Fade', icon: '🌫️' },
  { type: 'dissolve', name: 'Dissolve', icon: '✨' },
  { type: 'wipe', name: 'Directional Wipe', icon: '🧹' },
  { type: 'slideLeft', name: 'Slide Left', icon: '⬅️' },
  { type: 'slideRight', name: 'Slide Right', icon: '➡️' },
  { type: 'zoom', name: 'Zoom In/Out', icon: '🔍' },
  { type: 'flash', name: 'White Flash', icon: '⚡' },
  { type: 'glitch', name: 'Digital Glitch', icon: '👾' },
  { type: 'spin', name: '360 Spin', icon: '🔄' },
  { type: 'blur', name: 'Motion Blur', icon: '💧' },
];

export const CreatorToolPanels: React.FC<CreatorToolPanelsProps> = ({
  activeTab,
  onOpenCaptionsModal,
  onOpenTranscriptEditor,
  onOpenVoiceoverModal,
  onOpenStickersModal,
  onOpenPresetsModal,
}) => {
  const {
    addTextClipDirectlyOnCanvas,
    selectedClipId,
    tracks,
    updateClip,
    updateClipFilter,
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

  const handleApplyTransition = (type: TransitionType) => {
    if (!selectedClip) return;
    pushHistory();
    updateClip(selectedClip.id, {
      transition: { type, duration: 1.0 },
    });
  };

  const handleApplyMask = (maskType: MaskType) => {
    if (!selectedClip) return;
    pushHistory();
    updateClip(selectedClip.id, {
      mask: {
        type: maskType,
        x: 0,
        y: 0,
        width: 60,
        height: 60,
        rotation: 0,
        feather: 10,
      },
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-dark-900 overflow-y-auto select-none p-3 space-y-4">
      {/* AUDIO TOOL PANEL */}
      {activeTab === 'audio' && (
        <div className="space-y-4">
          <div className="border-b border-dark-800 pb-2">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Music className="w-4 h-4 text-green-400" />
              <span>AUDIO & SOUND ENGINE</span>
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Background music, sound effects, & voiceover recording</p>
          </div>

          {/* Voiceover Recorder Card */}
          <button
            onClick={onOpenVoiceoverModal}
            className="w-full p-3 bg-gradient-to-r from-red-950/40 to-dark-800 border border-red-500/30 hover:border-red-400 rounded-2xl text-left transition transform hover:scale-[1.01] shadow-lg flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-white">Record Voiceover</h4>
                <p className="text-[10px] text-gray-400">Live microphone recording directly to timeline</p>
              </div>
            </div>
            <span className="text-[10px] bg-red-500 text-black font-extrabold px-2 py-1 rounded-lg uppercase">
              Record
            </span>
          </button>

          {/* Music Catalog */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">CREATOR MUSIC TRACKS</span>
            <div className="space-y-1.5">
              {SAMPLE_MUSIC_TRACKS.map((tr) => (
                <div key={tr.name} className="p-2.5 bg-dark-950 border border-dark-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <Music className="w-4 h-4 text-green-400 shrink-0" />
                    <div className="truncate">
                      <h5 className="text-xs font-bold text-gray-200 truncate">{tr.name}</h5>
                      <span className="text-[9px] text-gray-500">{tr.category} • {tr.duration}</span>
                    </div>
                  </div>
                  <button className="px-2 py-1 bg-dark-800 hover:bg-green-500/20 hover:text-green-300 text-gray-300 text-[10px] font-bold rounded-lg transition border border-dark-700">
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TEXT TOOL PANEL */}
      {activeTab === 'text' && (
        <div className="space-y-4">
          <div className="border-b border-dark-800 pb-2">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Type className="w-4 h-4 text-cyan-400" />
              <span>TEXT & SUBTITLES</span>
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Add text layers, style presets, & auto-captions</p>
          </div>

          <button
            onClick={() => addTextClipDirectlyOnCanvas()}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs rounded-2xl transition shadow-xl flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Add Text Layer</span>
          </button>

          <button
            onClick={onOpenPresetsModal}
            className="w-full p-3 bg-dark-950 border border-cyan-500/30 hover:border-cyan-400 rounded-2xl text-left transition flex items-center space-x-3"
          >
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <div>
              <h4 className="text-xs font-bold text-white">Browse Text Presets</h4>
              <p className="text-[10px] text-gray-400">18 pre-styled creator titles & lower thirds</p>
            </div>
          </button>
        </div>
      )}

      {/* CAPTIONS TOOL PANEL */}
      {activeTab === 'captions' && (
        <div className="space-y-4">
          <div className="border-b border-dark-800 pb-2">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>AUTO-CAPTIONS & STT</span>
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Automatic speech-to-text subtitle generator</p>
          </div>

          <button
            onClick={onOpenCaptionsModal}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-2xl transition shadow-xl flex items-center justify-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>⚡ Generate Auto-Captions</span>
          </button>

          <button
            onClick={onOpenTranscriptEditor}
            className="w-full py-2.5 bg-dark-950 border border-dark-700 hover:border-purple-400 text-gray-200 text-xs font-bold rounded-2xl transition flex items-center justify-center space-x-2"
          >
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Transcript Subtitle Editor</span>
          </button>
        </div>
      )}

      {/* GRAPHICS & STICKERS TOOL PANEL */}
      {activeTab === 'graphics' && (
        <div className="space-y-4">
          <div className="border-b border-dark-800 pb-2">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Shapes className="w-4 h-4 text-amber-400" />
              <span>GRAPHICS & STICKERS</span>
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Vector shapes, animated stickers, & lower thirds</p>
          </div>

          <button
            onClick={onOpenStickersModal}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs rounded-2xl transition shadow-xl flex items-center justify-center space-x-2"
          >
            <Shapes className="w-4 h-4" />
            <span>Browse Stickers & Emojis</span>
          </button>
        </div>
      )}

      {/* EFFECTS & FILTERS PANEL */}
      {activeTab === 'effects' && (
        <div className="space-y-4">
          <div className="border-b border-dark-800 pb-2">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>EFFECTS & COLOR FILTERS</span>
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Cinematic filters, vignettes, & color grading</p>
          </div>

          {selectedClip ? (
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">FILTER PRESETS</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'warm', name: 'Warm Sunset' },
                  { key: 'cool', name: 'Cool Teal' },
                  { key: 'cinematic', name: 'Cinematic 35mm' },
                  { key: 'vintage', name: 'Retro Vintage' },
                  { key: 'blackWhite', name: 'Noir Monochrome' },
                  { key: 'vibrant', name: 'Vibrant Pop' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => {
                      pushHistory();
                      updateClipFilter(selectedClip!.id, { presetKey: f.key, presetIntensity: 80 });
                    }}
                    className="p-2 bg-dark-950 hover:bg-dark-800 border border-dark-700 hover:border-cyan-400 rounded-xl text-left transition"
                  >
                    <span className="text-xs font-bold text-white block truncate">{f.name}</span>
                    <span className="text-[9px] text-cyan-400">Apply Preset</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">Select a video or image clip on the timeline to apply effects.</p>
          )}
        </div>
      )}

      {/* TRANSITIONS PANEL */}
      {activeTab === 'transitions' && (
        <div className="space-y-4">
          <div className="border-b border-dark-800 pb-2">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Wand2 className="w-4 h-4 text-pink-400" />
              <span>VIDEO TRANSITIONS</span>
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Wipes, dissolves, glitches, & motion transitions</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {TRANSITION_PRESETS.map((t) => (
              <button
                key={t.type}
                onClick={() => handleApplyTransition(t.type)}
                className="p-2.5 bg-dark-950 hover:bg-dark-800 border border-dark-700 hover:border-pink-400 rounded-xl text-left transition flex flex-col justify-between h-16"
              >
                <span className="text-base">{t.icon}</span>
                <span className="text-xs font-bold text-white truncate">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MASKS PANEL */}
      {activeTab === 'masks' && (
        <div className="space-y-4">
          <div className="border-b border-dark-800 pb-2">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>CLIPPING MASKS & KEYING</span>
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Geometric masks, chroma key green screen, & cutout</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { type: 'rectangle', name: 'Rectangle Mask', icon: '🔲' },
              { type: 'circle', name: 'Circle Mask', icon: '⚪' },
              { type: 'line', name: 'Split Line', icon: '➖' },
              { type: 'linearGradient', name: 'Linear Feather', icon: '🌓' },
            ].map((m) => (
              <button
                key={m.type}
                onClick={() => handleApplyMask(m.type as MaskType)}
                className="p-2.5 bg-dark-950 hover:bg-dark-800 border border-dark-700 hover:border-blue-400 rounded-xl text-left transition flex flex-col justify-between h-16"
              >
                <span className="text-base">{m.icon}</span>
                <span className="text-xs font-bold text-white truncate">{m.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
