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
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { AspectRatio } from '../types/timeline';
import { GenerateCaptionsModal } from './GenerateCaptionsModal';
import { TranscriptEditor } from './TranscriptEditor';
import { VoiceoverModal } from './VoiceoverModal';

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
  { label: 'Widescreen Cinema (21:9)', ratio: '21:9', icon: '🎥' },
];

export const Header: React.FC<HeaderProps> = ({ onOpenExportModal, onOpenExport }) => {
  const handleExport = onOpenExportModal || onOpenExport;
  const [projectName, setProjectName] = useState('Untitled Project');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isCaptionsModalOpen, setIsCaptionsModalOpen] = useState(false);
  const [isTranscriptEditorOpen, setIsTranscriptEditorOpen] = useState(false);
  const [isVoiceoverModalOpen, setIsVoiceoverModalOpen] = useState(false);

  const {
    saveStatus,
    aspectRatio,
    layoutMode,
    isLeftPanelOpen,
    isRightPanelOpen,
    setAspectRatio,
    setLayoutMode,
    toggleLeftPanel,
    toggleRightPanel,
    undo,
    redo,
    historyIndex,
    history,
    saveProjectToDB,
  } = useTimelineStore();

  return (
    <header className="h-14 bg-dark-900 border-b border-dark-700/80 px-4 flex items-center justify-between select-none z-30 relative">
      {/* Brand & Project Title */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleLeftPanel}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition"
            title={isLeftPanelOpen ? 'Collapse Left Sidebar' : 'Expand Left Sidebar'}
          >
            {isLeftPanelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 tracking-wider">
                  AK CUT
                </span>

                {isEditingName ? (
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setIsEditingName(false);
                    }}
                    autoFocus
                    className="bg-dark-800 text-xs font-bold text-white px-2 py-0.5 border border-cyan-500 rounded outline-none"
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingName(true)}
                    className="flex items-center space-x-1.5 cursor-pointer group"
                    title="Click to edit project name"
                  >
                    <h1 className="text-sm font-black text-white tracking-wide group-hover:text-cyan-400 transition">
                      {projectName}
                    </h1>
                    <Edit3 className="w-3 h-3 text-gray-500 group-hover:text-cyan-400 transition opacity-0 group-hover:opacity-100" />
                  </div>
                )}

                <span className="text-[9px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                  PRO 2.0
                </span>
              </div>
              <div className="text-[10px] text-gray-500 flex items-center space-x-1">
                <Save className="w-2.5 h-2.5" />
                <span>{saveStatus}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons: Auto Captions, Transcript & Voiceover Microphone Recorder */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsCaptionsModalOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow transition"
          title="Generate Automatic Captions (Speech-to-Text)"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Auto Captions</span>
        </button>

        <button
          onClick={() => setIsTranscriptEditorOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-gray-200 border border-dark-700 font-semibold text-xs rounded-xl transition"
          title="Open Interactive Transcript Editor"
        >
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span>Transcript</span>
        </button>

        <button
          onClick={() => setIsVoiceoverModalOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-red-400 border border-red-500/30 font-semibold text-xs rounded-xl transition"
          title="Record Voiceover Microphone Track"
        >
          <Mic className="w-3.5 h-3.5 text-red-400" />
          <span>Voiceover</span>
        </button>
      </div>

      {/* Undo / Redo, Aspect Ratio & Export */}
      <div className="flex items-center space-x-3">
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

        <button
          onClick={toggleRightPanel}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition"
          title={isRightPanelOpen ? 'Collapse Inspector' : 'Expand Inspector'}
        >
          {isRightPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
        </button>
      </div>

      <GenerateCaptionsModal
        isOpen={isCaptionsModalOpen}
        onClose={() => setIsCaptionsModalOpen(false)}
      />

      <TranscriptEditor
        isOpen={isTranscriptEditorOpen}
        onClose={() => setIsTranscriptEditorOpen(false)}
      />

      <VoiceoverModal
        isOpen={isVoiceoverModalOpen}
        onClose={() => setIsVoiceoverModalOpen(false)}
      />
    </header>
  );
};
