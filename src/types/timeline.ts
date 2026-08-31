export type MediaType = 'video' | 'audio' | 'text' | 'image' | 'caption' | 'shape' | 'sticker';

export type SpeedCurveType = 'flat' | 'hero' | 'montage' | 'bulletTime' | 'flashOut';

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';

export interface TransformProps {
  x: number;       // Percentage offset (-50 to +50)
  y: number;       // Percentage offset (-50 to +50)
  scale: number;   // 1.0 = 100%
  rotation: number; // degrees
  opacity: number; // 0.0 - 1.0
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  cropTop?: number;    // % 0..50
  cropBottom?: number; // % 0..50
  cropLeft?: number;   // % 0..50
  cropRight?: number;  // % 0..50
  blendMode?: BlendMode;
}

export interface FilterProps {
  brightness: number;  // 100% standard
  contrast: number;    // 100% standard
  saturation: number;  // 100% standard
  blur: number;        // px
  hueRotate: number;   // deg
  sepia: number;       // %
  exposure?: number;   // -100 to +100
  temperature?: number; // -100 to +100 (cool to warm)
  tint?: number;       // -100 to +100 (green to magenta)
  highlights?: number; // -100 to +100
  shadows?: number;    // -100 to +100
  fade?: number;       // 0 to 100%
  sharpen?: number;    // 0 to 100%
  vignette?: number;   // 0 to 100%
  glow?: number;       // 0 to 100%
  colorShift?: number; // 0 to 360 deg
  presetKey?: string;  // e.g. 'warm', 'cool', 'cinematic'
  presetIntensity?: number; // 0 to 100%
  enabled?: boolean;
}

export interface DuckingProps {
  enabled: boolean;
  targetTrackId?: string;
  duckingAmount: number; // 0 to 100% reduction
}

export interface AudioProps {
  volume: number;     // 0.0 - 2.0 (1.0 = 100%)
  fadeIn: number;     // duration in seconds
  fadeOut: number;    // duration in seconds
  muted: boolean;
  pan?: number;       // -100 (left) to +100 (right)
  lowPass?: number;   // cutoff Hz (e.g. 200 - 20000)
  highPass?: number;  // cutoff Hz (e.g. 20 - 5000)
  ducking?: DuckingProps;
}

export type TextAnimationType =
  | 'none'
  | 'fadeIn'
  | 'fadeOut'
  | 'pop'
  | 'scaleIn'
  | 'scaleOut'
  | 'slideLeft'
  | 'slideRight'
  | 'slideUp'
  | 'slideDown'
  | 'typewriter'
  | 'bounce';

export type TextTransformType = 'none' | 'uppercase' | 'lowercase' | 'titlecase';
export type TextFillType = 'solid' | 'gradient';
export type TextBackgroundPreset = 'none' | 'solid' | 'rounded' | 'pill' | 'highlight' | 'label';
export type TextOutlinePreset = 'none' | 'thin' | 'medium' | 'heavy';
export type TextShadowPreset = 'none' | 'soft' | 'hard' | 'glow' | 'longShadow';
export type TextGlowPreset = 'none' | 'cyan' | 'blue' | 'purple' | 'pink' | 'white';

export interface TextProps {
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  alignment: 'left' | 'center' | 'right' | 'justify';
  verticalAlignment?: 'top' | 'center' | 'bottom';
  bold: boolean;
  italic: boolean;
  fontWeight?: '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | 'normal' | 'bold';
  underline?: boolean;

  strikethrough?: boolean;
  textTransform?: TextTransformType;
  fillType?: TextFillType;
  gradientColorStop2?: string;
  gradientAngle?: number;    // 0 to 360 deg
  letterSpacing?: number;    // -20 to +50 px
  lineHeight?: number;       // 0.5 to 3.0
  textOpacity?: number;      // 0.0 - 1.0
  backgroundEnabled?: boolean;

  backgroundColor2?: string;
  backgroundOpacity?: number; // 0.0 - 1.0
  backgroundPadding?: number; // px
  borderRadius?: number;      // px
  backgroundPreset?: TextBackgroundPreset;
  outlineEnabled?: boolean;
  outlineColor?: string;
  outlineWidth?: number;      // 0 - 20 px
  outlinePreset?: TextOutlinePreset;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowOpacity?: number;     // 0.0 - 1.0
  shadowBlur?: number;        // 0 - 50 px
  shadowOffsetX?: number;     // -50 to +50 px
  shadowOffsetY?: number;     // -50 to +50 px
  shadowPreset?: TextShadowPreset;
  glowEnabled?: boolean;
  glowColor?: string;
  glowBlur?: number;          // 0 - 60 px
  glowIntensity?: number;     // 0.0 - 1.0
  glowPreset?: TextGlowPreset;
  boxWidthMode?: 'auto' | 'fixed';
  boxWidth?: number;          // px
  animation?: TextAnimationType;
  presetKey?: string;
  arcAngle?: number;          // -180 to +180 deg (0 = straight)
}

