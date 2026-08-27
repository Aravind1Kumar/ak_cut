import React, { useState } from 'react';
import { X, Download, CheckCircle2, Loader2, Video, AlertTriangle } from 'lucide-react';
import { exportVideoProject } from '../utils/videoExporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const [resolution, setResolution] = useState<'1080p' | '720p' | '4K'>('1080p');
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
      const exportRes = resolution === '4K' ? '1080p' : resolution;
      const mp4Blob = await exportVideoProject(
        { resolution: exportRes, fps, quality: 'high' },
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
            <h3 className="text-base font-bold text-gray-100">Export Video Project</h3>
            <p className="text-xs text-gray-400">FFmpeg WASM Real MP4 Video Encoding</p>
          </div>
        </div>

        {!isExporting && !isComplete && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-2">Resolution</label>
              <div className="grid grid-cols-3 gap-2">
                {(['720p', '1080p', '4K'] as const).map((res) => (
                  <button
                    key={res}
                    onClick={() => setResolution(res)}
                    className={`py-2 rounded-xl text-xs font-bold transition border ${
                      resolution === res
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-dark-800 text-gray-400 border-dark-700 hover:text-white'
                    }`}
                  >
                    {res} {res === '4K' ? '(Downscaled)' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-2">Frame Rate (FPS)</label>
              <div className="grid grid-cols-2 gap-2">
                {([30, 60] as const).map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setFps(rate)}
                    className={`py-2 rounded-xl text-xs font-bold transition border ${
                      fps === rate
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-dark-800 text-gray-400 border-dark-700 hover:text-white'
                    }`}
                  >
                    {rate} FPS
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              onClick={handleStartExport}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Export MP4 Video</span>
            </button>
          </div>
        )}

        {isExporting && (
          <div className="py-6 text-center space-y-4">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
            <div>
              <span className="text-2xl font-bold font-mono text-cyan-300 block">{progress}%</span>
              <span className="text-xs text-gray-400">{statusMsg}</span>
            </div>
            <div className="w-full bg-dark-800 h-2 rounded-full overflow-hidden border border-dark-700">
              <div
                className="bg-cyan-400 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {isComplete && (
          <div className="py-6 text-center space-y-4">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-full w-14 h-14 mx-auto flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-100">Export Complete!</h4>
              <p className="text-xs text-gray-400 mt-1">Your video file has been exported and downloaded.</p>
            </div>
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={`AK_Cut_Project_${resolution}.mp4`}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Again</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
