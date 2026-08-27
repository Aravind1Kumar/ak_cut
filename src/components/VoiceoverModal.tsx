import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { MediaAsset } from '../types/timeline';

interface VoiceoverModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceoverModal: React.FC<VoiceoverModalProps> = ({ isOpen, onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const { currentTime, addMediaAsset, addClipToTrack, addTrack, tracks, saveProjectToDB, pushHistory } = useTimelineStore();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!isOpen) return null;

  const startRecording = async () => {
    setErrorMsg(null);
    setRecordedBlob(null);
    setRecordTime(0);
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Microphone recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setRecordTime((prev) => prev + 0.1);
      }, 100);
    } catch (err: any) {
      console.error('Microphone Permission / Recording Error:', err);
      setErrorMsg(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Microphone permission denied. Please enable microphone access in your browser settings.'
          : `Voiceover Recording Error: ${err.message || 'Failed to initialize microphone.'}`
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleUseRecording = async () => {
    if (!recordedBlob) return;

    try {
      const reader = new FileReader();
      reader.readAsDataURL(recordedBlob);

      reader.onloadend = async () => {
        const dataUrl = reader.result as string;

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuf = await recordedBlob.arrayBuffer();
        const decodedBuf = await audioCtx.decodeAudioData(arrayBuf);
        const duration = decodedBuf.duration || recordTime;

        const assetId = `asset-vo-${Date.now()}`;
        const newAsset: MediaAsset = {
          id: assetId,
          name: `Voiceover ${new Date().toLocaleTimeString()}`,
          type: 'audio',
          src: dataUrl,
          duration,
          size: recordedBlob.size,
          createdAt: Date.now(),
        };

        pushHistory();
        addMediaAsset(newAsset);

        let audioTrack = tracks.find((t) => t.type === 'audio');
        let audioTrackId = audioTrack?.id || addTrack('audio', 'Voiceover Track');

        addClipToTrack(audioTrackId, {
          name: newAsset.name,
          type: 'audio',
          assetId,
          src: dataUrl,
          startTime: currentTime,
          duration,
          mediaOffset: 0,
          sourceDuration: duration,
        });

        saveProjectToDB();
        onClose();
      };
    } catch (err: any) {
      console.error('Failed to process voiceover audio:', err);
      setErrorMsg(`Failed to process recorded audio: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-100">Voiceover Microphone Recorder</h3>
            <p className="text-xs text-gray-400">Record voiceover directly onto audio timeline at playhead ({currentTime.toFixed(2)}s)</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="py-6 flex flex-col items-center justify-center space-y-4 bg-dark-950/60 rounded-xl border border-dark-800">
          <div className="font-mono text-3xl font-bold text-cyan-400">
            {recordTime.toFixed(1)}s
          </div>

          {!isRecording && !recordedBlob && (
            <button
              onClick={startRecording}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-full flex items-center space-x-2 shadow-lg transition transform active:scale-95"
            >
              <Mic className="w-5 h-5" />
              <span>Start Recording</span>
            </button>
          )}

          {isRecording && (
            <button
              onClick={stopRecording}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-red-400 border border-red-500/40 font-bold text-sm rounded-full flex items-center space-x-2 shadow-lg transition transform active:scale-95"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>Stop Recording</span>
            </button>
          )}

          {recordedBlob && !isRecording && (
            <div className="flex items-center space-x-3">
              <button
                onClick={startRecording}
                className="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-gray-300 font-semibold text-xs rounded-xl border border-dark-700 transition"
              >
                Re-record
              </button>
              <button
                onClick={handleUseRecording}
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-md transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Add to Timeline</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
