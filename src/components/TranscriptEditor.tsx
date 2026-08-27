import React, { useState } from 'react';
import { FileText, Download, X, Play, Scissors, Layers, Trash2 } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { exportClipsToVTT } from '../utils/vttExporter';
import { exportClipsToSRT } from '../utils/srtExporter';

interface TranscriptEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TranscriptEditor: React.FC<TranscriptEditorProps> = ({ isOpen, onClose }) => {
  const { tracks, updateClipText, updateClipCaption, setCurrentTime, deleteSelectedClip, setSelectedClipId } = useTimelineStore();

  if (!isOpen) return null;

  const captionClips = tracks
    .flatMap((t) => t.clips)
    .filter((c) => c.type === 'caption' || c.type === 'text')
    .sort((a, b) => a.startTime - b.startTime);

  const handleExportVTT = () => {
    const allClips = tracks.flatMap((t) => t.clips);
    const vttData = exportClipsToVTT(allClips);
    const blob = new Blob([vttData], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ak_cut_subtitles.vtt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSRT = () => {
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
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-dark-800 border border-dark-600 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 relative flex flex-col max-h-[85vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center space-x-2 text-cyan-400">
          <FileText className="w-5 h-5" />
          <h3 className="text-base font-bold text-white">Interactive Transcript Editor</h3>
        </div>

        {/* Caption Segments List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 p-1 border border-dark-700 rounded-xl bg-dark-900/40 p-3">
          {captionClips.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8">
              No captions on timeline. Click "Generate Captions" or add text clips.
            </p>
          ) : (
            captionClips.map((clip) => {
              const textContent = clip.caption?.text || clip.text?.content || '';

              return (
                <div
                  key={clip.id}
                  className="p-3 bg-dark-800 border border-dark-700 hover:border-cyan-500/50 rounded-xl flex items-start justify-between space-x-3 group transition"
                >
                  <button
                    onClick={() => {
                      setCurrentTime(clip.startTime);
                      setSelectedClipId(clip.id);
                    }}
                    className="flex items-center space-x-1.5 px-2 py-1 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 rounded text-[11px] font-mono shrink-0 mt-0.5"
                    title="Click to seek timeline playhead"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{clip.startTime.toFixed(1)}s</span>
                  </button>

                  <input
                    type="text"
                    value={textContent}
                    onChange={(e) => {
                      if (clip.type === 'caption') {
                        updateClipCaption(clip.id, { text: e.target.value });
                      } else {
                        updateClipText(clip.id, { content: e.target.value });
                      }
                    }}
                    className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-cyan-500"
                  />

                  <button
                    onClick={() => {
                      setSelectedClipId(clip.id);
                      deleteSelectedClip();
                    }}
                    className="p-1 text-gray-500 hover:text-red-400 rounded transition opacity-0 group-hover:opacity-100"
                    title="Delete segment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Export Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-dark-700">
          <span className="text-xs text-gray-400">Total Captions: {captionClips.length}</span>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportSRT}
              className="px-3.5 py-2 bg-dark-700 hover:bg-dark-600 text-gray-200 text-xs font-semibold rounded-xl border border-dark-600 transition flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export .SRT</span>
            </button>

            <button
              onClick={handleExportVTT}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .VTT</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
