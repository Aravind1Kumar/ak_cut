import { Clip, TextProps } from '../types/timeline';

export const TEXT_PRESETS: Record<
  string,
  { name: string; style: Partial<TextProps> }
> = {
  title: {
    name: 'TITLE',
    style: {
      fontFamily: 'Poppins, sans-serif',
      fontSize: 72,
      color: '#ffffff',
      bold: true,
      italic: false,
      alignment: 'center',
      backgroundEnabled: false,
      outlineEnabled: true,
      outlineColor: '#000000',
      outlineWidth: 4,
      shadowEnabled: true,
      shadowColor: 'rgba(0,0,0,0.8)',
      shadowBlur: 16,
      shadowOffsetX: 0,
      shadowOffsetY: 8,
    },
  },
  subtitle: {
    name: 'SUBTITLE',
    style: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 42,
      color: '#00f2fe',
      bold: true,
      italic: false,
      alignment: 'center',
      backgroundEnabled: true,
      backgroundColor: '#000000',
      backgroundOpacity: 0.75,
      backgroundPadding: 12,
      borderRadius: 8,
      outlineEnabled: false,
      shadowEnabled: false,
    },
  },
  lowerThird: {
    name: 'LOWER THIRD',
    style: {
      fontFamily: 'Roboto, sans-serif',
      fontSize: 36,
      color: '#ffffff',
      bold: true,
      italic: false,
      alignment: 'left',
      verticalAlignment: 'bottom',
      backgroundEnabled: true,
      backgroundColor: '#111827',
      backgroundOpacity: 0.9,
      backgroundPadding: 16,
      borderRadius: 4,
      outlineEnabled: false,
      shadowEnabled: true,
      shadowColor: 'rgba(0,0,0,0.5)',
      shadowBlur: 10,
      shadowOffsetX: 4,
      shadowOffsetY: 4,
    },
  },
  socialHeadline: {
    name: 'SOCIAL HEADLINE',
    style: {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 54,
      color: '#facc15',
      bold: true,
      italic: false,
      alignment: 'center',
      backgroundEnabled: true,
      backgroundColor: '#000000',
      backgroundOpacity: 0.85,
      backgroundPadding: 14,
      borderRadius: 12,
      outlineEnabled: true,
      outlineColor: '#000000',
      outlineWidth: 3,
      shadowEnabled: true,
      shadowColor: 'rgba(0,0,0,0.9)',
      shadowBlur: 12,
      shadowOffsetX: 0,
      shadowOffsetY: 6,
    },
  },
  boldImpact: {
    name: 'BOLD IMPACT',
    style: {
      fontFamily: 'Impact, sans-serif',
      fontSize: 84,
      color: '#ffffff',
      bold: true,
      italic: false,
      alignment: 'center',
      backgroundEnabled: false,
      outlineEnabled: true,
      outlineColor: '#000000',
      outlineWidth: 6,
      shadowEnabled: true,
      shadowColor: 'rgba(0,0,0,0.9)',
      shadowBlur: 20,
      shadowOffsetX: 0,
      shadowOffsetY: 10,
    },
  },
  minimal: {
    name: 'MINIMAL',
    style: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 36,
      color: '#e5e7eb',
      bold: false,
      italic: false,
      alignment: 'center',
      backgroundEnabled: false,
      outlineEnabled: false,
      shadowEnabled: false,
    },
  },
  neon: {
    name: 'NEON',
    style: {
      fontFamily: 'Poppins, sans-serif',
      fontSize: 64,
      color: '#38bdf8',
      bold: true,
      italic: false,
      alignment: 'center',
      backgroundEnabled: false,
      outlineEnabled: true,
      outlineColor: '#0284c7',
      outlineWidth: 2,
      shadowEnabled: true,
      shadowColor: '#38bdf8',
      shadowBlur: 25,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    },
  },
  outline: {
    name: 'OUTLINE',
    style: {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 60,
      color: '#ffffff',
      bold: true,
      italic: false,
      alignment: 'center',
      backgroundEnabled: false,
      outlineEnabled: true,
      outlineColor: '#ef4444',
      outlineWidth: 5,
      shadowEnabled: false,
    },
  },
};

