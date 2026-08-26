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
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { AspectRatio } from '../types/timeline';

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

  useEffect(() => {
    const savedName = localStorage.getItem('ak_cut_project_name');
    if (savedName) setProjectName(savedName);
  }, []);

  const handleSaveName = () => {
    localStorage.setItem('ak_cut_project_name', projectName);
    setIsEditingName(false);
    saveProjectToDB();
  };

  return (
    <header className="h-14 bg-dark-900 border-b border-dark-700 px-4 flex items-center justify-between select-none z-30">
      {/* Brand Logo & Editable Project Name */}
      <div className="flex items-center space-x-3">
        <button
          onClick={toggleLeftPanel}
          className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-dark-800 rounded-lg transition"
          title="Toggle Left Panel"
        >
          {isLeftPanelOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </button>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Scissors className="w-4 h-4 text-white transform -rotate-45" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              {isEditingName ? (
                <input
                  type="text"
                  autoFocus
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                  }}
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

      {/* Undo / Redo & Social Canvas Aspect Ratio Selector */}
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
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Social Canvas Aspect Ratio Presets Selector */}
        <div className="flex items-center space-x-1.5 bg-dark-800 px-2 py-1 rounded-xl border border-dark-700">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            className="bg-transparent text-xs font-semibold text-gray-200 outline-none cursor-pointer"
          >
            {SOCIAL_ASPECT_RATIOS.map((item) => (
              <option key={item.ratio} value={item.ratio} className="bg-dark-900 text-gray-100">
                {item.icon} {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Layout Mode Switcher & Export Button */}
      <div className="flex items-center space-x-3">
        <div className="hidden sm:flex items-center space-x-1 bg-dark-800 p-1 rounded-xl border border-dark-700">
          <button
            onClick={() => setLayoutMode('auto')}
            className={`px-2 py-1 text-xs font-semibold rounded-lg transition ${
              layoutMode === 'auto' ? 'bg-dark-700 text-cyan-400 shadow-sm' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Auto
          </button>
          <button
            onClick={() => setLayoutMode('mobile')}
            className={`p-1.5 rounded-lg transition ${
              layoutMode === 'mobile' ? 'bg-dark-700 text-cyan-400 shadow-sm' : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Mobile Layout"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setLayoutMode('desktop')}
            className={`p-1.5 rounded-lg transition ${
              layoutMode === 'desktop' ? 'bg-dark-700 text-cyan-400 shadow-sm' : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Desktop Layout"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/25 transition transform active:scale-95"
          title="Export Video Project to MP4 (Render Final Video)"
        >
          <Download className="w-4 h-4" />
          <span>Export MP4</span>
        </button>

        <button
          onClick={toggleRightPanel}
          className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-dark-800 rounded-lg transition"
          title="Toggle Right Inspector"
        >
          {isRightPanelOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
};
