export type MediaType = 'video' | 'audio' | 'text' | 'image';

export interface TransformProps {
  x: number;       // Percentage offset (-50 to +50)
  y: number;       // Percentage offset (-50 to +50)
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
  animation?: 'none' | 'fadeIn' | 'typewriter' | 'bounce';
}

export type TransitionType =
  | 'none'
  | 'fade'
  | 'dissolve'
  | 'wipe'
  | 'zoom'
  | 'flash'
  | 'glitch'
  | 'spin'
  | 'slide'
  | 'blur';

export interface TransitionProps {
  type: TransitionType;
  duration: number; // seconds
}

export interface ChromaKeyProps {
  enabled: boolean;
  color: string; // Hex e.g. #00ff00
  threshold: number; // 0 - 100
  smoothness: number; // 0 - 100
}

export type MaskType = 'none' | 'circle' | 'rectangle' | 'splitLeft' | 'splitRight' | 'pen';

export interface Point2D {
  x: number; // percentage (-50 to +50)
  y: number; // percentage (-50 to +50)
}

export interface MaskProps {
  type: MaskType;
  feather: number; // px
  points?: Point2D[]; // Custom Pen Tool polygon points
}

export type SpeedCurveType = 'flat' | 'hero' | 'montage' | 'bulletTime' | 'flashOut';

export interface Keyframe {
  id: string;
  time: number; // relative to clip start (seconds)
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

  // Speed multiplier & curve
  speed: number;
  speedCurve: SpeedCurveType;

  // Clip properties
  transform: TransformProps;
  filter: FilterProps;
  audio: AudioProps;
  text?: TextProps;
  transition?: TransitionProps;
  chromaKey?: ChromaKeyProps;
  mask?: MaskProps;
  keyframes: Keyframe[];

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

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  src: string;
  duration: number;
  size: string;
  createdAt: number;
  inPoint?: number;  // Source Monitor In Cut Point
  outPoint?: number; // Source Monitor Out Cut Point
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '21:9';