export function renderTextClipOnCanvas(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  relativeTime: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  const text = clip.text;
  if (!text || !text.content) return;

  ctx.save();

  // Animation evaluation
  let animOpacity = 1.0;
  let animScaleX = 1.0;
  let animScaleY = 1.0;
  let animOffsetX = 0;
  let animOffsetY = 0;

  const animDuration = 0.5;
  const progress = Math.min(1.0, Math.max(0.0, relativeTime / animDuration));

  if (text.animation === 'fadeIn') {
    animOpacity = progress;
  } else if (text.animation === 'fadeOut') {
    const endProgress = Math.min(1.0, Math.max(0.0, (clip.duration - relativeTime) / animDuration));
    animOpacity = endProgress;
  } else if (text.animation === 'pop' || text.animation === 'scaleIn') {
    animOpacity = progress;
    animScaleX = 0.3 + 0.7 * progress;
    animScaleY = 0.3 + 0.7 * progress;
  } else if (text.animation === 'scaleOut') {
    const endProgress = Math.min(1.0, Math.max(0.0, (clip.duration - relativeTime) / animDuration));
    animOpacity = endProgress;
    animScaleX = 0.3 + 0.7 * endProgress;
    animScaleY = 0.3 + 0.7 * endProgress;
  } else if (text.animation === 'slideLeft') {
    animOpacity = progress;
    animOffsetX = (1 - progress) * 100;
  } else if (text.animation === 'slideRight') {
    animOpacity = progress;
    animOffsetX = -(1 - progress) * 100;
  } else if (text.animation === 'slideUp') {
    animOpacity = progress;
    animOffsetY = (1 - progress) * 80;
  } else if (text.animation === 'slideDown') {
    animOpacity = progress;
    animOffsetY = -(1 - progress) * 80;
  } else if (text.animation === 'typewriter') {
    const totalChars = text.content.length;
    const charsToShow = Math.floor(progress * totalChars);
    if (charsToShow < totalChars) {
      // Modify text temporarily for typewriter
      text.content = text.content.substring(0, charsToShow);
    }
  } else if (text.animation === 'bounce') {
    animOffsetY = Math.sin(progress * Math.PI) * -30;
  }

  ctx.globalAlpha = ctx.globalAlpha * animOpacity;
  ctx.translate(animOffsetX, animOffsetY);
  ctx.scale(animScaleX, animScaleY);

  const fontSize = text.fontSize || 44;
  const fontFamily = text.fontFamily || 'Inter, sans-serif';
  const fontStyle = `${text.italic ? 'italic ' : ''}${text.bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
  ctx.font = fontStyle;

  if (text.letterSpacing && (ctx as any).letterSpacing !== undefined) {
    (ctx as any).letterSpacing = `${text.letterSpacing}px`;
  }

  const lines = text.content.split('\n');
  const lineHeight = (text.lineHeight || 1.2) * fontSize;

  // Measure text bounding box
  let maxLineWidth = 0;
  lines.forEach((line) => {
    const m = ctx.measureText(line);
    if (m.width > maxLineWidth) {
      maxLineWidth = m.width;
    }
  });

  const totalTextHeight = lines.length * lineHeight;
  const padding = text.backgroundPadding ?? 16;
  const bgWidth = maxLineWidth + padding * 2;
  const bgHeight = totalTextHeight + padding * 2;

  // Background Box
  const isBgEnabled = text.backgroundEnabled ?? (text.backgroundColor && text.backgroundColor !== 'transparent');
  if (isBgEnabled && text.backgroundColor) {
    ctx.save();
    ctx.fillStyle = text.backgroundColor;
    ctx.globalAlpha = ctx.globalAlpha * (text.backgroundOpacity ?? 0.8);

    const bgX = -bgWidth / 2;
    const bgY = -bgHeight / 2;
    const radius = text.borderRadius || 8;

    ctx.beginPath();
    ctx.roundRect(bgX, bgY, bgWidth, bgHeight, radius);
    ctx.fill();
    ctx.restore();
  }

  // Text Shadow
  if (text.shadowEnabled) {
    ctx.shadowColor = text.shadowColor || 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = text.shadowBlur ?? 10;
    ctx.shadowOffsetX = text.shadowOffsetX ?? 2;
    ctx.shadowOffsetY = text.shadowOffsetY ?? 4;
  } else {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  // Render text lines
  ctx.textAlign = text.alignment || 'center';
  ctx.textBaseline = 'middle';

  const startY = -((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, idx) => {
    const lineY = startY + idx * lineHeight;

    // Stroke / Outline
    const isOutlineEnabled = text.outlineEnabled ?? (text.borderWidth && text.borderWidth > 0);
    if (isOutlineEnabled) {
      ctx.strokeStyle = text.outlineColor || text.borderColor || '#000000';
      ctx.lineWidth = (text.outlineWidth || text.borderWidth || 2) * 2;
      ctx.lineJoin = 'round';
      ctx.strokeText(line, 0, lineY);
    }

    // Fill Text
    ctx.fillStyle = text.color || '#ffffff';
    ctx.fillText(line, 0, lineY);

    // Underline
    if (text.underline) {
      ctx.save();
      const m = ctx.measureText(line);
      ctx.strokeStyle = text.color || '#ffffff';
      ctx.lineWidth = Math.max(2, fontSize / 20);

      let lineStartX = -m.width / 2;
      if (text.alignment === 'left') lineStartX = 0;
      else if (text.alignment === 'right') lineStartX = -m.width;

      const underlineY = lineY + fontSize * 0.4;
      ctx.beginPath();
      ctx.moveTo(lineStartX, underlineY);
      ctx.lineTo(lineStartX + m.width, underlineY);
      ctx.stroke();
      ctx.restore();
    }
  });

  ctx.restore();
}
