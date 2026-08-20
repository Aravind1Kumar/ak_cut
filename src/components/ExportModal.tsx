import React, { useState } from 'react';
import { X, Download, CheckCircle2, Loader2, Video, Sparkles } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const [resolution, setResolution] = useState<'1080p' | '720p' | '4K'>('1080p');
  const [fps, setFps] = useState<30 | 60>(30);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const { tracks, maxTimelineDuration, aspectRatio } = useTimelineStore();

  if (!isOpen) return null;

  const handleStartExport = () => {
    setIsExporting(true);
    setProgress(0);
    setIsComplete(false);

    // Simulate Client-Side FFmpeg / Canvas Encoding Engine progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          setIsComplete(true);
          triggerDownload();
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const triggerDownload = () => {
    // Generate dummy video Blob for instant demo download
    const dummyBlob = new Blob(['Ak Cut Video File Data'], { type: 'video/mp4' });
    const url = URL.createObjectURL(dummyBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ak_Cut_Export_${resolution}_${Date.now()}.mp4`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-dark-800 border border-dark-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-dark-700 flex items-center justify-between bg-dark-900/40">
          <div className="flex items-center space-x-2">
            <Video className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-gray-100">Export Video</h2>
          </div>
          {!isExporting && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-dark-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {!isComplete ? (
            <>
              {/* Resolution Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Export Resolution
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '720p HD', value: '720p' },
                    { label: '1080p FHD', value: '1080p' },
                    { label: '4K Ultra HD', value: '4K' },
                  ].map((res) => (
                    <button
                      key={res.value}
                      disabled={isExporting}
                      onClick={() => setResolution(res.value as any)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition ${
                        resolution === res.value
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm'
                          : 'bg-dark-900/40 border-dark-700 text-gray-400 hover:bg-dark-700'
                      }`}
                    >
                      {res.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Framerate Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Frame Rate (FPS)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[30, 60].map((f) => (
                    <button
                      key={f}
                      disabled={isExporting}
                      onClick={() => setFps(f as any)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                        fps === f
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-dark-900/40 border-dark-700 text-gray-400 hover:bg-dark-700'
                      }`}
                    >
                      {f} FPS
                    </button>
                  ))}
                </div>
              </div>

              {/* Export Progress Bar */}
              {isExporting && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs font-semibold text-gray-300">
                    <span className="flex items-center space-x-1.5">
                      <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                      <span>Encoding frames...</span>
                    </span>
                    <span className="text-cyan-400 font-mono">{progress}%</span>
                  </div>
                  <div className="w-full bg-dark-900 h-2 rounded-full overflow-hidden border border-dark-700">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-gray-100">Export Completed!</h3>
              <p className="text-xs text-gray-400">
                Your video file has been rendered in {resolution} ({fps} FPS) and downloaded automatically.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-dark-700 bg-dark-900/40 flex items-center justify-end space-x-3">
          {!isComplete ? (
            <>
              <button
                disabled={isExporting}
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                disabled={isExporting}
                onClick={handleStartExport}
                className="flex items-center space-x-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl shadow-lg shadow-cyan-500/20 transition transform active:scale-95 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rendering...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Start Export</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-2.5 text-xs font-bold text-white bg-dark-700 hover:bg-dark-600 rounded-xl transition"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
