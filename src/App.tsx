import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MediaLibrary } from './components/MediaLibrary';
import { PreviewPlayer } from './components/PreviewPlayer';
import { Inspector } from './components/Inspector';
import { Timeline } from './components/Timeline';
import { ExportModal } from './components/ExportModal';
import { useTimelineStore } from './store/timelineStore';

export const App: React.FC = () => {
  const [isExportOpen, setIsExportOpen] = useState(false);

  const {
    isPlaying,
    setIsPlaying,
    splitSelectedClip,
    deleteSelectedClip,
    undo,
    redo,
    loadDemoProject,
  } = useTimelineStore();

  // Load demo project on startup
  useEffect(() => {
    loadDemoProject();
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in text area or input field
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
    <div className="flex flex-col h-screen w-screen bg-dark-900 text-gray-100 overflow-hidden font-sans select-none">
      {/* Top Header */}
      <Header onOpenExport={() => setIsExportOpen(true)} />

      {/* Main Workspace (Media Library, Canvas Player, Inspector) */}
      <div className="flex-1 flex overflow-hidden">
        <MediaLibrary />
        <PreviewPlayer />
        <Inspector />
      </div>

      {/* Bottom Timeline */}
      <Timeline />

      {/* Export Modal */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
};

export default App;
