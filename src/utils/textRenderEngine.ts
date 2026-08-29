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
      fillType: 'gradient',
      gradientColorStop2: '#00f2fe',
      gradientAngle: 90,
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
      backgroundOpacity: 0.8,
      backgroundPadding: 12,
      borderRadius: 16,
      backgroundPreset: 'pill',
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
      backgroundPreset: 'label',
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
      backgroundPreset: 'rounded',
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
      textTransform: 'uppercase',
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
      glowEnabled: true,
      glowColor: '#38bdf8',
      glowBlur: 30,
      glowIntensity: 1.0,
      backgroundEnabled: false,
      outlineEnabled: true,
      outlineColor: '#0284c7',
      outlineWidth: 2,
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
  breakingNews: {
    name: 'BREAKING NEWS',
    style: {
      fontFamily: 'Roboto, sans-serif',
      fontSize: 48,
      color: '#ffffff',
      bold: true,
      italic: false,
      textTransform: 'uppercase',
      alignment: 'center',
      backgroundEnabled: true,
      backgroundColor: '#dc2626',
      backgroundOpacity: 0.95,
      backgroundPadding: 16,
      borderRadius: 4,
      backgroundPreset: 'label',
      outlineEnabled: false,
    },
  },
  youtubeTitle: {
    name: 'YOUTUBE TITLE',
    style: {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 72,
      color: '#eab308',
      bold: true,
      italic: false,
      alignment: 'center',
      outlineEnabled: true,
      outlineColor: '#000000',
      outlineWidth: 6,
      shadowEnabled: true,
      shadowColor: 'rgba(0,0,0,0.9)',
      shadowBlur: 16,
      shadowOffsetX: 4,
      shadowOffsetY: 6,
    },
  },
  instagram: {
    name: 'INSTAGRAM',
    style: {
      fontFamily: 'Poppins, sans-serif',
      fontSize: 54,
      color: '#ffffff',
      bold: true,
      italic: false,
      alignment: 'center',
      backgroundEnabled: true,
      backgroundColor: '#831843',
      backgroundOpacity: 0.9,
      backgroundPadding: 14,
      borderRadius: 24,
      backgroundPreset: 'pill',
    },
  },
  tiktok: {
    name: 'TIKTOK',
    style: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 60,
      color: '#ffffff',
      bold: true,
      italic: false,
      alignment: 'center',
      outlineEnabled: true,
      outlineColor: '#000000',
      outlineWidth: 4,
      shadowEnabled: true,
      shadowColor: '#2563eb',
      shadowBlur: 12,
      shadowOffsetX: 4,
      shadowOffsetY: 4,
    },
  },
  cinematic: {
    name: 'CINEMATIC',
    style: {
      fontFamily: 'Georgia, serif',
      fontSize: 48,
      color: '#fef08a',
      bold: false,
      italic: true,
      alignment: 'center',
      letterSpacing: 4,
      shadowEnabled: true,
      shadowColor: 'rgba(0,0,0,0.8)',
      shadowBlur: 14,
      shadowOffsetX: 0,
      shadowOffsetY: 4,
    },
  },
  sports: {
    name: 'SPORTS',
    style: {
      fontFamily: 'Impact, sans-serif',
      fontSize: 76,
      color: '#fbbf24',
      bold: true,
      italic: true,
      textTransform: 'uppercase',
      alignment: 'center',
      outlineEnabled: true,
      outlineColor: '#000000',
      outlineWidth: 6,
      shadowEnabled: true,
      shadowColor: 'rgba(0,0,0,0.9)',
      shadowBlur: 10,
      shadowOffsetX: 6,
      shadowOffsetY: 6,
    },
  },
  gaming: {
    name: 'GAMING',
    style: {
      fontFamily: 'Bebas Neue, sans-serif',
      fontSize: 80,
      color: '#22c55e',
      bold: true,
      italic: false,
      textTransform: 'uppercase',
      alignment: 'center',
      glowEnabled: true,
      glowColor: '#22c55e',
      glowBlur: 35,
      glowIntensity: 1.0,
      outlineEnabled: true,
      outlineColor: '#052e16',
      outlineWidth: 3,
    },
  },
  quote: {
    name: 'QUOTE',
    style: {
      fontFamily: 'Playfair Display, serif',
      fontSize: 44,
      color: '#ffffff',
      bold: false,
      italic: true,
      alignment: 'center',
      backgroundEnabled: true,
      backgroundColor: 'rgba(0,0,0,0.6)',
      backgroundOpacity: 0.6,
      backgroundPadding: 16,
      borderRadius: 12,
    },
  },
  location: {
    name: 'LOCATION',
    style: {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 32,
      color: '#38bdf8',
      bold: true,
      italic: false,
      textTransform: 'uppercase',
      alignment: 'center',
      letterSpacing: 3,
      backgroundEnabled: true,
      backgroundColor: '#0f172a',
      backgroundOpacity: 0.9,
      backgroundPadding: 10,
      borderRadius: 20,
      backgroundPreset: 'pill',
    },
  },
  nameTag: {
    name: 'NAME TAG',
    style: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 36,
      color: '#ffffff',
      bold: true,
      italic: false,
      alignment: 'left',
      backgroundEnabled: true,
      backgroundColor: '#2563eb',
      backgroundOpacity: 0.95,
      backgroundPadding: 14,
      borderRadius: 8,
      backgroundPreset: 'label',
    },
  },
};

