import React, { useState } from 'react';
import { X, Download, CheckCircle2, Loader2, Video, AlertTriangle } from 'lucide-react';
import { exportVideoProject } from '../utils/videoExporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const [resolution, setResolution] = useState<'1080p' | '720p'>('1080p');
  const [fps, setFps] = useState<30 | 60>(30);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Rendering video project...');
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setIsComplete(false);
    setErrorMessage(null);
    setDownloadUrl(null);

    try {
      // Execute Real FFmpeg WASM Exporter Pipeline
      const mp4Blob = await exportVideoProject(
        { resolution, fps, quality: 'high' },
        (statusText, percentage) => {
          setStatusMsg(statusText);
          setProgress(percentage);
        }
      );

      const url = URL.createObjectURL(mp4Blob);
      setDownloadUrl(url);
      setIsExporting(false);
      setIsComplete(true);

      // Trigger instant browser download of real MP4 file
      const a = document.createElement('a');
      a.href = url;
      a.download = `AK_Cut_Project_${resolution}_${Date.now()}.mp4`;
      a.click();
    } catch (err: any) {
      setIsExporting(false);
      setErrorMessage(err.message || 'FFmpeg WASM Video Export failed. Please check browser WASM/SharedArrayBuffer permissions.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
          disabled={isExporting}
          className="absolute top-4 right-4 text-gray-400 hover:text-white disabled:opacity-30 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-100">Export MP4 Video</h3>
            <p className="text-xs text-gray-400">Offline WASM H.264 Video Encoder</p>
          </div>
        </div>

        {!isExporting && !isComplete && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-2">Resolution</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: '1080p', label: '1080p Full HD (1920x1080)' },
                  { id: '720p', label: '720p HD (1280x720)' },
                ].map((res) => (
                  <button
                    key={res.id}
                    onClick={() => setResolution(res.id as '1080p' | '720p')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition text-center border ${
                      resolution === res.id
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-dark-800 text-gray-400 border-dark-700 hover:text-white'
                    }`}
                  >
                    {res.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-2">Frame Rate (FPS)</label>
              <div className="grid grid-cols-2 gap-2">
                {[30, 60].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFps(f as 30 | 60)}
                    className={`py-2 rounded-xl text-xs font-bold transition border ${
                      fps === f
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-dark-800 text-gray-400 border-dark-700 hover:text-white'
                    }`}
                  >
                    {f} FPS
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              onClick={handleStartExport}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2 mt-2"
            >
              <Download className="w-4 h-4" />
              <span>START EXPORT MP4</span>
            </button>
          </div>
        )}

        {isExporting && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
            <div className="w-full space-y-2 text-center">
              <span className="text-xs font-bold text-gray-200 block">{statusMsg}</span>
              <div className="w-full bg-dark-800 rounded-full h-2 overflow-hidden border border-dark-700">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-cyan-400 font-bold">{Math.round(progress)}% Complete</span>
            </div>
          </div>
        )}

        {isComplete && (
          <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 animate-bounce" />
            <div>
              <h4 className="text-sm font-bold text-white">Video Export Complete!</h4>
              <p className="text-xs text-gray-400 mt-0.5">Your MP4 video file has been saved to your downloads.</p>
            </div>

            {downloadUrl && (
              <a
                href={downloadUrl}
                download={`AK_Cut_Export_${Date.now()}.mp4`}
                className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-extrabold text-xs rounded-xl transition inline-flex items-center space-x-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Re-Download MP4 File</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="w-full py-2 bg-dark-800 hover:bg-dark-700 text-gray-300 text-xs font-bold rounded-xl transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
