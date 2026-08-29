import React, { useState } from 'react';
import { Sparkles, FolderOpen, Type, Music, Download, Check, X, ChevronRight, ChevronLeft } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: 'Welcome to AK Cut Creator Studio',
    subtitle: 'A modern, professional multitrack video editing platform designed for video creators.',
    icon: Sparkles,
    color: 'from-cyan-500 to-purple-600',
    description: 'Create social videos, YouTube titles, shorts, and reels with professional typography, keyframe animations, audio normalization, and WASM MP4 export.',
  },
  {
    title: '1. Import & Organize Media',
    subtitle: 'Upload videos, images, and audio tracks directly into your project media library.',
    icon: FolderOpen,
    color: 'from-green-500 to-emerald-600',
    description: 'Drag & drop media files into the Left Creator Rail under the Media tab, or browse sample assets to start building immediately.',
  },
  {
    title: '2. Professional Text & Typography',
    subtitle: 'Add titles, auto-captions, lower thirds, and styled text overlays.',
    icon: Type,
    color: 'from-cyan-400 to-blue-600',
    description: 'Use the 6-Tab Text Editor (Content, Typography, Style, Effects, Animation, Presets) or click text directly on the canvas frame to style in real time.',
  },
  {
    title: '3. Audio Gain & Offline MP4 Export',
    subtitle: 'Normalize audio levels to 0 dBFS and export high-resolution MP4 videos.',
    icon: Download,
    color: 'from-purple-500 to-pink-600',
    description: 'Click Export in the header to render offline H.264 MP4 videos directly in your browser or Capacitor mobile app.',
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = STEPS[currentStepIndex];
  const StepIcon = currentStep.icon;

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 select-none">
      <div className="bg-dark-900 border border-dark-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-xl hover:bg-dark-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step Header */}
        <div className="flex items-center space-x-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${currentStep.color} flex items-center justify-center text-white shadow-xl shrink-0`}>
            <StepIcon className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest block mb-0.5">
              STEP {currentStepIndex + 1} OF {STEPS.length}
            </span>
            <h3 className="text-base font-extrabold text-white leading-tight">{currentStep.title}</h3>
          </div>
        </div>

        {/* Body Content */}
        <div className="space-y-2 bg-dark-950 p-4 rounded-2xl border border-dark-800">
          <h4 className="text-xs font-bold text-cyan-300">{currentStep.subtitle}</h4>
          <p className="text-xs text-gray-400 leading-relaxed">{currentStep.description}</p>
        </div>

        {/* Step Indicator Dots & Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-dark-800">
          <div className="flex items-center space-x-1.5">
            {STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStepIndex ? 'w-6 bg-cyan-400' : 'w-2 bg-dark-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {currentStepIndex > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-gray-300 text-xs font-bold rounded-xl transition flex items-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-extrabold rounded-xl transition flex items-center space-x-1 shadow-lg shadow-cyan-500/20"
            >
              <span>{currentStepIndex === STEPS.length - 1 ? 'Start Creating' : 'Next'}</span>
              {currentStepIndex === STEPS.length - 1 ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
