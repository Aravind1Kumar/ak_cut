import { ShapeProps, StickerProps } from '../types/timeline';

export function renderShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeProps,
  width: number,
  height: number
) {
  ctx.save();

  const w = 240;
  const h = 180;

  ctx.fillStyle = shape.fillColor;
  ctx.globalAlpha = shape.fillOpacity !== undefined ? shape.fillOpacity : 1.0;

  if (shape.borderWidth > 0) {
    ctx.strokeStyle = shape.borderColor;
    ctx.lineWidth = shape.borderWidth * 2;
  }

  ctx.beginPath();

  if (shape.type === 'rectangle') {
    ctx.rect(-w / 2, -h / 2, w, h);
  } else if (shape.type === 'roundedRectangle') {
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(-w / 2, -h / 2, w, h, 20);
    } else {
      ctx.rect(-w / 2, -h / 2, w, h);
    }
  } else if (shape.type === 'circle') {
    const radius = Math.min(w, h) / 2;
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
  } else if (shape.type === 'ellipse') {
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (shape.type === 'triangle') {
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
  } else if (shape.type === 'line') {
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(w / 2, 0);
  } else if (shape.type === 'arrow') {
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(w / 2, 0);
    ctx.lineTo(w / 2 - 25, -18);
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2 - 25, 18);
  } else if (shape.type === 'star') {
    const numPoints = 5;
    const outerRadius = Math.min(w, h) / 2;
    const innerRadius = outerRadius * 0.4;
    for (let i = 0; i < numPoints * 2; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / numPoints - Math.PI / 2;
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  if (shape.type !== 'line' && shape.type !== 'arrow') {
    ctx.fill();
  }

  if (shape.borderWidth > 0) {
    ctx.stroke();
  }

  ctx.restore();
}

export function renderSticker(
  ctx: CanvasRenderingContext2D,
  sticker: StickerProps,
  width: number,
  height: number
) {
  ctx.save();
  ctx.font = '80px Inter, Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (sticker.color) {
    ctx.fillStyle = sticker.color;
  }

  ctx.fillText(sticker.icon, 0, 0);
  ctx.restore();
}
