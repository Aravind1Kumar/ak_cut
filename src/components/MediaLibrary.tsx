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
  Send,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { MediaType } from '../types/timeline';

export const MediaLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'media' | 'text' | 'audio' | 'effects' | 'ai'>('text');
  const [customText, setCustomText] = useState('My Custom Preferred Text');

  const {
    tracks,
    mediaAssets,
    addMediaAsset,
    deleteMediaAsset,
    addClipToTrack,
    addTrack,
    setSelectedClipId,
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
        duration: 8,
        size: sizeFormatted,
      });

      let targetTrack = tracks.find((t) => t.type === type);
      let targetTrackId = targetTrack?.id || addTrack(type);

      const clipId = addClipToTrack(targetTrackId, {
        name: file.name,
        type,
        src: url,
        duration: 8,
        sourceDuration: 8,
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
        fontFamily: 'sans-serif',
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

  const handleAddTextTemplate = (templateName: string, style: any) => {
    let textTrack = tracks.find((t) => t.type === 'text');
    let textTrackId = textTrack?.id || addTrack('text', 'Text Track');

    const clipId = addClipToTrack(textTrackId, {
      name: templateName,
      type: 'text',
      duration: 4,
      text: {
        content: templateName,
        fontFamily: style.fontFamily || 'sans-serif',
        fontSize: style.fontSize || 44,
        color: style.color || '#ffffff',
        backgroundColor: style.backgroundColor || 'transparent',
        borderColor: style.borderColor || '#000000',
        borderWidth: style.borderWidth || 0,
        alignment: 'center',
        bold: true,
        italic: false,
      },
    });

    setSelectedClipId(clipId);
  };

  const handleAddStockAudio = (title: string, src: string) => {
    let audioTrack = tracks.find((t) => t.type === 'audio');
    let audioTrackId = audioTrack?.id || addTrack('audio', 'Audio Track');

    const clipId = addClipToTrack(audioTrackId, {
      name: title,
      type: 'audio',
      src,
      duration: 15,
      sourceDuration: 15,
    });

    setSelectedClipId(clipId);
  };

  return (
    <aside className="w-80 bg-dark-800 border-r border-dark-700 flex flex-col h-full select-none z-20">
      {/* Left Navigation Bar */}
      <div className="flex border-b border-dark-700 bg-dark-900/40 p-1">
        {[
          { id: 'media', label: 'Media', icon: <Film className="w-4 h-4" /> },
          { id: 'text', label: 'Text', icon: <Type className="w-4 h-4" /> },
          { id: 'audio', label: 'Audio', icon: <Music className="w-4 h-4" /> },
          { id: 'effects', label: 'Effects', icon: <Wand2 className="w-4 h-4" /> },
          { id: 'ai', label: 'AI Tools', icon: <Sparkles className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 text-[11px] font-medium rounded-md transition ${
              activeTab === tab.id
                ? 'bg-dark-700 text-cyan-400 font-semibold shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-dark-700/50'
            }`}
          >
            {tab.icon}
            <span className="mt-1">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TEXT TAB */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            {/* Preferred Custom Text Input Box */}
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

            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Text Presets & Templates</h3>
            <div className="grid grid-cols-1 gap-2">
              {[
                {
                  name: '🔥 Trending Heading',
                  style: { color: '#00f2fe', fontSize: 48, fontFamily: 'sans-serif', borderWidth: 2 },
                },
                {
                  name: '✨ Subtitle Overlay',
                  style: { color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.7)', fontSize: 32 },
                },
                {
                  name: '⚡ Cyberpunk Neon',
                  style: { color: '#ff007f', borderColor: '#00f2fe', borderWidth: 2, fontSize: 52 },
                },
                {
                  name: ' Minimal Title',
                  style: { color: '#e2e8f0', fontSize: 36, fontFamily: 'serif' },
                },
              ].map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAddTextTemplate(template.name.replace(/[^a-zA-Z0-9 ]/g, ''), template.style)}
                  className="flex items-center justify-between p-3 bg-dark-700/40 hover:bg-dark-700 border border-dark-600 rounded-xl transition text-left group"
                >
                  <div>
                    <div className="text-xs font-semibold text-gray-200">{template.name}</div>
                    <div className="text-[10px] text-gray-500">Click to add to timeline</div>
                  </div>
                  <Plus className="w-4 h-4 text-cyan-400 group-hover:scale-125 transition-transform" />
                </button>
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
              <span className="text-[10px] text-gray-500 mt-1">MP4, MOV, MP3, PNG, JPG</span>
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
                      <div className="flex items-center space-x-2.5 truncate max-w-[170px]">
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
                          title="Add to Timeline"
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

        {/* AUDIO TAB */}
        {activeTab === 'audio' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Free Music & SFX</h3>
            <div className="space-y-2">
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
                    onClick={() => handleAddStockAudio(track.title, track.src)}
                    className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-white rounded-md transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EFFECTS TAB */}
        {activeTab === 'effects' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Trending Video Effects</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Vintage Movie', filter: { sepia: 60, contrast: 110 } },
                { name: 'Cyber Neon', filter: { hueRotate: 180, saturation: 160 } },
                { name: 'Black & White', filter: { saturation: 0 } },
                { name: 'Soft Blur Glow', filter: { blur: 4 } },
              ].map((fx, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-dark-700/40 hover:bg-dark-700 border border-dark-600 rounded-xl text-center cursor-pointer transition"
                  onClick={() => {
                    const videoClipId = useTimelineStore.getState().selectedClipId;
                    if (videoClipId) {
                      useTimelineStore.getState().updateClipFilter(videoClipId, fx.filter);
                    } else {
                      alert('Please select a clip on the timeline first to apply filter!');
                    }
                  }}
                >
                  <Wand2 className="w-5 h-5 text-cyan-400 mx-auto mb-1.5" />
                  <div className="text-xs font-medium text-gray-200">{fx.name}</div>
                  <div className="text-[9px] text-cyan-400 mt-1">Apply to selected clip</div>
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
                  handleAddTextTemplate('AI Subtitle: Hello and welcome to Ak Cut!', {
                    color: '#ffffff',
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    fontSize: 34,
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
