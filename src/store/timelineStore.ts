import { create } from 'zustand';
import {
  Track,
  Clip,
  MediaType,
  AspectRatio,
  TransformProps,
  FilterProps,
  AudioProps,
  TextProps,
  MediaAsset,
  TransitionProps,
  ChromaKeyProps,
  MaskProps,
  SpeedCurveType,
  Keyframe,
} from '../types/timeline';

const DEFAULT_TRANSFORM: TransformProps = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  opacity: 1,
};

const DEFAULT_FILTER: FilterProps = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  hueRotate: 0,
  sepia: 0,
};

const DEFAULT_AUDIO: AudioProps = {
  volume: 1,
  fadeIn: 0,
  fadeOut: 0,
  muted: false,
};

const DEFAULT_CHROMA_KEY: ChromaKeyProps = {
  enabled: false,
  color: '#00ff00',
  threshold: 40,
  smoothness: 10,
};

const DEFAULT_MASK: MaskProps = {
  type: 'none',
  feather: 0,
};

interface TimelineState {
  // Playback
  isPlaying: boolean;
  currentTime: number;
  maxTimelineDuration: number;
  fps: number;
  aspectRatio: AspectRatio;
  zoomLevel: number;
  snappingEnabled: boolean;
  rippleDeleteEnabled: boolean;

  // Media Library Assets
  mediaAssets: MediaAsset[];

  // Tracks & Clips
  tracks: Track[];
  selectedClipId: string | null;
  copiedClip: Clip | null;

  // History
  history: Track[][];
  historyIndex: number;

  // Helpers
  getProjectDuration: () => number;

  // Actions
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setZoomLevel: (zoom: number) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setSelectedClipId: (id: string | null) => void;
  setSnappingEnabled: (enabled: boolean) => void;
  setRippleDeleteEnabled: (enabled: boolean) => void;

  // Media Asset Actions
  addMediaAsset: (asset: Omit<MediaAsset, 'id' | 'createdAt'>) => string;
  deleteMediaAsset: (assetId: string) => void;

  // Track Actions
  addTrack: (type: MediaType, name?: string) => string;
  deleteTrack: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackHidden: (trackId: string) => void;
  toggleTrackLocked: (trackId: string) => void;

  // Clip Actions
  addClipToTrack: (trackId: string, clipData: Partial<Clip>) => string;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  updateClipTransform: (clipId: string, transform: Partial<TransformProps>) => void;
  updateClipFilter: (clipId: string, filter: Partial<FilterProps>) => void;
  updateClipAudio: (clipId: string, audio: Partial<AudioProps>) => void;
  updateClipText: (clipId: string, text: Partial<TextProps>) => void;
  updateClipTransition: (clipId: string, transition: Partial<TransitionProps>) => void;
  updateClipChromaKey: (clipId: string, chromaKey: Partial<ChromaKeyProps>) => void;
  updateClipMask: (clipId: string, mask: Partial<MaskProps>) => void;
  updateClipSpeedCurve: (clipId: string, curve: SpeedCurveType) => void;

  // Keyframes Actions
  addKeyframeToClip: (clipId: string) => void;
  removeKeyframeFromClip: (clipId: string, keyframeId: string) => void;

  splitSelectedClip: () => void;
  deleteSelectedClip: () => void;
  duplicateSelectedClip: () => void;
  detachAudioFromSelectedClip: () => void;

  // Clipboard
  copySelectedClip: () => void;
  pasteClipAtPlayhead: () => void;

  // Undo / Redo
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Demo Project
  loadDemoProject: () => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  isPlaying: false,
  currentTime: 0,
  maxTimelineDuration: 60,
  fps: 30,
  aspectRatio: '16:9',
  zoomLevel: 40,
  snappingEnabled: true,
  rippleDeleteEnabled: false,

  mediaAssets: [
    {
      id: 'asset-sample-1',
      name: 'Big Buck Bunny',
      type: 'video',
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      duration: 10,
      size: '15 MB',
      createdAt: Date.now(),
    },
    {
      id: 'asset-sample-2',
      name: 'Elephants Dream',
      type: 'video',
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      duration: 10,
      size: '18 MB',
      createdAt: Date.now(),
    },
  ],

