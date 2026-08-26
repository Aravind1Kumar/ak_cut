import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MediaLibrary } from './components/MediaLibrary';
import { PreviewPlayer } from './components/PreviewPlayer';
import { Inspector } from './components/Inspector';
import { Timeline } from './components/Timeline';
import { ExportModal } from './components/ExportModal';
import { CommandPalette } from './components/CommandPalette';
import { useTimelineStore } from './store/timelineStore';
import { Sparkles, Command, CheckCircle, X } from 'lucide-react';

export const App: React.FC = () => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const {
    restoreProjectFromDB,
    isLeftPanelOpen,
    isRightPanelOpen,
    layoutMode,
  } = useTimelineStore();

  // Restore IndexedDB project state & check onboarding status
  useEffect(() => {
    restoreProjectFromDB();

    const onboardingDismissed = localStorage.getItem('ak_cut_onboarding_dismissed');
    if (!onboardingDismissed) {
      setShowOnboarding(true);
    }
  }, []);

  // Keyboard shortcut listener for Command Palette (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const dismissOnboarding = () => {
    localStorage.setItem('ak_cut_onboarding_dismissed', 'true');
    setShowOnboarding(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-dark-950 text-gray-100 overflow-hidden select-none font-sans">
      {/* Header Bar */}
      <Header onOpenExportModal={() => setIsExportOpen(true)} />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Media Library Panel */}
        {isLeftPanelOpen && <MediaLibrary />}

        {/* Center Canvas Preview */}
        <PreviewPlayer />

        {/* Right Property Inspector Panel */}
        {isRightPanelOpen && <Inspector />}
      </div>

      {/* Bottom Timeline Section */}
      <Timeline />

      {/* Export Modal */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenExportModal={() => setIsExportOpen(true)}
      />

      {/* Dismissible Onboarding Guidance Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-dark-800 border border-cyan-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={dismissOnboarding}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-cyan-400">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Welcome to AK Cut 2.0</h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Fast, creator-grade browser video editing for YouTube, Shorts, TikTok, and Reels!
            </p>

            <div className="space-y-2 text-xs text-gray-300 font-medium">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Import Media:</strong> Drop videos, music & photos into Media tab.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Social Formats:</strong> Switch between 16:9 and 9:16 vertical canvas.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Command Palette:</strong> Press <kbd className="px-1.5 py-0.5 bg-dark-900 border border-dark-700 text-cyan-300 rounded text-[10px]">Ctrl+K</kbd> to search shortcuts.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Durable Save:</strong> Projects auto-save locally via IndexedDB.</span>
              </div>
            </div>

            <button
              onClick={dismissOnboarding}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
            >
              Start Editing Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
