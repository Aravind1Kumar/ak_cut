import { TransitionType, Clip, Track } from '../types/timeline';

// Deterministic pseudo-random seed function (replaces Math.random() for frame-accurate export)
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 91.3458 + 47.1234) * 43758.5453;
  return x - Math.floor(x);
}

export interface TransitionParams {
  type: TransitionType;
  progress: number; // 0.0 -> 1.0
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  drawOutgoing: () => void;
  drawIncoming: () => void;
  frameSeed?: number;
}

export function findPreviousClipOnSameTrack(tracks: Track[], currentClip: Clip): Clip | null {
  const track = tracks.find((t) => t.id === currentClip.trackId || t.clips.some((c) => c.id === currentClip.id));
  if (!track) return null;

  const sorted = [...track.clips].sort((a, b) => a.startTime - b.startTime);
  const idx = sorted.findIndex((c) => c.id === currentClip.id);
  if (idx > 0) {
    return sorted[idx - 1];
  }
  return null;
}

export function renderTransitionEffect(
  typeOrParams: TransitionType | TransitionParams,
  progressArg?: number,
  ctxArg?: CanvasRenderingContext2D,
  widthArg?: number,
  heightArg?: number,
  drawOutgoingArg?: () => void,
  drawIncomingArg?: () => void,
  frameSeedArg = 0
) {
  let type: TransitionType;
  let progress: number;
  let ctx: CanvasRenderingContext2D;
  let width: number;
  let height: number;
  let drawOutgoing: () => void;
  let drawIncoming: () => void;
  let frameSeed = frameSeedArg;

  if (typeof typeOrParams === 'object') {
    type = typeOrParams.type;
    progress = typeOrParams.progress;
    ctx = typeOrParams.ctx;
    width = typeOrParams.width;
    height = typeOrParams.height;
    drawOutgoing = typeOrParams.drawOutgoing;
    drawIncoming = typeOrParams.drawIncoming;
    frameSeed = typeOrParams.frameSeed || 0;
  } else {
    type = typeOrParams;
    progress = progressArg!;
    ctx = ctxArg!;
    width = widthArg!;
    height = heightArg!;
    drawOutgoing = drawOutgoingArg!;
    drawIncoming = drawIncomingArg!;
  }

  const p = Math.max(0, Math.min(1, progress));

  if (type === 'fade' || type === 'dissolve') {
    ctx.save();
    ctx.globalAlpha = 1 - p;
    drawOutgoing();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = p;
    drawIncoming();
    ctx.restore();
  } else if (type === 'wipe') {
    ctx.save();
    drawOutgoing();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width * p, height);
    ctx.clip();
    drawIncoming();
    ctx.restore();
  } else if (type === 'slideLeft') {
    ctx.save();
    ctx.translate(-width * p, 0);
    drawOutgoing();
    ctx.restore();

    ctx.save();
    ctx.translate(width * (1 - p), 0);
    drawIncoming();
    ctx.restore();
  } else if (type === 'slideRight') {
    ctx.save();
    ctx.translate(width * p, 0);
    drawOutgoing();
    ctx.restore();

    ctx.save();
    ctx.translate(-width * (1 - p), 0);
    drawIncoming();
    ctx.restore();
  } else if (type === 'zoom') {
    ctx.save();
    ctx.globalAlpha = 1 - p;
    drawOutgoing();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = p;
    ctx.translate(width / 2, height / 2);
    ctx.scale(0.5 + 0.5 * p, 0.5 + 0.5 * p);
    ctx.translate(-width / 2, -height / 2);
    drawIncoming();
    ctx.restore();
  } else if (type === 'flash') {
    ctx.save();
    if (p < 0.5) {
      drawOutgoing();
      ctx.fillStyle = `rgba(255,255,255,${p * 2})`;
      ctx.fillRect(0, 0, width, height);
    } else {
      drawIncoming();
      ctx.fillStyle = `rgba(255,255,255,${(1 - p) * 2})`;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  } else if (type === 'glitch') {
    ctx.save();
    const rnd = pseudoRandom(frameSeed + p * 100);
    const offsetX = (rnd - 0.5) * 60;
    if (p < 0.5) {
      ctx.translate(offsetX, 0);
      drawOutgoing();
    } else {
      ctx.translate(offsetX, 0);
      drawIncoming();
    }
    ctx.restore();
  } else if (type === 'spin') {
    ctx.save();
    ctx.globalAlpha = 1 - p;
    drawOutgoing();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = p;
    ctx.translate(width / 2, height / 2);
    ctx.rotate((1 - p) * Math.PI * 2);
    ctx.translate(-width / 2, -height / 2);
    drawIncoming();
    ctx.restore();
  } else if (type === 'blur') {
    ctx.save();
    ctx.filter = `blur(${Math.sin(p * Math.PI) * 15}px)`;
    if (p < 0.5) drawOutgoing();
    else drawIncoming();
    ctx.restore();
  } else {
    ctx.save();
    ctx.globalAlpha = 1 - p;
    drawOutgoing();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = p;
    drawIncoming();
    ctx.restore();
  }
}
