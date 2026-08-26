import React, { useState, useEffect } from 'react';
import { Search, Scissors, Copy, Trash2, Bookmark, Download, Magnet, Layers, Smartphone, Monitor } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExportModal: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onOpenExportModal }) => {
  const [query, setQuery] = useState('');

  const {
    splitSelectedClip,
    duplicateSelectedClip,
    deleteSelectedClip,
    addMarker,
    snappingEnabled,
    setSnappingEnabled,
    rippleDeleteEnabled,
    setRippleDeleteEnabled,
    setAspectRatio,
  } = useTimelineStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const commands = [
    {
      name: 'Split Selected Clip',
      shortcut: 'S',
      icon: <Scissors className="w-4 h-4 text-cyan-400" />,
      action: () => {
        splitSelectedClip();
        onClose();
      },
    },
    {
      name: 'Duplicate Clip',
      shortcut: 'Ctrl+D',
      icon: <Copy className="w-4 h-4 text-blue-400" />,
      action: () => {
        duplicateSelectedClip();
        onClose();
      },
    },
    {
      name: 'Delete Selected Clip',
      shortcut: 'Delete',
      icon: <Trash2 className="w-4 h-4 text-red-400" />,
      action: () => {
        deleteSelectedClip();
        onClose();
      },
    },
    {
      name: 'Add Timeline Marker',
      shortcut: 'M',
      icon: <Bookmark className="w-4 h-4 text-amber-400" />,
      action: () => {
        addMarker();
        onClose();
      },
    },
    {
      name: `Toggle Magnet Snapping (${snappingEnabled ? 'ON' : 'OFF'})`,
      shortcut: 'Shift bypass',
      icon: <Magnet className="w-4 h-4 text-purple-400" />,
      action: () => {
        setSnappingEnabled(!snappingEnabled);
        onClose();
      },
    },
    {
      name: `Toggle Ripple Delete (${rippleDeleteEnabled ? 'ON' : 'OFF'})`,
      shortcut: 'Ripple',
      icon: <Layers className="w-4 h-4 text-emerald-400" />,
      action: () => {
        setRippleDeleteEnabled(!rippleDeleteEnabled);
        onClose();
      },
    },
    {
      name: 'Set TikTok / Shorts Canvas (9:16)',
      shortcut: 'Vertical',
      icon: <Smartphone className="w-4 h-4 text-cyan-400" />,
      action: () => {
        setAspectRatio('9:16');
        onClose();
      },
    },
    {
      name: 'Set YouTube Canvas (16:9)',
      shortcut: 'Landscape',
      icon: <Monitor className="w-4 h-4 text-blue-400" />,
      action: () => {
        setAspectRatio('16:9');
        onClose();
      },
    },
    {
      name: 'Export Video Project',
      shortcut: 'Export',
      icon: <Download className="w-4 h-4 text-emerald-400" />,
      action: () => {
        onClose();
        onOpenExportModal();
      },
    },
  ];

  const filteredCommands = commands.filter((cmd) => cmd.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 z-50 animate-in fade-in duration-150">
      <div className="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Search Header */}
        <div className="flex items-center space-x-3 px-4 py-3 border-b border-dark-700 bg-dark-900/60">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or shortcut (e.g. Split, Export, TikTok)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none"
          />
          <kbd className="px-2 py-0.5 bg-dark-700 text-gray-400 text-[10px] font-mono rounded">ESC</kbd>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">No matching commands found.</p>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <div
                key={idx}
                onClick={cmd.action}
                className="flex items-center justify-between px-3 py-2.5 hover:bg-dark-700 rounded-xl cursor-pointer transition group"
              >
                <div className="flex items-center space-x-3">
                  {cmd.icon}
                  <span className="text-xs font-semibold text-gray-200 group-hover:text-cyan-300">{cmd.name}</span>
                </div>
                <span className="px-2 py-0.5 bg-dark-900 text-gray-400 text-[10px] font-mono rounded border border-dark-700">
                  {cmd.shortcut}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
