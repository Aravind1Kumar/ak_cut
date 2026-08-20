# 🎬 Ak Cut - Free Pro Video Editor

**Ak Cut** is a free, high-performance, web-based video editing application inspired by CapCut. Built with React, TypeScript, WebGL Canvas Compositor, and Tailwind CSS.

---

## ⚡ Features

- **Multi-Track Timeline:** Drag-and-drop video, audio, text, and overlay tracks with clip snapping, trimming, splitting, and undo/redo history.
- **Real-Time Preview Canvas:** High-FPS WebGL frame compositor with real-time transforms (scale, rotate, position, opacity).
- **Text & Subtitle Engine:** Custom text overlays, trending templates, styling, outlines, and AI auto-captioning.
- **Filters & Effects:** Brightness, contrast, saturation, blur, hue rotation, sepia, and cinematic color presets.
- **Audio Mixing:** Multi-track volume controls, fade-in/out, and sample audio library.
- **Client-Side Export:** Render edited videos to MP4 in 720p, 1080p, and 4K directly in the browser.

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
git init
git add .
git commit -m "Initial commit of Ak Cut video editor"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ak-cut.git
git push -u origin main
```

### Step 2: Deploy on Vercel
1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Import your `ak-cut` GitHub repository.
3. Keep default build command (`npm run build`) and output directory (`dist`).
4. Click **Deploy**!

> [!NOTE]
> `vercel.json` is pre-configured with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers for fast WebAssembly video processing.
