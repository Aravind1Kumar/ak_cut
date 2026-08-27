import {
  saveUserPresetToIndexedDB,
  getUserPresetsFromIndexedDB,
  deleteUserPresetFromIndexedDB,
} from './projectPersistence';

export type PresetType = 'text' | 'caption' | 'filter' | 'effect' | 'graphic' | 'animation' | 'audio' | 'export';

export interface CreatorPreset {
  id: string;
  name: string;
  type: PresetType;
  isBuiltIn?: boolean;
  data: Record<string, any>;
  createdAt: number;
}

export const BUILTIN_PRESETS: CreatorPreset[] = [
  // Text Presets
  {
    id: 'text-minimal',
    name: 'Minimal Clean',
    type: 'text',
    isBuiltIn: true,
    createdAt: 0,
    data: {
      fontFamily: 'Inter',
      fontSize: 32,
      color: '#ffffff',
      backgroundColor: 'transparent',
      borderColor: '#000000',
      borderWidth: 0,
      bold: false,
      italic: false,
      alignment: 'center',
    },
  },
  {
    id: 'text-bold',
    name: 'Bold Headline',
    type: 'text',
    isBuiltIn: true,
    createdAt: 0,
    data: {
      fontFamily: 'Impact',
      fontSize: 48,
      color: '#00f2fe',
      backgroundColor: '#000000',
      borderColor: '#ffffff',
      borderWidth: 3,
      bold: true,
      italic: false,
      alignment: 'center',
    },
  },
  {
    id: 'text-social',
    name: 'Social Creator',
    type: 'text',
    isBuiltIn: true,
    createdAt: 0,
    data: {
      fontFamily: 'Montserrat',
      fontSize: 40,
      color: '#ff0055',
      backgroundColor: 'transparent',
      borderColor: '#ffffff',
      borderWidth: 2,
      bold: true,
      italic: false,
      alignment: 'center',
    },
  },

  // Audio Presets
  {
    id: 'audio-voice-clear',
    name: 'Voice Clear Boost',
    type: 'audio',
    isBuiltIn: true,
    createdAt: 0,
    data: {
      volume: 1.3,
      fadeIn: 0.2,
      fadeOut: 0.2,
      pan: 0,
      ducking: { enabled: false, duckingAmount: 50 },
    },
  },
  {
    id: 'audio-music-duck',
    name: 'Background Music Ducking',
    type: 'audio',
    isBuiltIn: true,
    createdAt: 0,
    data: {
      volume: 0.6,
      fadeIn: 1.0,
      fadeOut: 1.5,
      pan: 0,
      ducking: { enabled: true, duckingAmount: 60 },
    },
  },

  // Animation Presets
  {
    id: 'anim-fade',
    name: 'Fade In / Out',
    type: 'animation',
    isBuiltIn: true,
    createdAt: 0,
    data: {
      fadeInDuration: 0.5,
      fadeOutDuration: 0.5,
    },
  },
  {
    id: 'anim-pop',
    name: 'Pop Scale In',
    type: 'animation',
    isBuiltIn: true,
    createdAt: 0,
    data: {
      scaleFrom: 0.2,
      scaleTo: 1.0,
      duration: 0.3,
    },
  },
];

export async function getUserPresetsFromDB(): Promise<CreatorPreset[]> {
  try {
    return (await getUserPresetsFromIndexedDB()) as CreatorPreset[];
  } catch (e) {
    console.warn('Failed to load user presets from IndexedDB:', e);
    return [];
  }
}

export async function saveUserPresetToDB(preset: CreatorPreset): Promise<void> {
  try {
    await saveUserPresetToIndexedDB(preset);
  } catch (e) {
    console.warn('Failed to save user preset to IndexedDB:', e);
  }
}

export async function deleteUserPresetFromDB(presetId: string): Promise<void> {
  try {
    await deleteUserPresetFromIndexedDB(presetId);
  } catch (e) {
    console.warn('Failed to delete user preset from IndexedDB:', e);
  }
}
