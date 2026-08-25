import React, { useState } from 'react';
import {
  FolderOpen,
  Film,
  Music,
  Type,
  Wand2,
  Plus,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  ArrowRightLeft,
  Upload,
  Eye,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { MediaType, TransitionType, MediaAsset } from '../types/timeline';
import { SourceMonitor } from './SourceMonitor';

const PRESET_TRANSITIONS = [
  { name: '🌅 Cross Dissolve / Fade', type: 'fade', duration: 0.8 },
  { name: '🔍 Zoom Blur In', type: 'zoom', duration: 0.6 },
  { name: '↔️ Wipe Left to Right', type: 'wipe', duration: 0.7 },
  { name: '💥 Flash White', type: 'flash', duration: 0.4 },
  { name: '👾 Glitch Shift', type: 'glitch', duration: 0.5 },
  { name: '🌀 Spin Rotate', type: 'spin', duration: 0.6 },
  { name: '⬆️ Slide Up Push', type: 'slide', duration: 0.5 },
  { name: '🔮 Blur Dissolve', type: 'blur', duration: 0.7 },
];

const PRESET_EFFECTS = [
  { name: '🎬 Teal & Orange', category: 'Cinematic', filter: { hueRotate: 30, contrast: 125, saturation: 140, brightness: 100, sepia: 0, blur: 0 } },
  { name: '🎥 Vintage 1970s', category: 'Retro', filter: { sepia: 75, brightness: 110, contrast: 105, saturation: 100, hueRotate: 0, blur: 0 } },
  { name: '🖤 Moody B&W', category: 'Monochrome', filter: { saturation: 0, contrast: 130, brightness: 95, sepia: 0, hueRotate: 0, blur: 0 } },
  { name: '🌆 Cyberpunk Neon', category: 'Vibrant', filter: { hueRotate: 190, saturation: 180, contrast: 120, brightness: 100, sepia: 0, blur: 0 } },
  { name: '🌅 Golden Hour', category: 'Warm', filter: { sepia: 30, saturation: 150, brightness: 105, contrast: 100, hueRotate: 0, blur: 0 } },
  { name: '❄️ Cold Winter', category: 'Cool', filter: { hueRotate: 160, contrast: 110, saturation: 90, brightness: 100, sepia: 0, blur: 0 } },
  { name: '⚡ High Contrast', category: 'Action', filter: { contrast: 160, brightness: 105, saturation: 130, sepia: 0, hueRotate: 0, blur: 0 } },
  { name: '👾 VHS Retro', category: 'Glitch', filter: { hueRotate: 240, saturation: 200, contrast: 110, brightness: 100, sepia: 0, blur: 0 } },
  { name: '🔮 Dream Blur Glow', category: 'Soft', filter: { blur: 6, brightness: 115, saturation: 110, contrast: 100, sepia: 0, hueRotate: 0 } },
];

export const MediaLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'media' | 'text' | 'audio' | 'transitions' | 'effects' | 'ai'>('media');
  const [customText, setCustomText] = useState('My Custom Preferred Text');
  const [selectedSourceAsset, setSelectedSourceAsset] = useState<MediaAsset | null>(null);

  const {
    tracks,
    mediaAssets,
    addMediaAsset,
    deleteMediaAsset,
    addClipToTrack,
    addTrack,
    setSelectedClipId,
    updateClipTransition,
  } = useTimelineStore();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      const isImage = file.type.startsWith('image/');

      const type: MediaType = isVideo ? 'video' : isAudio ? 'audio' : isImage ? 'image' : 'video';
      const sizeFormatted = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      const assetId = addMediaAsset({
        name: file.name,
        type,
        src: url,
        duration: 10,
        size: sizeFormatted,
      });

      let targetTrack = tracks.find((t) => t.type === type);
      let targetTrackId = targetTrack?.id || addTrack(type);

      const clipId = addClipToTrack(targetTrackId, {
        name: file.name,
        type,
        src: url,
        duration: 10,
        sourceDuration: 10,
      });

      setSelectedClipId(clipId);
    });

    e.target.value = '';
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      const sizeFormatted = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      addMediaAsset({
        name: file.name,
        type: 'audio',
        src: url,
        duration: 15,
        size: sizeFormatted,
      });

      let audioTrack = tracks.find((t) => t.type === 'audio');
      let audioTrackId = audioTrack?.id || addTrack('audio', 'Audio Track');

      const clipId = addClipToTrack(audioTrackId, {
        name: file.name,
        type: 'audio',
        src: url,
        duration: 15,
        sourceDuration: 15,
      });

      setSelectedClipId(clipId);
    });

    e.target.value = '';
  };

  const handleAddCustomText = () => {
    if (!customText.trim()) return;

    let textTrack = tracks.find((t) => t.type === 'text');
    let textTrackId = textTrack?.id || addTrack('text', 'Text Track');

    const clipId = addClipToTrack(textTrackId, {
      name: customText,
      type: 'text',
      duration: 5,
      text: {
        content: customText,
        fontFamily: 'Inter, sans-serif',
        fontSize: 48,
        color: '#00f2fe',
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderColor: '#ffffff',
        borderWidth: 1,
        alignment: 'center',
        bold: true,
        italic: false,
      },
    });

    setSelectedClipId(clipId);
  };

  const audioAssets = mediaAssets.filter((a) => a.type === 'audio');

  return (
    <aside className="w-80 bg-dark-800 border-r border-dark-700 flex flex-col h-full select-none z-20">
      {/* Navigation Tabs */}
      <div className="flex border-b border-dark-700 bg-dark-900/40 p-1 overflow-x-auto">
        {[
          { id: 'media', label: 'Media', icon: <Film className="w-3.5 h-3.5" /> },
          { id: 'text', label: 'Text', icon: <Type className="w-3.5 h-3.5" /> },
          { id: 'transitions', label: 'Transitions', icon: <ArrowRightLeft className="w-3.5 h-3.5" /> },
          { id: 'effects', label: 'Effects', icon: <Wand2 className="w-3.5 h-3.5" /> },
          { id: 'audio', label: 'Audio', icon: <Music className="w-3.5 h-3.5" /> },
          { id: 'ai', label: 'AI', icon: <Sparkles className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 text-[10px] font-medium rounded-md transition ${
              activeTab === tab.id
                ? 'bg-dark-700 text-cyan-400 font-semibold shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-dark-700/50'
            }`}
          >
            {tab.icon}
            <span className="mt-0.5">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Source Monitor Overlay if Active */}
        {selectedSourceAsset && (
          <SourceMonitor asset={selectedSourceAsset} onClose={() => setSelectedSourceAsset(null)} />
        )}

        {/* TRANSITIONS TAB */}
        {activeTab === 'transitions' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Video Transitions</h3>
            <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {PRESET_TRANSITIONS.map((tr, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    const selId = useTimelineStore.getState().selectedClipId;
                    if (selId) {
                      updateClipTransition(selId, { type: tr.type as TransitionType, duration: tr.duration });
                    } else {
                      alert('Please select a clip on the timeline first to apply transition!');
                    }
                  }}
                  className="flex items-center justify-between p-3 bg-dark-700/40 hover:bg-dark-700 border border-dark-600 rounded-xl cursor-pointer transition group"
                >
                  <div>
                    <div className="text-xs font-semibold text-gray-200">{tr.name}</div>
                    <div className="text-[10px] text-cyan-400 font-medium">Duration: {tr.duration}s</div>
                  </div>
                  <Plus className="w-4 h-4 text-cyan-400 group-hover:scale-125 transition-transform" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MEDIA TAB */}
        {activeTab === 'media' && (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-dark-600 hover:border-cyan-500/60 rounded-xl p-6 cursor-pointer bg-dark-900/30 hover:bg-dark-900/60 transition group">
              <FolderOpen className="w-8 h-8 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-gray-200">Import Media Files</span>
              <span className="text-[10px] text-gray-500 mt-1">MP4, MOV, MP3, WAV, PNG, JPG</span>
              <input
                type="file"
                multiple
                accept="video/*,audio/*,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Project Media</h3>
                <span className="text-[10px] text-gray-500">{mediaAssets.length} assets</span>
              </div>

              {mediaAssets.length === 0 ? (
                <p className="text-[11px] text-gray-500 text-center py-4">No media imported yet.</p>
              ) : (
                <div className="space-y-2">
                  {mediaAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-2.5 bg-dark-700/40 hover:bg-dark-700 border border-dark-600 rounded-xl transition group"
                    >
                      <div
                        onClick={() => setSelectedSourceAsset(asset)}
                        className="flex items-center space-x-2.5 truncate max-w-[150px] cursor-pointer"
                        title="Click to open Source Cut Monitor"
                      >
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                          {asset.type === 'video' ? (
                            <Film className="w-4 h-4 text-cyan-400" />
                          ) : asset.type === 'audio' ? (
                            <Music className="w-4 h-4 text-green-400" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-amber-400" />
                          )}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-medium text-gray-200 truncate">{asset.name}</div>
                          <div className="text-[10px] text-gray-500">
                            {asset.type.toUpperCase()} • {asset.duration}s
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setSelectedSourceAsset(asset)}
                          title="Open Source Cut Monitor"
                          className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/30 text-cyan-400 rounded-md transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            let targetTrack = tracks.find((t) => t.type === asset.type);
                            let targetTrackId = targetTrack?.id || addTrack(asset.type);
                            addClipToTrack(targetTrackId, {
                              name: asset.name,
                              type: asset.type,
                              src: asset.src,
                              duration: asset.duration,
                              sourceDuration: asset.duration,
                            });
                          }}
                          title="Add Full Clip to Timeline"
                          className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-white rounded-md transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => deleteMediaAsset(asset.id)}
                          title="Delete file from project"
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-dark-600 rounded-md transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TEXT TAB */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <div className="p-3 bg-dark-900/80 border border-cyan-500/40 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider">
                Add Preferred Custom Text
              </label>
              <textarea
                rows={2}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Type your preferred text here..."
                className="w-full bg-dark-800 border border-dark-600 focus:border-cyan-500 rounded-lg p-2 text-xs text-gray-100 outline-none resize-none"
              />
              <button
                onClick={handleAddCustomText}
                className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-lg shadow flex items-center justify-center space-x-1.5 transition transform active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Custom Text to Timeline</span>
              </button>
            </div>
          </div>
        )}

        {/* EFFECTS TAB */}
        {activeTab === 'effects' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">CapCut Effects</h3>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_EFFECTS.map((fx, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-dark-700/40 hover:bg-dark-700 border border-dark-600 rounded-xl text-left cursor-pointer transition group"
                  onClick={() => {
                    const videoClipId = useTimelineStore.getState().selectedClipId;
                    if (videoClipId) {
                      useTimelineStore.getState().updateClipFilter(videoClipId, fx.filter);
                    } else {
                      alert('Please select a clip on the timeline first to apply effect!');
                    }
                  }}
                >
                  <Wand2 className="w-4 h-4 text-cyan-400 mb-1 group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-semibold text-gray-200 truncate">{fx.name}</div>
                  <div className="text-[9px] text-cyan-400 font-medium mt-0.5">{fx.category}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AUDIO TAB */}
        {activeTab === 'audio' && (
          <div className="space-y-4">
            {/* Custom Audio Upload Box */}
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 rounded-xl p-4 cursor-pointer bg-cyan-900/10 hover:bg-cyan-900/20 transition group">
              <Upload className="w-6 h-6 text-cyan-400 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-cyan-300">Upload Custom Music / Audio</span>
              <span className="text-[10px] text-gray-400 mt-0.5">MP3, WAV, AAC, M4A, OGG</span>
              <input
                type="file"
                multiple
                accept="audio/*,.mp3,.wav,.aac,.m4a,.ogg"
                onChange={handleAudioUpload}
                className="hidden"
              />
            </label>

            {/* Custom Uploaded Audio Files */}
            {audioAssets.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Custom Audio Tracks</h3>
                {audioAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-2.5 bg-dark-700/40 hover:bg-dark-700 border border-dark-600 rounded-lg transition"
                  >
                    <div className="flex items-center space-x-2.5 truncate max-w-[170px]">
                      <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                        <Music className="w-3.5 h-3.5 text-green-400" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-medium text-gray-200 truncate">{asset.name}</div>
                        <div className="text-[10px] text-gray-500">{asset.size}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          let audioTrack = tracks.find((t) => t.type === 'audio');
                          let audioTrackId = audioTrack?.id || addTrack('audio', 'Audio Track');
                          addClipToTrack(audioTrackId, {
                            name: asset.name,
                            type: 'audio',
                            src: asset.src,
                            duration: asset.duration,
                            sourceDuration: asset.duration,
                          });
                        }}
                        className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-white rounded-md transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => deleteMediaAsset(asset.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-dark-600 rounded-md transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stock Music Presets */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Free Stock Music</h3>
              {[
                { title: 'Chill Lo-Fi Beat', genre: 'Lo-Fi', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
                { title: 'Upbeat Cinematic', genre: 'Cinematic', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
                { title: 'Electronic Pulse', genre: 'Synthwave', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
              ].map((track, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-dark-700/40 hover:bg-dark-700 border border-dark-600 rounded-lg transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                      <Music className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-200">{track.title}</div>
                      <div className="text-[10px] text-gray-500">{track.genre}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      let audioTrack = tracks.find((t) => t.type === 'audio');
                      let audioTrackId = audioTrack?.id || addTrack('audio', 'Audio Track');
                      addClipToTrack(audioTrackId, {
                        name: track.title,
                        type: 'audio',
                        src: track.src,
                        duration: 15,
                        sourceDuration: 15,
                      });
                    }}
                    className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-white rounded-md transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI TOOLS TAB */}
        {activeTab === 'ai' && (
          <div className="space-y-3">
            <div className="p-4 bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-xl">
              <div className="flex items-center space-x-2 mb-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">AI Auto-Subtitles</h4>
              </div>
              <p className="text-[11px] text-gray-300 mb-3 leading-relaxed">
                Generate automatic captions frame-by-frame directly in your browser powered by AI speech-to-text.
              </p>
              <button
                onClick={() => {
                  let textTrack = tracks.find((t) => t.type === 'text');
                  let textTrackId = textTrack?.id || addTrack('text', 'Text Track');
                  addClipToTrack(textTrackId, {
                    name: 'AI Auto Caption',
                    type: 'text',
                    duration: 4,
                    text: {
                      content: 'AI Subtitle: Hello and welcome to Ak Cut!',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 34,
                      color: '#ffffff',
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      borderColor: '#000000',
                      borderWidth: 0,
                      alignment: 'center',
                      bold: true,
                      italic: false,
                    },
                  });
                }}
                className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs rounded-lg shadow-md transition"
              >
                Generate Auto Captions
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