export function transformTextContent(text: string, transformType?: string): string {
  if (!text) return '';
  if (transformType === 'uppercase') return text.toUpperCase();
  if (transformType === 'lowercase') return text.toLowerCase();
  if (transformType === 'titlecase') {
    return text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }
  return text;
}

export function renderTextClipOnCanvas(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  relativeTime: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  const textProps = clip.text;
  if (!textProps || !textProps.content) return;

  ctx.save();

  // Animation evaluation
  let animOpacity = 1.0;
  let animScaleX = 1.0;
  let animScaleY = 1.0;
  let animOffsetX = 0;
  let animOffsetY = 0;

  const animDuration = 0.5;
  const progress = Math.min(1.0, Math.max(0.0, relativeTime / animDuration));

  if (textProps.animation === 'fadeIn') {
    animOpacity = progress;
  } else if (textProps.animation === 'fadeOut') {
    const endProgress = Math.min(1.0, Math.max(0.0, (clip.duration - relativeTime) / animDuration));
    animOpacity = endProgress;
  } else if (textProps.animation === 'pop' || textProps.animation === 'scaleIn') {
    animOpacity = progress;
    animScaleX = 0.3 + 0.7 * progress;
    animScaleY = 0.3 + 0.7 * progress;
  } else if (textProps.animation === 'scaleOut') {
    const endProgress = Math.min(1.0, Math.max(0.0, (clip.duration - relativeTime) / animDuration));
    animOpacity = endProgress;
    animScaleX = 0.3 + 0.7 * endProgress;
    animScaleY = 0.3 + 0.7 * endProgress;
  } else if (textProps.animation === 'slideLeft') {
    animOpacity = progress;
    animOffsetX = (1 - progress) * 100;
  } else if (textProps.animation === 'slideRight') {
    animOpacity = progress;
    animOffsetX = -(1 - progress) * 100;
  } else if (textProps.animation === 'slideUp') {
    animOpacity = progress;
    animOffsetY = (1 - progress) * 80;
  } else if (textProps.animation === 'slideDown') {
    animOpacity = progress;
    animOffsetY = -(1 - progress) * 80;
  } else if (textProps.animation === 'bounce') {
    animOffsetY = Math.sin(progress * Math.PI) * -30;
  }

  ctx.globalAlpha = ctx.globalAlpha * animOpacity;
  ctx.translate(animOffsetX, animOffsetY);
  ctx.scale(animScaleX, animScaleY);

  const rawContent = textProps.content;
  const transformedContent = transformTextContent(rawContent, textProps.textTransform);

  let displayContent = transformedContent;
  if (textProps.animation === 'typewriter') {
    const totalChars = transformedContent.length;
    const charsToShow = Math.floor(progress * totalChars);
    displayContent = transformedContent.substring(0, charsToShow);
  }

  const fontSize = textProps.fontSize || 48;
  const fontFamily = textProps.fontFamily || 'Inter, sans-serif';
  const weightStr = textProps.fontWeight ? `${textProps.fontWeight} ` : (textProps.bold ? 'bold ' : '');
  const fontStyle = `${textProps.italic ? 'italic ' : ''}${weightStr}${fontSize}px ${fontFamily}`;
  ctx.font = fontStyle;

  if (textProps.letterSpacing && (ctx as any).letterSpacing !== undefined) {
    (ctx as any).letterSpacing = `${textProps.letterSpacing}px`;
  }

  const lines = displayContent.split('\n');
  const lineHeight = (textProps.lineHeight || 1.2) * fontSize;

  // Measure text bounding box
  let maxLineWidth = 0;
  lines.forEach((line) => {
    const m = ctx.measureText(line);
    if (m.width > maxLineWidth) {
      maxLineWidth = m.width;
    }
  });

  const totalTextHeight = lines.length * lineHeight;
  const padding = textProps.backgroundPadding ?? 16;
  const bgWidth = maxLineWidth + padding * 2;
  const bgHeight = totalTextHeight + padding * 2;

  // Background Box Rendering
  const isBgEnabled = textProps.backgroundEnabled ?? (textProps.backgroundColor && textProps.backgroundColor !== 'transparent');
  if (isBgEnabled && textProps.backgroundColor) {
    ctx.save();
    ctx.fillStyle = textProps.backgroundColor;
    ctx.globalAlpha = ctx.globalAlpha * (textProps.backgroundOpacity ?? 0.8);

    const bgX = -bgWidth / 2;
    const bgY = -bgHeight / 2;

    let radius = textProps.borderRadius || 8;
    if (textProps.backgroundPreset === 'pill') {
      radius = Math.min(bgWidth, bgHeight) / 2;
    } else if (textProps.backgroundPreset === 'solid') {
      radius = 0;
    } else if (textProps.backgroundPreset === 'rounded') {
      radius = 12;
    }

    ctx.beginPath();
    ctx.roundRect(bgX, bgY, bgWidth, bgHeight, radius);
    ctx.fill();
    ctx.restore();
  }

  // Text Glow Effect
  if (textProps.glowEnabled) {
    ctx.shadowColor = textProps.glowColor || '#00f2fe';
    ctx.shadowBlur = textProps.glowBlur ?? 30;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  } else if (textProps.shadowEnabled) {
    ctx.shadowColor = textProps.shadowColor || 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = textProps.shadowBlur ?? 10;
    ctx.shadowOffsetX = textProps.shadowOffsetX ?? 2;
    ctx.shadowOffsetY = textProps.shadowOffsetY ?? 4;
  } else {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  // Render text lines
  let align = textProps.alignment || 'center';
  if (align === 'justify') align = 'center';
  ctx.textAlign = align as CanvasTextAlign;
  ctx.textBaseline = 'middle';

  const startY = -((lines.length - 1) * lineHeight) / 2;

  // Apply Text Opacity if defined
  if (textProps.textOpacity !== undefined && textProps.textOpacity !== 1.0) {
    ctx.globalAlpha = ctx.globalAlpha * textProps.textOpacity;
  }

  // Create Fill Style (Solid vs Gradient)
  let textFillStyle: string | CanvasGradient = textProps.color || '#ffffff';

  if (textProps.fillType === 'gradient' && textProps.gradientColorStop2) {
    const angleRad = ((textProps.gradientAngle || 90) * Math.PI) / 180;
    const halfW = maxLineWidth / 2;
    const halfH = totalTextHeight / 2;
    const x0 = -Math.cos(angleRad) * halfW;
    const y0 = -Math.sin(angleRad) * halfH;
    const x1 = Math.cos(angleRad) * halfW;
    const y1 = Math.sin(angleRad) * halfH;

    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, textProps.color || '#ffffff');
    grad.addColorStop(1, textProps.gradientColorStop2);
    textFillStyle = grad;
  }

  // Curved Arc Text Rendering (if arcAngle is set)
  if (textProps.arcAngle && Math.abs(textProps.arcAngle) >= 2) {
    const totalAngle = (textProps.arcAngle * Math.PI) / 180;
    const chars = displayContent.replace(/\n/g, ' ').split('');
    const radius = Math.max(80, (maxLineWidth * 1.2) / (Math.abs(totalAngle) || 0.1));
    const anglePerChar = totalAngle / Math.max(1, chars.length - 1);
    const startAngle = -totalAngle / 2;

    const isOutlineEnabled = textProps.outlineEnabled ?? (textProps.borderWidth && textProps.borderWidth > 0);
    let strokeWidth = textProps.outlineWidth || textProps.borderWidth || 2;

    chars.forEach((ch, cIdx) => {
      const charAngle = startAngle + cIdx * anglePerChar;
      ctx.save();
      ctx.rotate(charAngle);
      ctx.translate(0, -radius);

      if (isOutlineEnabled) {
        ctx.strokeStyle = textProps.outlineColor || textProps.borderColor || '#000000';
        ctx.lineWidth = strokeWidth * 2;
        ctx.lineJoin = 'round';
        ctx.strokeText(ch, 0, 0);
      }

      ctx.fillStyle = textFillStyle;
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });

    ctx.restore();
    return;
  }

  lines.forEach((line, idx) => {
    const lineY = startY + idx * lineHeight;

    // Stroke / Outline
    const isOutlineEnabled = textProps.outlineEnabled ?? (textProps.borderWidth && textProps.borderWidth > 0);
    if (isOutlineEnabled) {
      let strokeWidth = textProps.outlineWidth || textProps.borderWidth || 2;
      if (textProps.outlinePreset === 'thin') strokeWidth = 2;
      else if (textProps.outlinePreset === 'medium') strokeWidth = 4;
      else if (textProps.outlinePreset === 'heavy') strokeWidth = 8;

      ctx.strokeStyle = textProps.outlineColor || textProps.borderColor || '#000000';
      ctx.lineWidth = strokeWidth * 2;
      ctx.lineJoin = 'round';
      ctx.strokeText(line, 0, lineY);
    }

    // Fill Text
    ctx.fillStyle = textFillStyle;
    ctx.fillText(line, 0, lineY);

    // Underline
    if (textProps.underline) {
      ctx.save();
      const m = ctx.measureText(line);
      ctx.strokeStyle = textFillStyle;
      ctx.lineWidth = Math.max(2, fontSize / 20);

      let lineStartX = -m.width / 2;
      if (align === 'left') lineStartX = 0;
      else if (align === 'right') lineStartX = -m.width;

      const underlineY = lineY + fontSize * 0.4;
      ctx.beginPath();
      ctx.moveTo(lineStartX, underlineY);
      ctx.lineTo(lineStartX + m.width, underlineY);
      ctx.stroke();
      ctx.restore();
    }

    // Strikethrough
    if (textProps.strikethrough) {
      ctx.save();
      const m = ctx.measureText(line);
      ctx.strokeStyle = textFillStyle;
      ctx.lineWidth = Math.max(2, fontSize / 22);

      let lineStartX = -m.width / 2;
      if (align === 'left') lineStartX = 0;
      else if (align === 'right') lineStartX = -m.width;

      const strikeY = lineY;
      ctx.beginPath();
      ctx.moveTo(lineStartX, strikeY);
      ctx.lineTo(lineStartX + m.width, strikeY);
      ctx.stroke();
      ctx.restore();
    }
  });

  ctx.restore();
}
