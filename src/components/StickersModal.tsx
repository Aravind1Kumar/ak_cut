import React, { useState } from 'react';
import { Shapes, Smile, Sparkles, X, Plus } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { ShapeType } from '../types/timeline';

interface StickersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHAPES_LIST: { id: ShapeType; name: string; icon: string }[] = [
  { id: 'rectangle', name: 'Rectangle', icon: '⬛' },
  { id: 'roundedRectangle', name: 'Rounded Rect', icon: '▢' },
  { id: 'circle', name: 'Circle', icon: '⚪' },
  { id: 'ellipse', name: 'Ellipse', icon: '⬏' },
  { id: 'triangle', name: 'Triangle', icon: '🔺' },
  { id: 'line', name: 'Line', icon: '➖' },
  { id: 'arrow', name: 'Arrow', icon: '➔' },
  { id: 'star', name: 'Star', icon: '⭐' },
];

const STICKERS_LIST = [
  { icon: '❤️', name: 'Heart' },
  { icon: '⭐', name: 'Star' },
  { icon: '🔥', name: 'Fire' },
  { icon: '⚡', name: 'Flash' },
  { icon: '💎', name: 'Gem' },
  { icon: '🎉', name: 'Party' },
  { icon: '🚀', name: 'Rocket' },
  { icon: '📷', name: 'Camera' },
  { icon: '🎵', name: 'Music' },
  { icon: '🎤', name: 'Microphone' },
  { icon: '👍', name: 'Like' },
  { icon: '💯', name: 'Hundred' },
  { icon: '👏', name: 'Clap' },
  { icon: '🏆', name: 'Trophy' },
  { icon: '💡', name: 'Idea' },
  { icon: '🎬', name: 'Cinema' },
];

const EMOJIS_LIST = [
  '😀', '😂', '😎', '😍', '🤔', '🥳', '😭', '🤯', '😡', '😱',
  '👍', '🙌', '✨', '🔥', '💯', '🚀', '❤️', '🎉', '🌟', '🍿',
  '🍕', '🍔', '⚽', '🎯', '🎨', '🎧', '🎮', '💡', '📌', '🔔'
];

export const StickersModal: React.FC<StickersModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'shapes' | 'stickers' | 'emoji'>('shapes');
  const { currentTime, addClipToTrack, addTrack, tracks, saveProjectToDB, pushHistory } = useTimelineStore();

  if (!isOpen) return null;

  const handleAddShape = (shapeType: ShapeType, name: string) => {
    pushHistory();
    let graphicsTrack = tracks.find((t) => t.name === 'Graphics Track' || t.type === 'text');
    let trackId = graphicsTrack?.id || addTrack('text', 'Graphics Track');

    addClipToTrack(trackId, {
      name: `Shape: ${name}`,
      type: 'shape',
      startTime: currentTime,
      duration: 4.0,
      mediaOffset: 0,
      sourceDuration: 4.0,
      src: '',
      speed: 1,
      transform: { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0 },
      filter: { brightness: 100, contrast: 100, saturation: 100, blur: 0, hueRotate: 0, sepia: 0 },
      shape: {
        type: shapeType,
        fillColor: '#00f2fe',
        fillOpacity: 0.85,
        borderColor: '#ffffff',
        borderWidth: 2,
      },
      keyframes: [],
    });

    saveProjectToDB();
    onClose();
  };

  const handleAddSticker = (icon: string, name: string) => {
    pushHistory();
    let graphicsTrack = tracks.find((t) => t.name === 'Graphics Track' || t.type === 'text');
    let trackId = graphicsTrack?.id || addTrack('text', 'Graphics Track');

    addClipToTrack(trackId, {
      name: `Sticker: ${name}`,
      type: 'sticker',
      startTime: currentTime,
      duration: 4.0,
      mediaOffset: 0,
      sourceDuration: 4.0,
      src: '',
      speed: 1,
      transform: { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0 },
      filter: { brightness: 100, contrast: 100, saturation: 100, blur: 0, hueRotate: 0, sepia: 0 },
      sticker: {
        icon,
      },
      keyframes: [],
    });

    saveProjectToDB();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <Shapes className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-100">Stickers, Shapes & Graphics Library</h3>
            <p className="text-xs text-gray-400">Add vector shapes, stickers, and emojis directly onto canvas at playhead</p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center space-x-2 border-b border-dark-700 pb-3 mb-4">
          <button
            onClick={() => setActiveTab('shapes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'shapes'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-dark-800 text-gray-400 border border-dark-700 hover:text-white'
            }`}
          >
            <Shapes className="w-3.5 h-3.5" />
            <span>Vector Shapes</span>
          </button>

          <button
            onClick={() => setActiveTab('stickers')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'stickers'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-dark-800 text-gray-400 border border-dark-700 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Stickers</span>
          </button>

          <button
            onClick={() => setActiveTab('emoji')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'emoji'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-dark-800 text-gray-400 border border-dark-700 hover:text-white'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Emojis</span>
          </button>
        </div>

        {/* Shapes Tab Content */}
        {activeTab === 'shapes' && (
          <div className="grid grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1">
            {SHAPES_LIST.map((shape) => (
              <button
                key={shape.id}
                onClick={() => handleAddShape(shape.id, shape.name)}
                className="flex flex-col items-center justify-center p-3 bg-dark-800 hover:bg-dark-700/80 border border-dark-700 hover:border-cyan-500/50 rounded-xl transition text-center group"
              >
                <span className="text-2xl mb-1 group-hover:scale-110 transition transform">{shape.icon}</span>
                <span className="text-[10px] font-semibold text-gray-300 truncate w-full">{shape.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Stickers Tab Content */}
        {activeTab === 'stickers' && (
          <div className="grid grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1">
            {STICKERS_LIST.map((sticker, idx) => (
              <button
                key={idx}
                onClick={() => handleAddSticker(sticker.icon, sticker.name)}
                className="flex flex-col items-center justify-center p-3 bg-dark-800 hover:bg-dark-700/80 border border-dark-700 hover:border-cyan-500/50 rounded-xl transition text-center group"
              >
                <span className="text-2xl mb-1 group-hover:scale-110 transition transform">{sticker.icon}</span>
                <span className="text-[10px] font-semibold text-gray-300 truncate w-full">{sticker.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Emoji Tab Content */}
        {activeTab === 'emoji' && (
          <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto pr-1">
            {EMOJIS_LIST.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => handleAddSticker(emoji, 'Emoji')}
                className="p-2.5 bg-dark-800 hover:bg-dark-700/80 border border-dark-700 hover:border-cyan-500/50 rounded-xl text-2xl text-center transition transform hover:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
