import { FilterProps } from '../types/timeline';

export interface FilterPreset {
  id: string;
  name: string;
  props: Partial<FilterProps>;
}

export const FILTER_PRESETS: Record<string, FilterPreset> = {
  original: {
    id: 'original',
    name: 'Original',
    props: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      hueRotate: 0,
      sepia: 0,
      exposure: 0,
      temperature: 0,
      tint: 0,
      fade: 0,
    },
  },
  warm: {
    id: 'warm',
    name: 'Warm Sun',
    props: {
      temperature: 40,
      saturation: 115,
      exposure: 5,
    },
  },
  cool: {
    id: 'cool',
    name: 'Cool Breeze',
    props: {
      temperature: -40,
      saturation: 95,
      tint: -10,
    },
  },
  vintage: {
    id: 'vintage',
    name: 'Vintage Film',
    props: {
      sepia: 30,
      contrast: 90,
      temperature: 20,
      fade: 20,
    },
  },
  cinematic: {
    id: 'cinematic',
    name: 'Cinematic',
    props: {
      contrast: 120,
      saturation: 85,
      temperature: -10,
      exposure: 10,
    },
  },
  bw: {
    id: 'bw',
    name: 'B & W',
    props: {
      saturation: 0,
      contrast: 115,
    },
  },
  fade: {
    id: 'fade',
    name: 'Faded Dream',
    props: {
      contrast: 85,
      brightness: 110,
      fade: 30,
    },
  },
  vivid: {
    id: 'vivid',
    name: 'Vivid Color',
    props: {
      saturation: 140,
      contrast: 110,
    },
  },
  muted: {
    id: 'muted',
    name: 'Muted Tones',
    props: {
      saturation: 60,
      contrast: 95,
    },
  },
  highContrast: {
    id: 'highContrast',
    name: 'High Contrast',
    props: {
      contrast: 150,
      brightness: 105,
    },
  },
};

export function getEffectiveFilterProps(filter: FilterProps): FilterProps {
  if (filter.enabled === false) {
    return {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      hueRotate: 0,
      sepia: 0,
      exposure: 0,
      temperature: 0,
      tint: 0,
      highlights: 0,
      shadows: 0,
      fade: 0,
      sharpen: 0,
      vignette: 0,
      glow: 0,
      colorShift: 0,
    };
  }

  let effective: FilterProps = { ...filter };

  const presetKey = filter.presetKey || 'original';
  const intensity = filter.presetIntensity !== undefined ? Math.max(0, Math.min(100, filter.presetIntensity)) : 100;

  if (presetKey !== 'original' && FILTER_PRESETS[presetKey]) {
    const presetProps = FILTER_PRESETS[presetKey].props;
    const factor = intensity / 100;

    if (presetProps.brightness !== undefined) {
      effective.brightness = 100 + (presetProps.brightness - 100) * factor;
    }
    if (presetProps.contrast !== undefined) {
      effective.contrast = 100 + (presetProps.contrast - 100) * factor;
    }
    if (presetProps.saturation !== undefined) {
      effective.saturation = 100 + (presetProps.saturation - 100) * factor;
    }
    if (presetProps.sepia !== undefined) {
      effective.sepia = (filter.sepia || 0) + (presetProps.sepia - (filter.sepia || 0)) * factor;
    }
    if (presetProps.temperature !== undefined) {
      effective.temperature = (filter.temperature || 0) + (presetProps.temperature - (filter.temperature || 0)) * factor;
    }
    if (presetProps.tint !== undefined) {
      effective.tint = (filter.tint || 0) + (presetProps.tint - (filter.tint || 0)) * factor;
    }
    if (presetProps.exposure !== undefined) {
      effective.exposure = (filter.exposure || 0) + (presetProps.exposure - (filter.exposure || 0)) * factor;
    }
    if (presetProps.fade !== undefined) {
      effective.fade = (filter.fade || 0) + (presetProps.fade - (filter.fade || 0)) * factor;
    }
  }

  return effective;
}

export function buildCSSFilterString(filter: FilterProps): string {
  const f = getEffectiveFilterProps(filter);

  const expBrightness = Math.max(0, f.brightness + (f.exposure || 0) + (f.fade || 0) * 0.3);
  const adjContrast = Math.max(0, f.contrast - (f.fade || 0) * 0.2);
  const tempHue = f.hueRotate + (f.temperature || 0) * 0.5 + (f.tint || 0) * 0.5 + (f.colorShift || 0);
  const totalBlur = Math.max(0, (f.blur || 0));

  return `brightness(${expBrightness}%) contrast(${adjContrast}%) saturate(${f.saturation}%) blur(${totalBlur}px) hue-rotate(${tempHue}deg) sepia(${f.sepia}%)`;
}

export function renderPostProcessingEffects(
  ctx: CanvasRenderingContext2D,
  filter: FilterProps,
  width: number,
  height: number
) {
  const f = getEffectiveFilterProps(filter);

  // 1. Vignette Effect
  if (f.vignette && f.vignette > 0) {
    ctx.save();
    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.sqrt(cx * cx + cy * cy);
    const vignetteAmount = Math.min(1.0, f.vignette / 100);

    const grad = ctx.createRadialGradient(cx, cy, maxRadius * 0.4, cx, cy, maxRadius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, `rgba(0, 0, 0, ${vignetteAmount * 0.85})`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 2. Glow Effect
  if (f.glow && f.glow > 0) {
    ctx.save();
    const glowAmount = Math.min(1.0, f.glow / 100);
    const cx = width / 2;
    const cy = height / 2;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, width * 0.5);
    grad.addColorStop(0, `rgba(255, 255, 255, ${glowAmount * 0.25})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
