import { ShapeProps, StickerProps } from '../types/timeline';

export function renderShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeProps,
  width: number,
  height: number
) {
  ctx.save();

  const w = shape.width || 240;
  const h = shape.height || 180;
  const radius = Math.min(w, h) / 2;

  // Setup Fill Style (Solid or Linear Gradient)
  if (shape.gradientFillEnabled && shape.gradientColor2) {
    const angleRad = ((shape.gradientAngle || 0) * Math.PI) / 180;
    const halfDiag = Math.sqrt(w * w + h * h) / 2;
    const x1 = -Math.cos(angleRad) * halfDiag;
    const y1 = -Math.sin(angleRad) * halfDiag;
    const x2 = Math.cos(angleRad) * halfDiag;
    const y2 = Math.sin(angleRad) * halfDiag;

    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, shape.fillColor);
    grad.addColorStop(1, shape.gradientColor2);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = shape.fillColor;
  }

  const fillAlpha = shape.fillOpacity !== undefined ? shape.fillOpacity : 1.0;

  ctx.beginPath();

  if (shape.type === 'rectangle') {
    ctx.rect(-w / 2, -h / 2, w, h);
  } else if (shape.type === 'roundedRectangle') {
    const cr = shape.cornerRadius !== undefined ? shape.cornerRadius : 20;
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(-w / 2, -h / 2, w, h, cr);
    } else {
      ctx.rect(-w / 2, -h / 2, w, h);
    }
  } else if (shape.type === 'circle') {
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
    const outerR = radius;
    const innerR = radius * 0.4;
    for (let i = 0; i < numPoints * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / numPoints - Math.PI / 2;
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (shape.type === 'polygon' || shape.type === 'hexagon') {
    const sides = shape.type === 'hexagon' ? 6 : 5;
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (shape.type === 'pentagon') {
    const sides = 5;
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (shape.type === 'diamond') {
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, 0);
    ctx.lineTo(0, h / 2);
    ctx.lineTo(-w / 2, 0);
    ctx.closePath();
  } else if (shape.type === 'heart') {
    const topCurveHeight = h * 0.3;
    ctx.moveTo(0, topCurveHeight);
    ctx.bezierCurveTo(0, 0, -w / 2, 0, -w / 2, topCurveHeight);
    ctx.bezierCurveTo(-w / 2, (h + topCurveHeight) / 2, 0, h - topCurveHeight, 0, h / 2);
    ctx.bezierCurveTo(0, h - topCurveHeight, w / 2, (h + topCurveHeight) / 2, w / 2, topCurveHeight);
    ctx.bezierCurveTo(w / 2, 0, 0, 0, 0, topCurveHeight);
    ctx.closePath();
  }

  // Draw Fill
  if (shape.type !== 'line' && shape.type !== 'arrow') {
    ctx.globalAlpha = fillAlpha;
    ctx.fill();
  }

  // Draw Stroke
  if (shape.borderWidth > 0) {
    const strokeAlpha = shape.strokeOpacity !== undefined ? shape.strokeOpacity : fillAlpha;
    ctx.globalAlpha = strokeAlpha;
    ctx.strokeStyle = shape.borderColor;
    ctx.lineWidth = shape.borderWidth * 2;
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
