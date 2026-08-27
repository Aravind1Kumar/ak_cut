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
    highlightColor: '#00f2fe',
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
    highlightColor: '#ff0055',
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
    highlightColor: '#ffea00',
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

export function getActiveCaptionSegment(segments: CaptionSegment[], timelineTime: number): CaptionSegment | null {
  for (const seg of segments) {
    if (timelineTime >= seg.startTime && timelineTime <= seg.endTime) {
      return seg;
    }
  }
  return null;
}

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
 * Splits a CaptionSegment cleanly at timelineTime T.
 */
export function splitCaptionSegmentAtTime(
  segment: CaptionSegment,
  splitTime: number
): { left: CaptionSegment; right: CaptionSegment } | null {
  if (splitTime <= segment.startTime || splitTime >= segment.endTime) {
    return null;
  }

  let leftWords: CaptionWord[] | undefined;
  let rightWords: CaptionWord[] | undefined;

  if (segment.words && segment.words.length > 0) {
    leftWords = segment.words.filter((w) => w.endTime <= splitTime);
    rightWords = segment.words.filter((w) => w.startTime >= splitTime);
  }

  const leftText = leftWords && leftWords.length > 0
    ? leftWords.map((w) => w.word || w.text).join(' ')
    : segment.text;

  const rightText = rightWords && rightWords.length > 0
    ? rightWords.map((w) => w.word || w.text).join(' ')
    : segment.text;

  const left: CaptionSegment = {
    ...segment,
    id: `seg_${Date.now()}_1`,
    endTime: splitTime,
    text: leftText,
    words: leftWords,
  };

  const right: CaptionSegment = {
    ...segment,
    id: `seg_${Date.now()}_2`,
    startTime: splitTime,
    text: rightText,
    words: rightWords,
  };

  return { left, right };
}

/**
 * Merges two adjacent CaptionSegments into one.
 */
export function mergeCaptionSegments(segA: CaptionSegment, segB: CaptionSegment): CaptionSegment {
  const startTime = Math.min(segA.startTime, segB.startTime);
  const endTime = Math.max(segA.endTime, segB.endTime);
  const mergedText = `${segA.text.trim()} ${segB.text.trim()}`;

  let mergedWords: CaptionWord[] | undefined;
  if (segA.words || segB.words) {
    mergedWords = [...(segA.words || []), ...(segB.words || [])].sort((a, b) => a.startTime - b.startTime);
  }

  return {
    id: `seg_merged_${Date.now()}`,
    trackId: segA.trackId,
    startTime,
    endTime,
    text: mergedText,
    words: mergedWords,
    styleId: segA.styleId || segB.styleId,
  };
}

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

  const metrics = ctx.measureText(segment.text);
  const paddingX = 24 * fontScale;
  const paddingY = 14 * fontScale;

  if (style.background && style.background !== 'transparent') {
    ctx.fillStyle = style.background;
    ctx.fillRect(
      width / 2 - metrics.width / 2 - paddingX,
      textY - scaledFontSize / 2 - paddingY,
      metrics.width + paddingX * 2,
      scaledFontSize + paddingY * 2
    );
  }

  if (hasRealWords && segment.words) {
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
