import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MediaLibrary } from './components/MediaLibrary';
import { PreviewPlayer } from './components/PreviewPlayer';
import { Inspector } from './components/Inspector';
import { Timeline } from './components/Timeline';
import { ExportModal } from './components/ExportModal';
import { CommandPalette } from './components/CommandPalette';
import { CreatorNavRail, CreatorNavTab } from './components/CreatorNavRail';
import { CreatorToolPanels } from './components/CreatorToolPanels';
import { OnboardingModal } from './components/OnboardingModal';
import { GenerateCaptionsModal } from './components/GenerateCaptionsModal';
import { TranscriptEditor } from './components/TranscriptEditor';
import { VoiceoverModal } from './components/VoiceoverModal';
import { StickersModal } from './components/StickersModal';
import { PresetsModal } from './components/PresetsModal';
import { useTimelineStore } from './store/timelineStore';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { loadProjectStateFromIndexedDB } from './utils/projectPersistence';

export const App: React.FC = () => {
  const [activeLeftTab, setActiveLeftTab] = useState<CreatorNavTab>('media');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);

  const [isCaptionsOpen, setIsCaptionsOpen] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isVoiceoverOpen, setIsVoiceoverOpen] = useState(false);
  const [isStickersOpen, setIsStickersOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);

  const {
    restoreProjectFromDB,
    isLeftPanelOpen,
    isRightPanelOpen,
  } = useTimelineStore();

  // Keyboard hotkey for Command Palette (Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Check IndexedDB for Recoverable Unsaved Project Session
  useEffect(() => {
    async function checkRecovery() {
      const dbState = await loadProjectStateFromIndexedDB();
      if (dbState && dbState.tracks && dbState.tracks.some((t: any) => t.clips.length > 0)) {
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

  return (
    <div className="flex flex-col h-screen w-screen bg-dark-950 text-gray-100 overflow-hidden select-none font-sans">
      {/* Header Bar */}
      <Header
        onOpenExportModal={() => setIsExportOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Far-Left Vertical Creator Navigation Rail */}
        <CreatorNavRail
          activeTab={activeLeftTab}
          onSelectTab={(tab) => setActiveLeftTab(tab)}
          onOpenOnboarding={() => setShowOnboarding(true)}
        />

        {/* Left Drawer Tool Panel */}
        {isLeftPanelOpen && (
          <aside className="w-80 bg-dark-900 border-r border-dark-800 flex flex-col h-full z-20 overflow-hidden shrink-0 shadow-2xl">
            {activeLeftTab === 'media' ? (
              <MediaLibrary />
            ) : (
              <CreatorToolPanels
                activeTab={activeLeftTab}
                onOpenCaptionsModal={() => setIsCaptionsOpen(true)}
                onOpenTranscriptEditor={() => setIsTranscriptOpen(true)}
                onOpenVoiceoverModal={() => setIsVoiceoverOpen(true)}
                onOpenStickersModal={() => setIsStickersOpen(true)}
                onOpenPresetsModal={() => setIsPresetsOpen(true)}
              />
            )}
          </aside>
        )}

        {/* Center Canvas Viewport */}
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

      {/* Onboarding Guide Modal */}
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />

      {/* Modals */}
      <GenerateCaptionsModal isOpen={isCaptionsOpen} onClose={() => setIsCaptionsOpen(false)} />
      <TranscriptEditor isOpen={isTranscriptOpen} onClose={() => setIsTranscriptOpen(false)} />
      <VoiceoverModal isOpen={isVoiceoverOpen} onClose={() => setIsVoiceoverOpen(false)} />
      <StickersModal isOpen={isStickersOpen} onClose={() => setIsStickersOpen(false)} />
      <PresetsModal isOpen={isPresetsOpen} onClose={() => setIsPresetsOpen(false)} />

      {/* Crash / Unsaved Project Recovery Modal */}
      {showRecoveryDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-dark-900 border border-amber-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center space-x-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-white">Recover Unsaved Project Changes</h3>
                <p className="text-xs text-gray-400">An autosaved project session was found in IndexedDB storage.</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed bg-dark-950 p-3 rounded-xl border border-dark-800">
              Would you like to restore your timeline clips, media assets, text layers, and markers?
            </p>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={handleDiscardRecovery}
                className="flex-1 py-2.5 bg-dark-800 hover:bg-dark-700 text-gray-300 font-semibold text-xs rounded-xl transition"
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
    </div>
  );
};

export default App;

