import { MaskProps } from '../types/timeline';

export function applyCanvasMask(
  ctx: CanvasRenderingContext2D,
  mask: MaskProps | undefined,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (!mask || mask.type === 'none') return;

  const maskX = canvasWidth / 2 + (mask.x / 100) * canvasWidth;
  const maskY = canvasHeight / 2 + (mask.y / 100) * canvasHeight;
  const maskW = (mask.width / 100) * canvasWidth;
  const maskH = (mask.height / 100) * canvasHeight;

  ctx.save();
  ctx.translate(maskX, maskY);
  ctx.rotate((mask.rotation * Math.PI) / 180);

  if (mask.feather && mask.feather > 0) {
    ctx.filter = `blur(${mask.feather}px)`;
  }

  ctx.beginPath();

  if (mask.type === 'circle') {
    const radius = Math.max(1, Math.min(maskW, maskH) / 2);
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
  } else if (mask.type === 'rectangle') {
    ctx.rect(-maskW / 2, -maskH / 2, maskW, maskH);
  } else if (mask.type === 'line' || mask.type === 'linearGradient') {
    ctx.rect(-maskW / 2, -canvasHeight, maskW, canvasHeight * 2);
  } else if (mask.type === 'radialGradient') {
    const radius = Math.max(1, Math.max(maskW, maskH) / 2);
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
  } else {
    ctx.rect(-maskW / 2, -maskH / 2, maskW, maskH);
  }

  if (mask.inverted) {
    // Invert mask using destination-out
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill();
  } else {
    ctx.clip();
  }

  ctx.restore();
}
