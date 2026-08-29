import React from 'react';
import {
  FolderOpen,
  Music,
  Type,
  FileText,
  Shapes,
  Sparkles,
  Sliders,
  Layers,
  Wand2,
  Scissors,
  Flame,
  HelpCircle,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';

export type CreatorNavTab =
  | 'media'
  | 'audio'
  | 'text'
  | 'captions'
  | 'graphics'
  | 'effects'
  | 'transitions'
  | 'masks';

interface CreatorNavRailProps {
  activeTab: CreatorNavTab;
  onSelectTab: (tab: CreatorNavTab) => void;
  onOpenOnboarding?: () => void;
}

const NAV_ITEMS: { id: CreatorNavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'media', label: 'Media', icon: FolderOpen },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'captions', label: 'Captions', icon: FileText },
  { id: 'graphics', label: 'Graphics', icon: Shapes },
  { id: 'effects', label: 'Effects', icon: Sparkles },
  { id: 'transitions', label: 'Transitions', icon: Wand2 },
  { id: 'masks', label: 'Mask & Key', icon: Layers },
];

export const CreatorNavRail: React.FC<CreatorNavRailProps> = ({
  activeTab,
  onSelectTab,
  onOpenOnboarding,
}) => {
  const { isLeftPanelOpen, setLeftPanelOpen } = useTimelineStore();

  const handleItemClick = (tab: CreatorNavTab) => {
    if (activeTab === tab && isLeftPanelOpen) {
      setLeftPanelOpen(false);
    } else {
      onSelectTab(tab);
      setLeftPanelOpen(true);
    }
  };

  return (
    <nav className="w-16 bg-dark-950 border-r border-dark-800 flex flex-col items-center justify-between py-3 select-none z-30 shrink-0 shadow-2xl">
      {/* Top Creator Tools */}
      <div className="flex flex-col items-center space-y-1.5 w-full px-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = isLeftPanelOpen && activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-13 h-13 rounded-2xl flex flex-col items-center justify-center transition-all duration-150 relative group ${
                isActive
                  ? 'bg-gradient-to-b from-cyan-500/20 to-cyan-600/10 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10 font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-dark-900 border border-transparent'
              }`}
              title={`${item.label} Tool Panel`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400 scale-110' : 'text-gray-400 group-hover:text-white'}`} />
              <span className="text-[9px] font-bold mt-1 tracking-tight truncate max-w-[52px]">
                {item.label}
              </span>

              {isActive && (
                <span className="absolute right-0 top-3 bottom-3 w-1 bg-cyan-400 rounded-l-full shadow-lg shadow-cyan-400/50" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Help / Guide */}
      <div className="flex flex-col items-center space-y-2 w-full px-1 pt-2 border-t border-dark-800">
        <button
          onClick={onOpenOnboarding}
          className="w-12 h-12 rounded-xl text-gray-400 hover:text-cyan-300 hover:bg-dark-900 flex flex-col items-center justify-center transition border border-transparent hover:border-dark-700"
          title="Creator Onboarding Guide"
        >
          <HelpCircle className="w-5 h-5 text-gray-400" />
          <span className="text-[8px] font-bold mt-0.5">Guide</span>
        </button>
      </div>
    </nav>
  );
};
