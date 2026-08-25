# 🎬 Ak Cut - Free Pro Video Editor

**Ak Cut** is a free, high-performance, web-based video editing application inspired by CapCut and Premiere Pro. Built with React, TypeScript, HTML5 Canvas Compositor, Web Audio API, IndexedDB, and `@ffmpeg/ffmpeg` WebAssembly.

---

## ⚡ Core Engine & Features

- **FFmpeg WASM Real MP4 Video Exporter:** Dedicated client-side video rendering service ([`src/utils/videoExporter.ts`](file:///D:/ak_cut/src/utils/videoExporter.ts)) powered by `@ffmpeg/ffmpeg` and `@ffmpeg/util`. Renders canvas frames, mixes Web Audio streams, and encodes real downloadable MP4 files with real H.264/AAC progress reporting.
- **IndexedDB Auto-Save & Project Persistence:** Project state (tracks, clips, keyframes, transitions, text, aspect ratio, media assets) automatically saves to browser IndexedDB with real-time status indicators (`Saved` | `Saving...` | `Unsaved changes`). Restores project state automatically on page refresh.
- **Web Audio API PCM Waveforms:** Real audio peak extraction using `AudioContext.decodeAudioData` rendering dynamic green waveforms on audio and video clips.
- **Source Cut Monitor:** Premiere Pro style video preview monitor with Set In (`I`) and Set Out (`O`) cut markers to insert trimmed segments onto the timeline.
- **Multi-Track Timeline:** Drag-and-drop video, audio, text, and overlay tracks with clip snapping, trimming, splitting, and transaction undo/redo history.
- **Canvas Composition & Keyframes:** Frame compositor with keyframe interpolation (`t1` to `t2`) for scale, rotation, position X/Y, and opacity.
- **Text & Subtitle Engine:** Custom text overlays, `.SRT` subtitle file parser, templates, fonts, outlines, and AI auto-captioning.
- **Custom Pen Tool Masking:** Draw custom polygon shape masks with interactive canvas control points.
- **CapCut Video Transitions & Effects:** Real cross dissolve, wipe, zoom, glitch shift, spin rotate, slide up, blur dissolve, and color grading filters.

---

## 🚀 Local Development

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start Development Server:**
   ```bash
   npm run dev
   ```

3. **Open in Browser:**
   Navigate to `http://localhost:5173`.

---

## 🌐 Deploying to GitHub & Vercel

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Implement FFmpeg WASM video exporter service and IndexedDB project persistence"
git push origin main
```

### Step 2: Deploy on Vercel
1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Import your `ak_cut` GitHub repository.
3. Keep default build command (`npm run build`) and output directory (`dist`).
4. Click **Deploy**!

> [!NOTE]
> `vercel.json` is pre-configured with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers for WebAssembly (`@ffmpeg/ffmpeg`) SharedArrayBuffer support.
