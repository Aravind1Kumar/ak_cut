import React, { useState, useEffect } from 'react';
import { Search, Scissors, Copy, Trash2, Bookmark, Download, Magnet, Layers, Smartphone, Monitor, Undo2, Redo2, Type, Sparkles, VolumeX, Lock, Eye, LayoutTemplate } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExportModal: () => void;
  onOpenPresetsModal?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onOpenExportModal, onOpenPresetsModal }) => {
  const [query, setQuery] = useState('');

  const {
    splitSelectedClip,
    duplicateSelectedClip,
    deleteSelectedClip,
    copySelectedClip,
    pasteClipAtPlayhead,
    undo,
    redo,
    addTextClipDirectlyOnCanvas,
    addMarker,
    snappingEnabled,
    setSnappingEnabled,
    rippleDeleteEnabled,
    setRippleDeleteEnabled,
    setAspectRatio,
    setZoomLevel,
    zoomLevel,
    tracks,
    toggleTrackMute,
    toggleTrackLocked,
    toggleTrackHidden,
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
      name: 'Creator Style Presets & Templates',
      shortcut: 'Presets',
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      action: () => {
        if (onOpenPresetsModal) onOpenPresetsModal();
        onClose();
      },
    },
    {
      name: 'Set Aspect Ratio: YouTube Widescreen (16:9)',
      shortcut: '16:9',
      icon: <Monitor className="w-4 h-4 text-cyan-400" />,
      action: () => {
        setAspectRatio('16:9');
        onClose();
      },
    },
    {
      name: 'Set Aspect Ratio: Shorts / Reels / TikTok (9:16)',
      shortcut: '9:16',
      icon: <Smartphone className="w-4 h-4 text-cyan-400" />,
      action: () => {
        setAspectRatio('9:16');
        onClose();
      },
    },
    {
      name: 'Set Aspect Ratio: Instagram Post (4:5)',
      shortcut: '4:5',
      icon: <Layers className="w-4 h-4 text-purple-400" />,
      action: () => {
        setAspectRatio('4:5');
        onClose();
      },
    },
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
      name: 'Copy Selected Clip',
      shortcut: 'Ctrl+C',
      icon: <Copy className="w-4 h-4 text-indigo-400" />,
      action: () => {
        copySelectedClip();
        onClose();
      },
    },
    {
      name: 'Paste Clip at Playhead',
      shortcut: 'Ctrl+V',
      icon: <Copy className="w-4 h-4 text-purple-400" />,
      action: () => {
        pasteClipAtPlayhead();
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
      name: 'Undo Action',
      shortcut: 'Ctrl+Z',
      icon: <Undo2 className="w-4 h-4 text-amber-400" />,
      action: () => {
        undo();
        onClose();
      },
    },
    {
      name: 'Redo Action',
      shortcut: 'Ctrl+Shift+Z',
      icon: <Redo2 className="w-4 h-4 text-amber-400" />,
      action: () => {
        redo();
        onClose();
      },
    },
    {
      name: 'Add Text Directly on Canvas',
      shortcut: 'Text',
      icon: <Type className="w-4 h-4 text-cyan-400" />,
      action: () => {
        addTextClipDirectlyOnCanvas('Type here');
        onClose();
      },
    },
    {
      name: 'Export Video Project',
      shortcut: 'Ctrl+E',
      icon: <Download className="w-4 h-4 text-green-400" />,
      action: () => {
        onOpenExportModal();
        onClose();
      },
    },
  ];

  const filteredCommands = commands.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 z-50 p-4 select-none">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        <div className="p-3 border-b border-dark-700 flex items-center space-x-3">
          <Search className="w-5 h-5 text-cyan-400 ml-1" />
          <input
            type="text"
            placeholder="Type a command or social workflow action (e.g. Presets, 9:16, Split, Export)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none font-semibold"
          />
          <span className="text-[10px] font-mono bg-dark-800 text-gray-400 border border-dark-700 px-2 py-0.5 rounded">
            ESC
          </span>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">No matching commands found.</p>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <button
                key={idx}
                onClick={cmd.action}
                className="w-full flex items-center justify-between p-2.5 hover:bg-dark-800 rounded-xl transition group text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-dark-800 group-hover:bg-dark-700 rounded-lg border border-dark-700 transition">
                    {cmd.icon}
                  </div>
                  <span className="text-xs font-bold text-gray-200 group-hover:text-cyan-400 transition">
                    {cmd.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-gray-500 bg-dark-950 px-2 py-0.5 rounded border border-dark-800">
                  {cmd.shortcut}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
