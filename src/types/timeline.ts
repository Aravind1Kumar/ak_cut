export type MediaType = 'video' | 'audio' | 'text' | 'image';

export interface TransformProps {
  x: number;       // Percentage or pixels offset
  y: number;
  scale: number;   // 1.0 = 100%
  rotation: number; // degrees
  opacity: number; // 0.0 - 1.0
}

export interface FilterProps {
  brightness: number; // 100% standard
  contrast: number;   // 100% standard
  saturation: number; // 100% standard
  blur: number;       // px
  hueRotate: number;  // deg
  sepia: number;      // %
}

export interface AudioProps {
  volume: number;     // 0.0 - 2.0 (1.0 = 100%)
  fadeIn: number;     // duration in seconds
  fadeOut: number;    // duration in seconds
  muted: boolean;
}

export interface TextProps {
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  alignment: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
}

export interface Keyframe {
  id: string;
  time: number; // relative to clip start
  transform: Partial<TransformProps>;
  filter?: Partial<FilterProps>;
}

export interface Clip {
  id: string;
  trackId: string;
  name: string;
  type: MediaType;
  startTime: number;    // Position in timeline (seconds)
  duration: number;     // Clip duration on timeline (seconds)
  mediaOffset: number;  // Start offset in source media (seconds)
  sourceDuration: number; // Total length of source media
  src: string;          // ObjectURL or blob URL

  // Speed multiplier (e.g. 1.0, 2.0, 0.5)
  speed: number;

  // Clip properties
  transform: TransformProps;
  filter: FilterProps;
  audio: AudioProps;
  text?: TextProps;
  keyframes: Keyframe[];

  // Waveform or thumbnail cache
  thumbnailUrl?: string;
}

export interface Track {
  id: string;
  name: string;
  type: MediaType;
  muted: boolean;
  locked: boolean;
  hidden: boolean;
  clips: Clip[];
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '21:9';
