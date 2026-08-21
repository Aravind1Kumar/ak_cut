import React from 'react';
import {
  Scissors,
  Undo2,
  Redo2,
  Download,
  Sparkles,
  Monitor,
  Smartphone,
  Square,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  LayoutGrid,
} from 'lucide-react';
import { useTimelineStore, LayoutMode } from '../store/timelineStore';
import { AspectRatio } from '../types/timeline';

interface HeaderProps {
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenExport }) => {
  const {
    undo,
    redo,
    historyIndex,
    history,
    aspectRatio,
    setAspectRatio,
    loadDemoProject,
    layoutMode,
    setLayoutMode,
    isLeftPanelOpen,
    toggleLeftPanel,
    isRightPanelOpen,
    toggleRightPanel,
  } = useTimelineStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const aspectRatios: { label: string; value: AspectRatio; icon: React.ReactNode }[] = [
    { label: '16:9', value: '16:9', icon: <Monitor className="w-3.5 h-3.5" /> },
    { label: '9:16', value: '9:16', icon: <Smartphone className="w-3.5 h-3.5" /> },
    { label: '1:1', value: '1:1', icon: <Square className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="h-12 md:h-14 bg-dark-800 border-b border-dark-700 px-2 sm:px-4 flex items-center justify-between z-30 select-none shrink-0 overflow-x-auto scrollbar-none">
      {/* Brand & Panel Collapse Toggle Controls */}
      <div className="flex items-center space-x-2 shrink-0">
        <div className="flex items-center justify-center w-7 h-7 md:w-9 md:h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
          <Scissors className="w-4 h-4 md:w-5 md:h-5 text-white transform -rotate-45" />
        </div>
        <div className="flex items-center space-x-1">
          <span className="font-extrabold text-xs sm:text-sm md:text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            AK CUT
          </span>
          <span className="px-1 py-0.5 text-[9px] md:text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded">
            PRO
          </span>
        </div>

        {/* Panel Toggle Buttons */}
        <div className="hidden sm:flex items-center space-x-1 ml-2 bg-dark-900/60 p-0.5 rounded-lg border border-dark-700">
          <button
            onClick={toggleLeftPanel}
            title={isLeftPanelOpen ? 'Collapse Left Media Panel' : 'Expand Left Media Panel'}
            className={`p-1.5 rounded transition ${
              isLeftPanelOpen ? 'text-cyan-400 bg-dark-700' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {isLeftPanelOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={toggleRightPanel}
            title={isRightPanelOpen ? 'Collapse Right Inspector Panel' : 'Expand Right Inspector Panel'}
            className={`p-1.5 rounded transition ${
              isRightPanelOpen ? 'text-cyan-400 bg-dark-700' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {isRightPanelOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Center Actions (Undo, Redo, Layout Mode, Aspect Ratio) */}
      <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={`p-1.5 md:p-2 rounded-lg transition-colors ${
            canUndo ? 'text-gray-200 hover:bg-dark-700' : 'text-gray-600 cursor-not-allowed'
          }`}
        >
          <Undo2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>

        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className={`p-1.5 md:p-2 rounded-lg transition-colors ${
            canRedo ? 'text-gray-200 hover:bg-dark-700' : 'text-gray-600 cursor-not-allowed'
          }`}
        >
          <Redo2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>

        <div className="h-4 w-[1px] bg-dark-700 mx-0.5" />

        {/* Layout Mode Switcher (Forces Mobile/Desktop layout even on Chrome Mobile Desktop Site) */}
        <div className="flex bg-dark-900/80 p-0.5 rounded-lg border border-cyan-500/30">
          {[
            { mode: 'auto', label: 'Auto', icon: <LayoutGrid className="w-3 h-3" /> },
            { mode: 'mobile', label: 'Mobile App', icon: <Smartphone className="w-3 h-3" /> },
            { mode: 'desktop', label: 'Desktop', icon: <Monitor className="w-3 h-3" /> },
          ].map((item) => (
            <button
              key={item.mode}
              onClick={() => setLayoutMode(item.mode as LayoutMode)}
              className={`flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded transition ${
                layoutMode === item.mode
                  ? 'bg-cyan-500 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {item.icon}
              <span className="hidden md:inline">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="h-4 w-[1px] bg-dark-700 mx-0.5" />

        {/* Aspect Ratio Selector */}
        <div className="flex bg-dark-900/60 p-0.5 rounded-lg border border-dark-700">
          {aspectRatios.map((item) => (
            <button
              key={item.value}
              onClick={() => setAspectRatio(item.value)}
              className={`flex items-center space-x-1 px-1.5 md:px-2.5 py-1 text-[11px] font-medium rounded transition-all ${
                aspectRatio === item.value
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {item.icon}
              <span className="hidden sm:inline">{item.value}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Export Action */}
      <div className="shrink-0">
        <button
          onClick={onOpenExport}
          className="flex items-center space-x-1.5 px-2.5 md:px-4 py-1.5 md:py-2 text-[11px] md:text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-lg shadow-md shadow-cyan-500/20 transition active:scale-95"
        >
          <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="hidden sm:inline">Export Video</span>
          <span className="sm:hidden">Export</span>
        </button>
      </div>
    </header>
  );
};