export type ShapeType =
  | 'rectangle'
  | 'roundedRectangle'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'triangle'
  | 'arrow'
  | 'star'
  | 'polygon'
  | 'heart'
  | 'diamond'
  | 'hexagon'
  | 'pentagon';

export interface ShapeProps {
  type: ShapeType;
  fillColor: string;
  fillOpacity: number;
  borderColor: string;
  borderWidth: number;
  strokeOpacity?: number;
  cornerRadius?: number;
  gradientFillEnabled?: boolean;
  gradientColor2?: string;
  gradientAngle?: number;
  width?: number;
  height?: number;
  animation?: 'none' | 'fadeIn' | 'scaleIn' | 'slideLeft' | 'slideRight';
}

export interface StickerProps {
  icon: string; // symbol or emoji string
  color?: string;
  animation?: 'none' | 'fadeIn' | 'pop' | 'bounce';
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '4:3' | '21:9';

export type MediaAssetType = 'video' | 'audio' | 'image';

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaAssetType;
  src: string;
  duration: number; // in seconds
  size: number;     // bytes
  width?: number;
  height?: number;
  inPoint?: number;
  outPoint?: number;
  createdAt: number;
}

export type TransitionType =
  | 'none'
  | 'fade'
  | 'dissolve'
  | 'wipe'
  | 'slideLeft'
  | 'slideRight'
  | 'zoom'
  | 'flash'
  | 'glitch'
  | 'spin'
  | 'blur';

export interface TransitionProps {
  type: TransitionType;
  duration: number; // seconds
}

export type KeyframeEasing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

export interface Keyframe {
  id: string;
  time: number; // relative to clip start (seconds)
  transform: Partial<TransformProps>;
  filter?: Partial<FilterProps>;
  audio?: Partial<AudioProps>;
  text?: Partial<TextProps>;
  easing?: KeyframeEasing;
}

export interface ChromaKeyProps {
  enabled: boolean;
  targetColor: string; // hex e.g. '#00ff00'
  color?: string;      // color alias
  colorDistance: number; // 0.0 - 1.0 (similarity tolerance)
  smoothness: number;    // 0.0 - 1.0 (feather edge softness)
  spillReduction?: number; // 0.0 - 1.0 (green/blue spill cleanup)
}

export type MaskType = 'none' | 'rectangle' | 'circle' | 'line' | 'linearGradient' | 'radialGradient';

export interface MaskProps {
  type: MaskType;
  x: number;      // percentage offset (-50 to +50)
  y: number;      // percentage offset (-50 to +50)
  width: number;  // percentage (10 to 100)
  height: number; // percentage (10 to 100)
  rotation: number; // degrees
  feather: number;  // pixels blur
  inverted?: boolean;
  opacity?: number;
}

export interface TimelineMarker {
  id: string;
  time: number;
  label: string;
  color: string;
}

export interface CaptionWord {
  id: string;
  word: string;
  text?: string;
  startTime: number;
  endTime: number;
}

export interface CaptionSegment {
  id: string;
  trackId: string;
  startTime: number;
  endTime: number;
  text: string;
  words?: CaptionWord[];
  styleId?: string;
}

export interface CaptionStyle {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  color: string;
  outlineColor: string;
  outlineWidth: number;
  shadow: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  background: string;
  backgroundOpacity?: number;
  backgroundPadding?: number;
  borderRadius?: number;
  alignment: 'left' | 'center' | 'right';
  position?: 'top' | 'center' | 'bottom';
  highlightColor: string;
  animation?: 'none' | 'fadeIn' | 'pop' | 'slideUp' | 'typewriter';
  animationDuration?: number;
  activeWordScale?: number;
}

export interface CaptionTrackData {
  id: string;
  name: string;
  language: string;
  segments: CaptionSegment[];
}

export interface CaptionProps {
  text: string;
  stylePreset: 'classic' | 'bold' | 'news' | 'social' | 'minimal' | 'karaoke' | 'impact' | 'subtitle' | 'creator';
  speaker?: string;
  words?: CaptionWord[];
  segment?: CaptionSegment;
  customStyle?: CaptionStyle;
}

export interface Clip {
  id: string;
  assetId?: string;
  trackId: string;
  name: string;
  type: MediaType;
  startTime: number;
  duration: number;
  mediaOffset: number;
  sourceDuration: number;
  src: string;
  speed: number;
  speedCurve?: SpeedCurveType;
  groupId?: string;

  transform: TransformProps;
  filter: FilterProps;
  audio: AudioProps;
  text?: TextProps;
  caption?: CaptionProps;
  shape?: ShapeProps;
  sticker?: StickerProps;
  transition?: TransitionProps;
  chromaKey?: ChromaKeyProps;
  mask?: MaskProps;

  keyframes: Keyframe[];
}

export interface Track {
  id: string;
  name: string;
  type: MediaType;
  locked: boolean;
  hidden: boolean;
  muted: boolean;
  clips: Clip[];
}

export type LayoutMode = 'auto' | 'mobile' | 'desktop';
