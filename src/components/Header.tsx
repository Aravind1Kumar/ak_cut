import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Download,
  Undo2,
  Redo2,
  Save,
  Monitor,
  Smartphone,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Edit3,
  Wand2,
  FileText,
  Mic,
  Shapes,
  LayoutTemplate,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { AspectRatio } from '../types/timeline';
import { GenerateCaptionsModal } from './GenerateCaptionsModal';
import { TranscriptEditor } from './TranscriptEditor';
import { VoiceoverModal } from './VoiceoverModal';
import { StickersModal } from './StickersModal';
import { PresetsModal } from './PresetsModal';
import { AudioMeter } from './AudioMeter';

interface HeaderProps {
  onOpenExportModal?: () => void;
  onOpenExport?: () => void;
}

const SOCIAL_ASPECT_RATIOS: { label: string; ratio: AspectRatio; icon: string }[] = [
  { label: 'YouTube (16:9)', ratio: '16:9', icon: '🎬' },
  { label: 'Shorts / Reels / TikTok (9:16)', ratio: '9:16', icon: '📱' },
  { label: 'Instagram Post (4:5)', ratio: '4:5', icon: '📸' },
  { label: 'Square (1:1)', ratio: '1:1', icon: '⬛' },
  { label: 'Standard (4:3)', ratio: '4:3', icon: '📺' },
];

export const Header: React.FC<HeaderProps> = ({ onOpenExportModal, onOpenExport }) => {
  const [projectName, setProjectName] = useState('My Ak Cut Project');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isCaptionsOpen, setIsCaptionsOpen] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isVoiceoverOpen, setIsVoiceoverOpen] = useState(false);
  const [isStickersOpen, setIsStickersOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);

  const {
    saveStatus,
    undo,
    redo,
    historyIndex,
    history,
    aspectRatio,
    setAspectRatio,
    layoutMode,
    setLayoutMode,
    isLeftPanelOpen,
    isRightPanelOpen,
    toggleLeftPanel,
    toggleRightPanel,
  } = useTimelineStore();

  const handleExport = onOpenExportModal || onOpenExport;

  return (
    <header className="h-14 bg-dark-900 border-b border-dark-700 px-4 flex items-center justify-between select-none z-40 relative">
      {/* Brand & Project Info */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md">
            AK
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white hidden sm:inline">
            AK <span className="text-cyan-400">CUT</span>
          </span>
        </div>

        <div className="h-4 w-[1px] bg-dark-700 hidden sm:block" />

        {/* Project Name Editor */}
        <div className="flex items-center space-x-1.5">
          {isEditingName ? (
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              autoFocus
              className="bg-dark-800 border border-cyan-500 rounded px-2 py-0.5 text-xs text-white outline-none font-semibold w-40"
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="flex items-center space-x-1 hover:bg-dark-800 px-2 py-1 rounded text-xs font-semibold text-gray-200 transition"
            >
              <span className="truncate max-w-[140px]">{projectName}</span>
              <Edit3 className="w-3 h-3 text-gray-500" />
            </button>
          )}

          {/* Auto-Save Indicator */}
          <span className="text-[10px] text-gray-500 font-mono flex items-center space-x-1">
            <Save className="w-3 h-3 text-cyan-400" />
            <span>{saveStatus}</span>
          </span>
        </div>
      </div>

      {/* Center Creator Toolbar */}
      <div className="hidden md:flex items-center space-x-1">
        <button
          onClick={() => setIsCaptionsOpen(true)}
          className="flex items-center space-x-1 px-2.5 py-1.5 bg-dark-800 hover:bg-dark-700 text-gray-200 hover:text-cyan-400 rounded-xl text-xs font-semibold border border-dark-700 transition"
          title="Auto-Generate Captions"
        >
          <Wand2 className="w-3.5 h-3.5 text-purple-400" />
          <span>Auto Captions</span>
        </button>

        <button
          onClick={() => setIsTranscriptOpen(true)}
          className="flex items-center space-x-1 px-2.5 py-1.5 bg-dark-800 hover:bg-dark-700 text-gray-200 hover:text-cyan-400 rounded-xl text-xs font-semibold border border-dark-700 transition"
          title="Transcript-Based Video Editor"
        >
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span>Transcript</span>
        </button>

        <button
          onClick={() => setIsVoiceoverOpen(true)}
          className="flex items-center space-x-1 px-2.5 py-1.5 bg-dark-800 hover:bg-dark-700 text-gray-200 hover:text-cyan-400 rounded-xl text-xs font-semibold border border-dark-700 transition"
          title="Record Live Voiceover Track"
        >
          <Mic className="w-3.5 h-3.5 text-green-400" />
          <span>Voiceover</span>
        </button>

        <button
          onClick={() => setIsStickersOpen(true)}
          className="flex items-center space-x-1 px-2.5 py-1.5 bg-dark-800 hover:bg-dark-700 text-gray-200 hover:text-cyan-400 rounded-xl text-xs font-semibold border border-dark-700 transition"
          title="Stickers, Vector Shapes & Emoji"
        >
          <Shapes className="w-3.5 h-3.5 text-amber-400" />
          <span>Stickers</span>
        </button>

        <button
          onClick={() => setIsPresetsOpen(true)}
          className="flex items-center space-x-1 px-2.5 py-1.5 bg-dark-800 hover:bg-dark-700 text-gray-200 hover:text-cyan-400 rounded-xl text-xs font-semibold border border-dark-700 transition"
          title="Creator Style Presets & Templates"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Presets</span>
        </button>
      </div>

      {/* Right Action Bar */}
      <div className="flex items-center space-x-3">
        <AudioMeter />

        <div className="flex items-center space-x-1 bg-dark-800 p-1 rounded-xl border border-dark-700">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 rounded-lg transition"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 rounded-lg transition"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <select
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
          className="bg-dark-800 border border-dark-700 text-xs font-semibold text-gray-200 px-3 py-1.5 rounded-xl outline-none cursor-pointer hover:border-cyan-500 transition"
        >
          {SOCIAL_ASPECT_RATIOS.map((item) => (
            <option key={item.ratio} value={item.ratio}>
              {item.icon} {item.label}
            </option>
          ))}
        </select>

        {handleExport && (
          <button
            onClick={handleExport}
            className="flex items-center space-x-1.5 px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl shadow-lg transition transform active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        )}
      </div>

      {/* Modals */}
      <GenerateCaptionsModal isOpen={isCaptionsOpen} onClose={() => setIsCaptionsOpen(false)} />
      <TranscriptEditor isOpen={isTranscriptOpen} onClose={() => setIsTranscriptOpen(false)} />
      <VoiceoverModal isOpen={isVoiceoverOpen} onClose={() => setIsVoiceoverOpen(false)} />
      <StickersModal isOpen={isStickersOpen} onClose={() => setIsStickersOpen(false)} />
      <PresetsModal isOpen={isPresetsOpen} onClose={() => setIsPresetsOpen(false)} />
    </header>
  );
};
