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
  FileText,
  Search,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { MediaType, TransitionType, MediaAsset } from '../types/timeline';
import { SourceMonitor } from './SourceMonitor';
import { parseSRT } from '../utils/srtParser';

const PRESET_TRANSITIONS = [
  { name: '🌅 Cross Dissolve / Fade', type: 'fade', duration: 0.8 },
  { name: '🔍 Zoom Blur In', type: 'zoom', duration: 0.6 },
  { name: '↔️ Wipe Left to Right', type: 'wipe', duration: 0.7 },
  { name: '💥 Flash White', type: 'flash', duration: 0.4 },
  { name: '👾 Glitch Shift', type: 'glitch', duration: 0.5 },
  { name: '🌀 Spin Rotate', type: 'spin', duration: 0.6 },
  { name: '⬅️ Slide Left', type: 'slideLeft', duration: 0.5 },
  { name: '➡️ Slide Right', type: 'slideRight', duration: 0.5 },
  { name: '🔮 Blur Dissolve', type: 'blur', duration: 0.7 },
];

const PRESET_EFFECTS = [
  { name: '🎬 Teal & Orange', category: 'Cinematic', filter: { hueRotate: 30, contrast: 125, saturation: 140, brightness: 100, sepia: 0, blur: 0 } },
  { name: '🎥 Vintage 1970s', category: 'Retro', filter: { sepia: 75, brightness: 110, contrast: 105, saturation: 100, hueRotate: 0, blur: 0 } },
  { name: '🖤 Moody B&W', category: 'Monochrome', filter: { saturation: 0, contrast: 130, brightness: 95, sepia: 0, hueRotate: 0, blur: 0 } },
  { name: '🌆 Cyberpunk Neon', category: 'Vibrant', filter: { hueRotate: 190, saturation: 180, contrast: 120, brightness: 100, sepia: 0, blur: 0 } },
  { name: '🌅 Golden Hour', category: 'Warm', filter: { sepia: 30, saturation: 150, brightness: 105, contrast: 100, hueRotate: 0, blur: 0 } },
];

export const MediaLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'media' | 'text' | 'audio' | 'transitions' | 'effects' | 'ai'>('media');
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaCategoryFilter, setMediaCategoryFilter] = useState<'all' | 'video' | 'audio' | 'image'>('all');
  const [customText, setCustomText] = useState('AK CUT TITLE');
  const [selectedSourceAsset, setSelectedSourceAsset] = useState<MediaAsset | null>(null);

  const {
    tracks,
    mediaAssets,
    addMediaAsset,
    deleteMediaAsset,
    addClipToTrack,
    addTrack,
    addTextClipDirectlyOnCanvas,
    setSelectedClipId,
    updateClipTransition,
  } = useTimelineStore();

  // Priority 2: Real Media Metadata Extraction
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

      const createAssetAndClip = (realDuration: number) => {
        const assetId = addMediaAsset(
          {
            name: file.name,
            type,
            src: url,
            duration: Math.max(1, Math.round(realDuration)),
            size: sizeFormatted,
          },
          file
        );

        let targetTrack = tracks.find((t) => t.type === type);
        let targetTrackId = targetTrack?.id || addTrack(type);

        const clipId = addClipToTrack(targetTrackId, {
          name: file.name,
          type,
          assetId,
          src: url,
          duration: Math.max(1, Math.round(realDuration)),
          sourceDuration: Math.max(1, Math.round(realDuration)),
        });

        setSelectedClipId(clipId);
      };

      if (isVideo) {
        const tempVid = document.createElement('video');
        tempVid.src = url;
        tempVid.onloadedmetadata = () => {
          createAssetAndClip(tempVid.duration || 10);
        };
        tempVid.onerror = () => createAssetAndClip(10);
      } else if (isAudio) {
        const tempAud = document.createElement('audio');
        tempAud.src = url;
        tempAud.onloadedmetadata = () => {
          createAssetAndClip(tempAud.duration || 15);
        };
        tempAud.onerror = () => createAssetAndClip(15);
      } else {
        createAssetAndClip(5); // Default 5s for images
      }
    });

    e.target.value = '';
  };

  const filteredAssets = mediaAssets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = mediaCategoryFilter === 'all' || asset.type === mediaCategoryFilter;
    return matchesSearch && matchesCategory;
  });

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
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              if (tab.id === 'text') {
                // Priority 1: Direct Canvas Text Creation on tab click!
                addTextClipDirectlyOnCanvas('Type here');
              }
            }}
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
        {selectedSourceAsset && (
          <SourceMonitor asset={selectedSourceAsset} onClose={() => setSelectedSourceAsset(null)} />
        )}

        {/* MEDIA TAB */}
        {activeTab === 'media' && (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-dark-600 hover:border-cyan-500/60 rounded-xl p-5 cursor-pointer bg-dark-900/30 hover:bg-dark-900/60 transition group">
              <FolderOpen className="w-7 h-7 text-cyan-400 mb-1.5 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-gray-200">Import Media Files</span>
              <span className="text-[10px] text-gray-500 mt-0.5">MP4, MOV, MP3, WAV, PNG, JPG</span>
              <input
                type="file"
                multiple
                accept="video/*,audio/*,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Media Search & Category Filtering */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search media..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center space-x-1 bg-dark-900/60 p-1 rounded-lg text-[10px] font-semibold">
                {['all', 'video', 'audio', 'image'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setMediaCategoryFilter(cat as any)}
                    className={`flex-1 py-1 capitalize rounded transition ${
                      mediaCategoryFilter === cat
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Asset List */}
            <div className="space-y-2">
              {filteredAssets.length === 0 ? (
                <p className="text-[11px] text-gray-500 text-center py-4">No media imported.</p>
              ) : (
                filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-2.5 bg-dark-700/40 hover:bg-dark-700 border border-dark-600 rounded-xl transition group"
                  >
                    <div
                      onClick={() => setSelectedSourceAsset(asset)}
                      className="flex items-center space-x-2.5 truncate max-w-[150px] cursor-pointer"
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
                        onClick={() => {
                          let targetTrack = tracks.find((t) => t.type === asset.type);
                          let targetTrackId = targetTrack?.id || addTrack(asset.type);
                          addClipToTrack(targetTrackId, {
                            name: asset.name,
                            type: asset.type,
                            assetId: asset.id,
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
                        title="Delete asset from IndexedDB"
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-dark-600 rounded-md transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TEXT TAB — Priority 1 Direct Canvas Text Trigger */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <button
              onClick={() => addTextClipDirectlyOnCanvas('Type here')}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Text Directly on Canvas</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
