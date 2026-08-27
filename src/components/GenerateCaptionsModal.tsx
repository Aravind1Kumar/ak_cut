import React, { useState } from 'react';
import { Sparkles, X, Wand2, Key, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { STT_PROVIDERS, SpeechToTextProvider } from '../services/sttProvider';
import { extractAudioFromClip } from '../utils/audioExtraction';
import { Clip } from '../types/timeline';

interface GenerateCaptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GenerateCaptionsModal: React.FC<GenerateCaptionsModalProps> = ({ isOpen, onClose }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [selectedProviderId, setSelectedProviderId] = useState('web-speech');
  const [apiKey, setApiKey] = useState('');
  const [selectedStylePreset, setSelectedStylePreset] = useState<'social' | 'bold' | 'impact' | 'classic'>('social');

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { tracks, addClipToTrack, addTrack, setSelectedClipId } = useTimelineStore();

  if (!isOpen) return null;

  // Find candidate video or audio clip for transcription
  let mediaClip: Clip | null = null;
  for (const track of tracks) {
    const c = track.clips.find((clip) => clip.type === 'video' || clip.type === 'audio');
    if (c) {
      mediaClip = c;
      break;
    }
  }

  const handleGenerateCaptions = async () => {
    if (!mediaClip) {
      setErrorMsg('No audio or video clip found on timeline to transcribe.');
      return;
    }

    const provider = STT_PROVIDERS.find((p) => p.id === selectedProviderId) || STT_PROVIDERS[0];
    if (provider.requiresApiKey && !apiKey.trim()) {
      setErrorMsg('API Key is required for Whisper API provider.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // Stage 1: Extract Audio
      setCurrentStage('Extracting Audio from Timeline Clip...');
      const audioBlob = await extractAudioFromClip(mediaClip);

      // Stage 2: Transcribe Speech
      setCurrentStage('Transcribing Speech to Text...');
      const result = await provider.transcribe(audioBlob, selectedLanguage, apiKey);

      // Stage 3: Building Captions & Timestamps
      setCurrentStage('Building Timeline Caption Track & Word Timestamps...');

      let captionTrack = tracks.find((t) => t.type === 'caption');
      let targetTrackId = captionTrack?.id || addTrack('caption', 'Caption Track');

      for (const seg of result.segments) {
        const clipId = addClipToTrack(targetTrackId, {
          name: `Caption: ${seg.text.slice(0, 15)}...`,
          type: 'caption',
          startTime: mediaClip.startTime + seg.startTime,
          duration: Math.max(1, seg.endTime - seg.startTime),
          sourceDuration: Math.max(1, seg.endTime - seg.startTime),
          caption: {
            text: seg.text,
            stylePreset: selectedStylePreset as any,
            words: seg.words?.map((w, idx) => ({
              id: `w_${idx}_${Date.now()}`,
              word: w.text,
              text: w.text,
              startTime: mediaClip!.startTime + w.startTime,
              endTime: mediaClip!.startTime + w.endTime,
            })),
            segment: {
              id: `seg_${Date.now()}`,
              trackId: targetTrackId,
              startTime: mediaClip.startTime + seg.startTime,
              endTime: mediaClip.startTime + seg.endTime,
              text: seg.text,
              words: seg.words?.map((w, idx) => ({
                id: `w_${idx}_${Date.now()}`,
                word: w.text,
                text: w.text,
                startTime: mediaClip!.startTime + w.startTime,
                endTime: mediaClip!.startTime + w.endTime,
              })),
            },
          },
        });
        setSelectedClipId(clipId);
      }

      setCurrentStage('Done!');
      setTimeout(() => {
        setIsProcessing(false);
        onClose();
      }, 600);
    } catch (err: any) {
      console.error('Caption generation error:', err);
      setErrorMsg(err.message || 'Speech recognition failed.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-dark-800 border border-cyan-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg transition disabled:opacity-30"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center space-x-2.5 text-cyan-400">
          <Wand2 className="w-5 h-5" />
          <h3 className="text-base font-bold text-white">Generate Automatic Captions</h3>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl flex items-start space-x-2 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Options */}
        <div className="space-y-3">
          {/* Target Media Clip Info */}
          <div className="bg-dark-900/60 p-3 rounded-xl border border-dark-700 text-xs">
            <span className="text-gray-400">Target Media Source:</span>
            <div className="font-bold text-cyan-300 mt-0.5">
              {mediaClip ? `🎬 ${mediaClip.name} (${mediaClip.duration}s)` : '⚠️ No audio/video clip on timeline'}
            </div>
          </div>

          {/* Language Selector */}
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">Spoken Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
            >
              <option value="auto">🌐 Auto Detect Language</option>
              <option value="en-US">🇬🇧 English (US/UK)</option>
              <option value="te-IN">🇮🇳 Telugu (తెలుగు)</option>
              <option value="hi-IN">🇮🇳 Hindi (हिंदी)</option>
              <option value="ta-IN">🇮🇳 Tamil (தமிழ்)</option>
              <option value="kn-IN">🇮🇳 Kannada (కన్నడ)</option>
              <option value="ml-IN">🇮🇳 Malayalam (మలయాళం)</option>
            </select>
          </div>

          {/* Provider Selector */}
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">Speech Recognition Engine</label>
            <select
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
            >
              {STT_PROVIDERS.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          {/* API Key Input (if provider requires it) */}
          {STT_PROVIDERS.find((p) => p.id === selectedProviderId)?.requiresApiKey && (
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1 flex items-center space-x-1">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>API Key (Client Secure Boundary)</span>
              </label>
              <input
                type="password"
                placeholder="Enter your API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {/* Caption Style Preset */}
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">Caption Style Preset</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'social', name: '📱 Social Cyan' },
                { id: 'bold', name: '⚡ Bold Yellow' },
                { id: 'impact', name: '💥 Impact White' },
                { id: 'classic', name: '🎬 Classic Subtitle' },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStylePreset(style.id as any)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition ${
                    selectedStylePreset === style.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md'
                      : 'bg-dark-900/60 text-gray-400 border-dark-700 hover:text-white'
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Progress Stage Display */}
        {isProcessing && (
          <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl flex items-center space-x-2 text-cyan-300 text-xs font-semibold">
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-cyan-400" />
            <span>{currentStage}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleGenerateCaptions}
          disabled={isProcessing || !mediaClip}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition transform active:scale-95 disabled:opacity-40 flex items-center justify-center space-x-2"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>{isProcessing ? 'Generating Captions...' : 'Generate Automatic Captions'}</span>
        </button>
      </div>
    </div>
  );
};
