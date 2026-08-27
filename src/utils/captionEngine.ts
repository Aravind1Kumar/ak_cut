import { CaptionSegment, CaptionWord, CaptionStyle } from '../types/timeline';

export const DEFAULT_CAPTION_STYLES: Record<string, CaptionStyle> = {
  social: {
    id: 'social',
    name: '📱 Social Cyan',
    fontFamily: 'Inter, sans-serif',
    fontSize: 44,
    fontWeight: 'bold',
    color: '#ffffff',
    outlineColor: '#000000',
    outlineWidth: 6,
    shadow: true,
    background: 'rgba(0, 0, 0, 0.75)',
    alignment: 'center',
    highlightColor: '#00f2fe', // Bright Cyan
  },
  bold: {
    id: 'bold',
    name: '⚡ Bold Yellow',
    fontFamily: 'Inter, sans-serif',
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffe600',
    outlineColor: '#000000',
    outlineWidth: 8,
    shadow: true,
    background: 'rgba(0, 0, 0, 0.85)',
    alignment: 'center',
    highlightColor: '#ff0055', // Neon Red
  },
  impact: {
    id: 'impact',
    name: '💥 Impact White',
    fontFamily: 'Impact, sans-serif',
    fontSize: 52,
    fontWeight: 'bold',
    color: '#ffffff',
    outlineColor: '#000000',
    outlineWidth: 8,
    shadow: true,
    background: 'transparent',
    alignment: 'center',
    highlightColor: '#ffea00', // Yellow
  },
  classic: {
    id: 'classic',
    name: '🎬 Classic Subtitle',
    fontFamily: 'Arial, sans-serif',
    fontSize: 36,
    fontWeight: 'normal',
    color: '#ffffff',
    outlineColor: '#000000',
    outlineWidth: 4,
    shadow: false,
    background: 'rgba(0, 0, 0, 0.6)',
    alignment: 'center',
    highlightColor: '#00f2fe',
  },
};

/**
 * Validates and normalizes a CaptionSegment to prevent corrupt timing data.
 */
export function validateCaptionSegment(segment: CaptionSegment): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (segment.startTime < 0) {
    errors.push('Start time cannot be negative.');
  }

  if (segment.endTime <= segment.startTime) {
    errors.push(`End time (${segment.endTime}s) must be strictly greater than start time (${segment.startTime}s).`);
  }

  if (segment.words && segment.words.length > 0) {
    for (const w of segment.words) {
      if (w.startTime < segment.startTime || w.endTime > segment.endTime) {
        errors.push(`Word "${w.word || w.text}" timestamp (${w.startTime}-${w.endTime}s) is outside segment bounds (${segment.startTime}-${segment.endTime}s).`);
      }
      if (w.endTime <= w.startTime) {
        errors.push(`Word "${w.word || w.text}" end time must be greater than start time.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Finds active caption segment at a specific timeline timestamp T.
 */
export function getActiveCaptionSegment(segments: CaptionSegment[], timelineTime: number): CaptionSegment | null {
  for (const seg of segments) {
    if (timelineTime >= seg.startTime && timelineTime <= seg.endTime) {
      return seg;
    }
  }
  return null;
}

/**
 * Finds active caption word at timeline time T if REAL word timestamps exist.
 * Returns null if T is outside all word bounds.
 */
export function getActiveCaptionWord(segment: CaptionSegment, timelineTime: number): CaptionWord | null {
  if (!segment.words || segment.words.length === 0) {
    return null;
  }

  for (const w of segment.words) {
    if (timelineTime >= w.startTime && timelineTime < w.endTime) {
      return w;
    }
  }

  return null;
}

/**
 * Shared Canvas Caption Renderer consumed by BOTH PreviewPlayer.tsx and videoExporter.ts.
 */
export function renderCaption(
  ctx: CanvasRenderingContext2D,
  segment: CaptionSegment,
  timelineTime: number,
  style: CaptionStyle = DEFAULT_CAPTION_STYLES.social,
  width: number,
  height: number
): void {
  if (!segment || !segment.text) return;

  ctx.save();

  const fontScale = width / 1280;
  const scaledFontSize = Math.round(style.fontSize * fontScale);
  ctx.font = `${style.fontWeight} ${scaledFontSize}px ${style.fontFamily}`;
  ctx.textAlign = style.alignment;
  ctx.textBaseline = 'middle';

  const textY = height * 0.82;
  const activeWord = getActiveCaptionWord(segment, timelineTime);
  const hasRealWords = Boolean(segment.words && segment.words.length > 0);

  // Measure text width for background pill
  const metrics = ctx.measureText(segment.text);
  const paddingX = 24 * fontScale;
  const paddingY = 14 * fontScale;

  // Background Box
  if (style.background && style.background !== 'transparent') {
    ctx.fillStyle = style.background;
    ctx.fillRect(
      width / 2 - metrics.width / 2 - paddingX,
      textY - scaledFontSize / 2 - paddingY,
      metrics.width + paddingX * 2,
      scaledFontSize + paddingY * 2
    );
  }

  // Draw Text with Word-Level Highlighting (when real word timestamps exist)
  if (hasRealWords && segment.words) {
    // Render word by word with real timing highlighting
    let currentX = width / 2 - metrics.width / 2;
    ctx.textAlign = 'left';

    segment.words.forEach((w) => {
      const wordText = (w.word || w.text || '') + ' ';
      const wordWidth = ctx.measureText(wordText).width;
      const isWordActive = activeWord && (activeWord.id === w.id || activeWord.startTime === w.startTime);

      if (style.outlineWidth > 0) {
        ctx.strokeStyle = style.outlineColor;
        ctx.lineWidth = style.outlineWidth * fontScale;
        ctx.strokeText(wordText, currentX, textY);
      }

      ctx.fillStyle = isWordActive ? style.highlightColor : style.color;
      ctx.fillText(wordText, currentX, textY);

      currentX += wordWidth;
    });
  } else {
    // Standard Segment Subtitle (No fake word jumps)
    if (style.outlineWidth > 0) {
      ctx.strokeStyle = style.outlineColor;
      ctx.lineWidth = style.outlineWidth * fontScale;
      ctx.strokeText(segment.text, width / 2, textY);
    }

    ctx.fillStyle = style.color;
    ctx.fillText(segment.text, width / 2, textY);
  }

  ctx.restore();
}
