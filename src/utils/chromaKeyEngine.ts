import { ChromaKeyProps } from '../types/timeline';

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function applyChromaKeyToCanvas(
  ctx: CanvasRenderingContext2D,
  chromaKey: ChromaKeyProps,
  width: number,
  height: number
) {
  if (!chromaKey.enabled) return;

  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const { r: tr, g: tg, b: tb } = hexToRgb(chromaKey.targetColor || chromaKey.color || '#00ff00');
    const tolerance = chromaKey.colorDistance !== undefined ? chromaKey.colorDistance : 0.35;
    const softness = chromaKey.smoothness !== undefined ? chromaKey.smoothness : 0.15;
    const spill = chromaKey.spillReduction !== undefined ? chromaKey.spillReduction : 0.4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a === 0) continue;

      const dist = Math.sqrt((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2) / 441.673;

      if (dist <= tolerance) {
        data[i + 3] = 0;
      } else if (dist <= tolerance + softness && softness > 0) {
        const factor = (dist - tolerance) / softness;
        data[i + 3] = Math.round(a * factor);
      }

      if (spill > 0 && data[i + 3] > 0) {
        if (tg > tr && tg > tb) {
          const maxOther = Math.max(r, b);
          if (g > maxOther) {
            data[i + 1] = Math.round(g - (g - maxOther) * spill);
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.warn('Chroma Key pixel processing warning:', err);
  }
}
