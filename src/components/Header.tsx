import React from 'react';
import { Scissors, Undo2, Redo2, Download, Sparkles, Monitor, Smartphone, Square } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
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
  } = useTimelineStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const aspectRatios: { label: string; value: AspectRatio; icon: React.ReactNode }[] = [
    { label: '16:9 Landscape', value: '16:9', icon: <Monitor className="w-3.5 h-3.5" /> },
    { label: '9:16 Portrait (TikTok/Shorts)', value: '9:16', icon: <Smartphone className="w-3.5 h-3.5" /> },
    { label: '1:1 Square (Instagram)', value: '1:1', icon: <Square className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="h-14 bg-dark-800 border-b border-dark-700 px-4 flex items-center justify-between z-30 select-none">
      {/* Brand Logo & Name */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
          <Scissors className="w-5 h-5 text-white transform -rotate-45" />
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="font-extrabold text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
              AK CUT
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-md">
              PRO
            </span>
          </div>
        </div>
      </div>

      {/* Center Actions (Undo, Redo, Aspect Ratio, Demo) */}
      <div className="flex items-center space-x-2">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={`p-2 rounded-lg transition-colors ${
            canUndo
              ? 'text-gray-200 hover:bg-dark-700 active:bg-dark-600'
              : 'text-gray-600 cursor-not-allowed'
          }`}
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className={`p-2 rounded-lg transition-colors ${
            canRedo
              ? 'text-gray-200 hover:bg-dark-700 active:bg-dark-600'
              : 'text-gray-600 cursor-not-allowed'
          }`}
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-dark-700 mx-1" />

        {/* Aspect Ratio Selector */}
        <div className="flex bg-dark-900/60 p-1 rounded-lg border border-dark-700">
          {aspectRatios.map((item) => (
            <button
              key={item.value}
              onClick={() => setAspectRatio(item.value)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                aspectRatio === item.value
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-dark-700/50'
              }`}
            >
              {item.icon}
              <span>{item.value}</span>
            </button>
          ))}
        </div>

        <div className="h-4 w-[1px] bg-dark-700 mx-1" />

        <button
          onClick={loadDemoProject}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Load Demo</span>
        </button>
      </div>

      {/* Export Action */}
      <div>
        <button
          onClick={onOpenExport}
          className="flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-lg shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/30 transition transform active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>Export Video</span>
        </button>
      </div>
    </header>
  );
};
