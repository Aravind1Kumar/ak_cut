import { TransitionType } from '../types/timeline';

export function renderTransitionEffect(
  type: TransitionType,
  progress: number, // 0.0 -> 1.0
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  drawOutgoing: () => void,
  drawIncoming: () => void
) {
  const p = Math.max(0, Math.min(1, progress));

  if (type === 'fade' || type === 'dissolve') {
    // Crossfade: outgoing fades out, incoming fades in
    ctx.save();
    ctx.globalAlpha = 1 - p;
    drawOutgoing();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = p;
    drawIncoming();
    ctx.restore();
  } else if (type === 'slide') {
    // Slide Left: incoming slides in from right
    ctx.save();
    drawOutgoing();
    ctx.restore();

    ctx.save();
    ctx.translate(width * (1 - p), 0);
    drawIncoming();
    ctx.restore();
  } else if (type === 'wipe') {
    // Wipe Left to Right
    ctx.save();
    drawOutgoing();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width * p, height);
    ctx.clip();
    drawIncoming();
    ctx.restore();
  } else if (type === 'zoom') {
    // Zoom In transition
    ctx.save();
    ctx.globalAlpha = 1 - p;
    drawOutgoing();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = p;
    const scale = 0.5 + 0.5 * p;
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);
    drawIncoming();
    ctx.restore();
  } else if (type === 'flash') {
    // Flash White Transition
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
    // Glitch Shift
    ctx.save();
    if (p < 0.5) {
      const offsetX = (Math.random() - 0.5) * 40;
      ctx.translate(offsetX, 0);
      drawOutgoing();
    } else {
      const offsetX = (Math.random() - 0.5) * 40;
      ctx.translate(offsetX, 0);
      drawIncoming();
    }
    ctx.restore();
  } else if (type === 'spin') {
    // Spin Rotate Transition
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
    // Blur Dissolve
    ctx.save();
    ctx.filter = `blur(${Math.sin(p * Math.PI) * 15}px)`;
    if (p < 0.5) drawOutgoing();
    else drawIncoming();
    ctx.restore();
  } else {
    // Default fallback
    ctx.save();
    ctx.globalAlpha = p;
    drawIncoming();
    ctx.restore();
  }
}