  tracks: [
    { id: 'track-text-1', name: 'Text Track 1', type: 'text', muted: false, locked: false, hidden: false, clips: [] },
    { id: 'track-video-1', name: 'Video Track 1', type: 'video', muted: false, locked: false, hidden: false, clips: [] },
    { id: 'track-audio-1', name: 'Audio Track 1', type: 'audio', muted: false, locked: false, hidden: false, clips: [] },
  ],
  selectedClipId: null,
  copiedClip: null,

  history: [],
  historyIndex: -1,

  getProjectDuration: () => {
    const { tracks } = get();
    let maxEnd = 0;
    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const end = clip.startTime + clip.duration;
        if (end > maxEnd) maxEnd = end;
      });
    });
    return maxEnd > 0 ? maxEnd : 10;
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
  setZoomLevel: (zoom) => set({ zoomLevel: Math.max(10, Math.min(200, zoom)) }),
  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
  setSelectedClipId: (id) => set({ selectedClipId: id }),
  setSnappingEnabled: (enabled) => set({ snappingEnabled: enabled }),
  setRippleDeleteEnabled: (enabled) => set({ rippleDeleteEnabled: enabled }),

  addMediaAsset: (assetData) => {
    const id = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newAsset: MediaAsset = {
      ...assetData,
      id,
      createdAt: Date.now(),
    };
    set((state) => ({ mediaAssets: [newAsset, ...state.mediaAssets] }));
    return id;
  },

  deleteMediaAsset: (assetId) => {
    set((state) => ({
      mediaAssets: state.mediaAssets.filter((a) => a.id !== assetId),
    }));
  },

  pushHistory: () => {
    const { tracks, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(tracks)));
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevTracks = history[historyIndex - 1];
      set({
        tracks: JSON.parse(JSON.stringify(prevTracks)),
        historyIndex: historyIndex - 1,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextTracks = history[historyIndex + 1];
      set({
        tracks: JSON.parse(JSON.stringify(nextTracks)),
        historyIndex: historyIndex + 1,
      });
    }
  },

  addTrack: (type, name) => {
    get().pushHistory();
    const count = get().tracks.filter((t) => t.type === type).length + 1;
    const newTrack: Track = {
      id: `track-${type}-${Date.now()}`,
      name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${count}`,
      type,
      muted: false,
      locked: false,
      hidden: false,
      clips: [],
    };
    set((state) => ({ tracks: [newTrack, ...state.tracks] }));
    return newTrack.id;
  },

  deleteTrack: (trackId) => {
    get().pushHistory();
    set((state) => ({
      tracks: state.tracks.filter((t) => t.id !== trackId),
      selectedClipId: state.selectedClipId && state.tracks.find((t) => t.id === trackId)?.clips.some((c) => c.id === state.selectedClipId)
        ? null
        : state.selectedClipId,
    }));
  },

  toggleTrackMute: (trackId) => {
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t)),
    }));
  },

  toggleTrackHidden: (trackId) => {
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, hidden: !t.hidden } : t)),
    }));
  },

  toggleTrackLocked: (trackId) => {
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t)),
    }));
  },

  addClipToTrack: (trackId, clipData) => {
    get().pushHistory();
    const clipId = `clip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newClip: Clip = {
      id: clipId,
      trackId,
      name: clipData.name || 'Untitled Clip',
      type: clipData.type || 'video',
      startTime: clipData.startTime ?? get().currentTime,
      duration: clipData.duration || 5,
      mediaOffset: clipData.mediaOffset || 0,
      sourceDuration: clipData.sourceDuration || 5,
      src: clipData.src || '',
      speed: clipData.speed || 1.0,
      speedCurve: clipData.speedCurve || 'flat',
      transform: { ...DEFAULT_TRANSFORM, ...clipData.transform },
      filter: { ...DEFAULT_FILTER, ...clipData.filter },
      audio: { ...DEFAULT_AUDIO, ...clipData.audio },
      chromaKey: { ...DEFAULT_CHROMA_KEY, ...clipData.chromaKey },
      mask: { ...DEFAULT_MASK, ...clipData.mask },
      text: clipData.text || (clipData.type === 'text' ? {
        content: clipData.name || 'Your Preferred Text',
        fontFamily: 'sans-serif',
        fontSize: 48,
        color: '#ffffff',
        backgroundColor: 'transparent',
        borderColor: '#000000',
        borderWidth: 0,
        alignment: 'center',
        bold: true,
        italic: false,
      } : undefined),
      keyframes: [],
    };

    set((state) => ({
      tracks: state.tracks.map((track) => {
        if (track.id === trackId) {
          return { ...track, clips: [...track.clips, newClip] };
        }
        return track;
      }),
      selectedClipId: clipId,
    }));

    return clipId;
  },

  updateClip: (clipId, updates) => {
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId ? { ...clip, ...updates } : clip
        ),
      })),
    }));
  },

  updateClipTransform: (clipId, transformUpdates) => {
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId
            ? { ...clip, transform: { ...clip.transform, ...transformUpdates } }
            : clip
        ),
      })),
    }));
  },

  updateClipFilter: (clipId, filterUpdates) => {
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId
            ? { ...clip, filter: { ...clip.filter, ...filterUpdates } }
            : clip
        ),
      })),
    }));
  },

  updateClipAudio: (clipId, audioUpdates) => {
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId
            ? { ...clip, audio: { ...clip.audio, ...audioUpdates } }
            : clip
        ),
      })),
    }));
  },

  updateClipText: (clipId, textUpdates) => {
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId && clip.text
            ? { ...clip, text: { ...clip.text, ...textUpdates } }
            : clip
        ),
      })),
    }));
  },

  updateClipTransition: (clipId, transitionUpdates) => {
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId
            ? {
                ...clip,
                transition: {
                  type: transitionUpdates.type || 'fade',
                  duration: transitionUpdates.duration || 0.5,
                },
              }
            : clip
        ),
      })),
    }));
  },

  updateClipChromaKey: (clipId, chromaUpdates) => {
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId
            ? { ...clip, chromaKey: { ...(clip.chromaKey || DEFAULT_CHROMA_KEY), ...chromaUpdates } }
            : clip
        ),
      })),
    }));
  },

  updateClipMask: (clipId, maskUpdates) => {
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId
            ? { ...clip, mask: { ...(clip.mask || DEFAULT_MASK), ...maskUpdates } }
            : clip
        ),
      })),
    }));
  },

  updateClipSpeedCurve: (clipId, curve) => {
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId ? { ...clip, speedCurve: curve } : clip
        ),
      })),
    }));
  },

  addKeyframeToClip: (clipId) => {
    const { currentTime, tracks } = get();
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip) {
        get().pushHistory();
        const relTime = currentTime - clip.startTime;
        const newKf: Keyframe = {
          id: `kf-${Date.now()}`,
          time: Math.max(0, Math.min(clip.duration, relTime)),
          transform: { ...clip.transform },
          filter: { ...clip.filter },
        };

        const updatedKfs = [...clip.keyframes.filter((k) => Math.abs(k.time - relTime) > 0.1), newKf].sort(
          (a, b) => a.time - b.time
        );

        get().updateClip(clipId, { keyframes: updatedKfs });
        break;
      }
    }
  },

  removeKeyframeFromClip: (clipId, keyframeId) => {
    const { tracks } = get();
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip) {
        get().pushHistory();
        const updatedKfs = clip.keyframes.filter((k) => k.id !== keyframeId);
        get().updateClip(clipId, { keyframes: updatedKfs });
        break;
      }
    }
  },

  splitSelectedClip: () => {
    const { selectedClipId, currentTime, tracks } = get();
    if (!selectedClipId) return;

    let targetClip: Clip | null = null;
    let targetTrackId: string | null = null;

    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipId);
      if (clip) {
        targetClip = clip;
        targetTrackId = track.id;
        break;
      }
    }

    if (!targetClip || !targetTrackId) return;

    if (currentTime > targetClip.startTime && currentTime < targetClip.startTime + targetClip.duration) {
      get().pushHistory();

      const splitPoint = currentTime - targetClip.startTime;
      const firstPartDuration = splitPoint;
      const secondPartDuration = targetClip.duration - splitPoint;

      const updatedFirstClip: Clip = {
        ...targetClip,
        duration: firstPartDuration,
      };

      const secondClipId = `clip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const newSecondClip: Clip = {
        ...targetClip,
        id: secondClipId,
        startTime: currentTime,
        duration: secondPartDuration,
        mediaOffset: targetClip.mediaOffset + splitPoint * targetClip.speed,
      };

      set((state) => ({
        tracks: state.tracks.map((track) => {
          if (track.id === targetTrackId) {
            return {
              ...track,
              clips: track.clips
                .map((c) => (c.id === selectedClipId ? updatedFirstClip : c))
                .concat(newSecondClip),
            };
          }
          return track;
        }),
        selectedClipId: secondClipId,
      }));
    }
  },

  deleteSelectedClip: () => {
    const { selectedClipId } = get();
    if (!selectedClipId) return;
    get().pushHistory();
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((c) => c.id !== selectedClipId),
      })),
      selectedClipId: null,
    }));
  },

  duplicateSelectedClip: () => {
    const { selectedClipId, tracks } = get();
    if (!selectedClipId) return;

    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipId);
      if (clip) {
        get().pushHistory();
        const dupId = `clip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const duplicatedClip: Clip = {
          ...JSON.parse(JSON.stringify(clip)),
          id: dupId,
          startTime: clip.startTime + clip.duration + 0.2,
        };

        set((state) => ({
          tracks: state.tracks.map((t) =>
            t.id === track.id ? { ...t, clips: [...t.clips, duplicatedClip] } : t
          ),
          selectedClipId: dupId,
        }));
        break;
      }
    }
  },

  detachAudioFromSelectedClip: () => {
    const { selectedClipId, tracks } = get();
    if (!selectedClipId) return;

    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipId);
      if (clip && clip.type === 'video') {
        get().pushHistory();

        get().updateClipAudio(clip.id, { muted: true });

        let audioTrack = tracks.find((t) => t.type === 'audio');
        let audioTrackId = audioTrack?.id || get().addTrack('audio', 'Extracted Audio');

        get().addClipToTrack(audioTrackId, {
          name: `${clip.name} (Audio)`,
          type: 'audio',
          src: clip.src,
          startTime: clip.startTime,
          duration: clip.duration,
          mediaOffset: clip.mediaOffset,
          sourceDuration: clip.sourceDuration,
        });

        break;
      }
    }
  },

  copySelectedClip: () => {
    const { selectedClipId, tracks } = get();
    if (!selectedClipId) return;

    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipId);
      if (clip) {
        set({ copiedClip: JSON.parse(JSON.stringify(clip)) });
        break;
      }
    }
  },

  pasteClipAtPlayhead: () => {
    const { copiedClip, currentTime, tracks } = get();
    if (!copiedClip) return;

    get().pushHistory();

    let targetTrack = tracks.find((t) => t.type === copiedClip.type);
    let targetTrackId = targetTrack?.id || get().addTrack(copiedClip.type);

    const pastedClipId = get().addClipToTrack(targetTrackId, {
      ...copiedClip,
      startTime: currentTime,
    });

    set({ selectedClipId: pastedClipId });
  },

  loadDemoProject: () => {
    const demoVideoTrackId = 'track-video-1';
    const demoTextTrackId = 'track-text-1';

    set({
      tracks: [
        {
          id: demoTextTrackId,
          name: 'Text Track 1',
          type: 'text',
          muted: false,
          locked: false,
          hidden: false,
          clips: [
            {
              id: 'demo-text-1',
              trackId: demoTextTrackId,
              name: 'Intro Title',
              type: 'text',
              startTime: 0.5,
              duration: 4.5,
              mediaOffset: 0,
              sourceDuration: 4.5,
              src: '',
              speed: 1,
              speedCurve: 'flat',
              transform: DEFAULT_TRANSFORM,
              filter: DEFAULT_FILTER,
              audio: DEFAULT_AUDIO,
              text: {
                content: 'WELCOME TO AK CUT',
                fontFamily: 'sans-serif',
                fontSize: 44,
                color: '#00f2fe',
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderColor: '#ffffff',
                borderWidth: 1,
                alignment: 'center',
                bold: true,
                italic: false,
              },
              keyframes: [],
            },
          ],
        },
        {
          id: demoVideoTrackId,
          name: 'Video Track 1',
          type: 'video',
          muted: false,
          locked: false,
          hidden: false,
          clips: [
            {
              id: 'demo-video-1',
              trackId: demoVideoTrackId,
              name: 'Sample Nature Clip',
              type: 'video',
              startTime: 0,
              duration: 12,
              mediaOffset: 0,
              sourceDuration: 12,
              src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
              speed: 1,
              speedCurve: 'flat',
              transform: DEFAULT_TRANSFORM,
              filter: DEFAULT_FILTER,
              audio: DEFAULT_AUDIO,
              keyframes: [],
            },
          ],
        },
      ],
      selectedClipId: 'demo-video-1',
    });
  },
}));
