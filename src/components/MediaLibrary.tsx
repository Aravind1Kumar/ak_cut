import React, { useState } from 'react';
import {
  Upload,
  Plus,
  Trash2,
  Video,
  Music,
  Image as ImageIcon,
  Play,
  FileText,
  Wand2,
  FolderOpen,
  Search,
  Sparkles,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { saveMediaAssetBlob, deleteMediaAssetBlob } from '../utils/projectPersistence';
import { MediaType, MediaAsset } from '../types/timeline';

export const MediaLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'video' | 'audio' | 'image'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isHoveringDropzone, setIsHoveringDropzone] = useState(false);

  const {
    mediaAssets,
    addMediaAsset,
    deleteMediaAsset,
    addClipToTrack,
    addTrack,
    tracks,
    setSelectedClipId,
    addTextClipDirectlyOnCanvas,
  } = useTimelineStore();

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      const isImage = file.type.startsWith('image/');
      const type: MediaType = isVideo ? 'video' : isAudio ? 'audio' : isImage ? 'image' : 'video';

      const createAssetAndClip = (realDuration: number) => {
        const assetId = addMediaAsset(
          {
            name: file.name,
            type,
            src: url,
            duration: Math.max(1, Math.round(realDuration)),
            size: file.size,
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
          mediaOffset: 0,
        });

        setSelectedClipId(clipId);
      };

      if (isVideo) {
        const tempVid = document.createElement('video');
        tempVid.src = url;
        tempVid.onloadedmetadata = () => createAssetAndClip(tempVid.duration || 10);
        tempVid.onerror = () => createAssetAndClip(10);
      } else if (isAudio) {
        const tempAud = new Audio();
        tempAud.src = url;
        tempAud.onloadedmetadata = () => createAssetAndClip(tempAud.duration || 10);
        tempAud.onerror = () => createAssetAndClip(10);
      } else {
        createAssetAndClip(5);
      }
    }
  };

  const filteredAssets = mediaAssets.filter((asset) => {
    const matchesTab = activeTab === 'all' || asset.type === activeTab;
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <aside className="w-80 bg-dark-900 border-r border-dark-700 flex flex-col h-full select-none z-20 overflow-hidden">
      {/* Search & Header */}
      <div className="p-3 border-b border-dark-700 space-y-2 bg-dark-900/80">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search media..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-500"
          />
        </div>

        {/* Tab Filters */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-dark-950 rounded-xl border border-dark-800">
          {(['all', 'video', 'audio', 'image'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-1 text-[10px] font-bold uppercase rounded-lg transition ${
                activeTab === tab ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Media Dropzone & Upload Button */}
      <div className="p-3">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setIsHoveringDropzone(true);
          }}
          onDragLeave={() => setIsHoveringDropzone(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsHoveringDropzone(false);
            handleFileUpload(e.dataTransfer.files);
          }}
          className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition ${
            isHoveringDropzone
              ? 'border-cyan-400 bg-cyan-500/10'
              : 'border-dark-700 hover:border-cyan-500/50 bg-dark-800/40 hover:bg-dark-800/80'
          }`}
        >
          <Upload className="w-6 h-6 text-cyan-400 mb-1 animate-bounce" />
          <span className="text-xs font-bold text-gray-200">Import Media Files</span>
          <span className="text-[10px] text-gray-500 mt-0.5">Drag & drop video, audio, or images</span>
          <input
            type="file"
            multiple
            accept="video/*,audio/*,image/*"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
        </label>
      </div>

      {/* Media Items Grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredAssets.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500 space-y-1">
            <FolderOpen className="w-8 h-8 mx-auto text-gray-600 mb-1" />
            <p>No media files found</p>
            <p className="text-[10px] text-gray-600">Import media to start editing on timeline</p>
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="p-2 bg-dark-800 border border-dark-700 hover:border-cyan-500/50 rounded-xl flex items-center justify-between group transition"
            >
              <div className="flex items-center space-x-2.5 truncate">
                <div className="w-8 h-8 rounded-lg bg-dark-900 border border-dark-700 flex items-center justify-center text-cyan-400 shrink-0">
                  {asset.type === 'video' ? (
                    <Video className="w-4 h-4" />
                  ) : asset.type === 'audio' ? (
                    <Music className="w-4 h-4" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                </div>
                <div className="truncate">
                  <h4 className="text-xs font-semibold text-gray-200 truncate">{asset.name}</h4>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {asset.duration}s • {(asset.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    let targetTrack = tracks.find((t) => t.type === asset.type);
                    let targetTrackId = targetTrack?.id || addTrack(asset.type);
                    const clipId = addClipToTrack(targetTrackId, {
                      name: asset.name,
                      type: asset.type,
                      assetId: asset.id,
                      src: asset.src,
                      duration: asset.duration,
                      sourceDuration: asset.duration,
                      mediaOffset: 0,
                    });
                    setSelectedClipId(clipId);
                  }}
                  className="p-1 text-cyan-400 hover:bg-cyan-500/20 rounded transition"
                  title="Add to timeline"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <button
                  onClick={() => deleteMediaAsset(asset.id)}
                  className="p-1 text-gray-500 hover:text-red-400 rounded transition opacity-0 group-hover:opacity-100"
                  title="Delete media asset"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Add Text Action */}
      <div className="p-3 border-t border-dark-700 bg-dark-900/90">
        <button
          onClick={() => addTextClipDirectlyOnCanvas('Type Text Here')}
          className="w-full py-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-gray-200 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
        >
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span>+ Add Text Clip</span>
        </button>
      </div>
    </aside>
  );
};
