import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MediaLibrary } from './components/MediaLibrary';
import { PreviewPlayer } from './components/PreviewPlayer';
import { Inspector } from './components/Inspector';
import { Timeline } from './components/Timeline';
import { ExportModal } from './components/ExportModal';
import { useTimelineStore } from './store/timelineStore';
import {
  Film,
  Type,
  Wand2,
  Sliders,
  Scissors,
  X,
} from 'lucide-react';

export const App: React.FC = () => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [activeMobileDrawer, setActiveMobileDrawer] = useState<'media' | 'text' | 'effects' | 'adjust' | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  const {
    isPlaying,
    setIsPlaying,
    splitSelectedClip,
    deleteSelectedClip,
    undo,
    redo,
    loadDemoProject,
    layoutMode,
    isLeftPanelOpen,
    isRightPanelOpen,
  } = useTimelineStore();

  // Listen to window & visualViewport resize
  useEffect(() => {
    const handleResize = () => {
      const w = window.visualViewport ? window.visualViewport.width : window.innerWidth;
      setWindowWidth(w);
    };

    window.addEventListener('resize', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // Determine mobile view state
  const isMobileView =
    layoutMode === 'mobile' || (layoutMode === 'auto' && windowWidth < 768);

  // Load demo project on startup
  useEffect(() => {
    loadDemoProject();
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        splitSelectedClip();
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        deleteSelectedClip();
      } else if (e.ctrlKey && e.code === 'KeyZ') {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && e.code === 'KeyY') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, setIsPlaying, splitSelectedClip, deleteSelectedClip, undo, redo]);

  return (
    <div className="flex flex-col h-[100dvh] w-screen bg-dark-900 text-gray-100 overflow-hidden font-sans select-none relative">
      {/* Top Header Navigation */}
      <Header onOpenExport={() => setIsExportOpen(true)} />

      {/* Main Workspace (Media Library, Canvas Player, Inspector) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative min-h-0 min-w-0">
        {/* DESKTOP LEFT SIDEBAR: Media Library (Collapsible) */}
        {!isMobileView && isLeftPanelOpen && (
          <div className="shrink-0 transition-all duration-300">
            <MediaLibrary />
          </div>
        )}

        {/* CENTER PREVIEW PLAYER CANVAS */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden border-b md:border-b-0 border-dark-700 bg-black/40">
          <PreviewPlayer />
        </div>

        {/* DESKTOP RIGHT SIDEBAR: Inspector (Collapsible) */}
        {!isMobileView && isRightPanelOpen && (
          <div className="shrink-0 transition-all duration-300">
            <Inspector />
          </div>
        )}
      </div>

      {/* BOTTOM MULTI-TRACK TIMELINE */}
      <div className={`${isMobileView ? 'h-48' : 'h-64'} shrink-0 flex flex-col min-h-0 overflow-hidden`}>
        <Timeline />
      </div>

      {/* MOBILE CAPCUT BOTTOM NAVIGATION TOOLBAR (Active on Mobile View) */}
      {isMobileView && (
        <div className="h-14 bg-dark-800 border-t border-dark-700 flex items-center justify-around px-2 z-30 shrink-0">
          <button
            onClick={() => setActiveMobileDrawer(activeMobileDrawer === 'media' ? null : 'media')}
            className={`flex flex-col items-center justify-center p-1 text-[10px] font-medium transition ${
              activeMobileDrawer === 'media' ? 'text-cyan-400 font-bold' : 'text-gray-400'
            }`}
          >
            <Film className="w-5 h-5 mb-0.5" />
            <span>Media</span>
          </button>

          <button
            onClick={() => setActiveMobileDrawer(activeMobileDrawer === 'text' ? null : 'text')}
            className={`flex flex-col items-center justify-center p-1 text-[10px] font-medium transition ${
              activeMobileDrawer === 'text' ? 'text-cyan-400 font-bold' : 'text-gray-400'
            }`}
          >
            <Type className="w-5 h-5 mb-0.5" />
            <span>Text</span>
          </button>

          <button
            onClick={splitSelectedClip}
            className="flex flex-col items-center justify-center p-1 text-[10px] font-medium text-cyan-400 active:scale-95 transition"
          >
            <Scissors className="w-5 h-5 mb-0.5" />
            <span>Split</span>
          </button>

          <button
            onClick={() => setActiveMobileDrawer(activeMobileDrawer === 'effects' ? null : 'effects')}
            className={`flex flex-col items-center justify-center p-1 text-[10px] font-medium transition ${
              activeMobileDrawer === 'effects' ? 'text-cyan-400 font-bold' : 'text-gray-400'
            }`}
          >
            <Wand2 className="w-5 h-5 mb-0.5" />
            <span>Effects</span>
          </button>

          <button
            onClick={() => setActiveMobileDrawer(activeMobileDrawer === 'adjust' ? null : 'adjust')}
            className={`flex flex-col items-center justify-center p-1 text-[10px] font-medium transition ${
              activeMobileDrawer === 'adjust' ? 'text-cyan-400 font-bold' : 'text-gray-400'
            }`}
          >
            <Sliders className="w-5 h-5 mb-0.5" />
            <span>Adjust</span>
          </button>
        </div>
      )}

      {/* MOBILE BOTTOM SHEET DRAWER OVERLAY */}
      {isMobileView && activeMobileDrawer && (
        <div className="absolute inset-x-0 bottom-14 top-12 bg-dark-900/95 backdrop-blur-md z-40 flex flex-col border-t border-dark-700 shadow-2xl animate-in slide-in-from-bottom duration-200">
          <div className="h-10 bg-dark-800 px-4 flex items-center justify-between border-b border-dark-700 shrink-0">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              {activeMobileDrawer === 'media' && 'Media Assets & Import'}
              {activeMobileDrawer === 'text' && 'Text & Fonts'}
              {activeMobileDrawer === 'effects' && 'CapCut Video Effects'}
              {activeMobileDrawer === 'adjust' && 'Inspector & Adjustments'}
            </span>
            <button
              onClick={() => setActiveMobileDrawer(null)}
              className="p-1 text-gray-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {(activeMobileDrawer === 'media' || activeMobileDrawer === 'text' || activeMobileDrawer === 'effects') && (
              <MediaLibrary />
            )}
            {activeMobileDrawer === 'adjust' && <Inspector />}
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
};

export default App;
