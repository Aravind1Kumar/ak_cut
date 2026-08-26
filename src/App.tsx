import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MediaLibrary } from './components/MediaLibrary';
import { PreviewPlayer } from './components/PreviewPlayer';
import { Inspector } from './components/Inspector';
import { Timeline } from './components/Timeline';
import { ExportModal } from './components/ExportModal';
import { CommandPalette } from './components/CommandPalette';
import { useTimelineStore } from './store/timelineStore';
import { Sparkles, Command, CheckCircle, X, RotateCcw, AlertTriangle } from 'lucide-react';
import { loadProjectStateFromIndexedDB } from './utils/projectPersistence';

export const App: React.FC = () => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [recoveredProjectData, setRecoveredProjectData] = useState<any>(null);

  const {
    restoreProjectFromDB,
    isLeftPanelOpen,
    isRightPanelOpen,
  } = useTimelineStore();

  // Check IndexedDB for Recoverable Unsaved Project Session
  useEffect(() => {
    async function checkRecovery() {
      const dbState = await loadProjectStateFromIndexedDB();
      if (dbState && dbState.tracks && dbState.tracks.some((t: any) => t.clips.length > 0)) {
        setRecoveredProjectData(dbState);
        setShowRecoveryDialog(true);
      } else {
        restoreProjectFromDB();
      }
    }

    checkRecovery();

    const onboardingDismissed = localStorage.getItem('ak_cut_onboarding_dismissed');
    if (!onboardingDismissed) {
      setShowOnboarding(true);
    }
  }, []);

  const handleRestoreRecovery = () => {
    restoreProjectFromDB();
    setShowRecoveryDialog(false);
  };

  const handleDiscardRecovery = () => {
    setShowRecoveryDialog(false);
  };

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

      {/* Crash / Unsaved Project Recovery Modal */}
      {showRecoveryDialog && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-dark-800 border border-amber-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center space-x-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-white">Recover Unsaved Project Changes</h3>
                <p className="text-xs text-gray-400">An autosaved project session was found in IndexedDB storage.</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed bg-dark-900/60 p-3 rounded-xl border border-dark-700">
              Would you like to restore your timeline clips, media assets, text layers, and markers?
            </p>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={handleDiscardRecovery}
                className="flex-1 py-2.5 bg-dark-700 hover:bg-dark-600 text-gray-300 font-semibold text-xs rounded-xl transition"
              >
                Discard Session
              </button>
              <button
                onClick={handleRestoreRecovery}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restore Project</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
              <h3 className="text-base font-bold text-white">Welcome to AK Cut PRO 2.0</h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Fast, creator-grade desktop & mobile browser video editing!
            </p>

            <div className="space-y-2 text-xs text-gray-300 font-medium">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Track Controls & Lock:</strong> Lock, hide, or mute individual timeline tracks.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Audio Fade Controls:</strong> Adjust volume, fade in, and fade out durations.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Timeline Markers (M):</strong> Press <kbd className="px-1.5 py-0.5 bg-dark-900 border border-dark-700 text-amber-300 rounded text-[10px]">M</kbd> to add markers at playhead.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Command Palette:</strong> Press <kbd className="px-1.5 py-0.5 bg-dark-900 border border-dark-700 text-cyan-300 rounded text-[10px]">Ctrl+K</kbd> to search shortcuts.</span>
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

export default App;
