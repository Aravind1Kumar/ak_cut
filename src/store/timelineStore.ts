import { create } from 'zustand';
import { Track, Clip, MediaType, AspectRatio, TransformProps, FilterProps, AudioProps, TextProps } from '../types/timeline';

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

interface TimelineState {
  // Playback
  isPlaying: boolean;
  currentTime: number;
  maxTimelineDuration: number;
  fps: number;
  aspectRatio: AspectRatio;
  zoomLevel: number; // Pixels per second

  // Data
  tracks: Track[];
  selectedClipId: string | null;

  // History
  history: Track[][];
  historyIndex: number;

  // Actions
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setZoomLevel: (zoom: number) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setSelectedClipId: (id: string | null) => void;

  // Track & Clip Management
  addTrack: (type: MediaType) => string;
  addClipToTrack: (trackId: string, clipData: Partial<Clip>) => string;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  updateClipTransform: (clipId: string, transform: Partial<TransformProps>) => void;
  updateClipFilter: (clipId: string, filter: Partial<FilterProps>) => void;
  updateClipAudio: (clipId: string, audio: Partial<AudioProps>) => void;
  updateClipText: (clipId: string, text: Partial<TextProps>) => void;

  splitSelectedClip: () => void;
  deleteSelectedClip: () => void;
  duplicateSelectedClip: () => void;

  // Undo / Redo
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Initial Demo Data
  loadDemoProject: () => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  isPlaying: false,
  currentTime: 0,
  maxTimelineDuration: 60, // 60 seconds initial
  fps: 30,
  aspectRatio: '16:9',
  zoomLevel: 40, // 40px per second

  tracks: [
    { id: 'track-text-1', name: 'Text Track', type: 'text', muted: false, locked: false, hidden: false, clips: [] },
    { id: 'track-video-1', name: 'Main Video', type: 'video', muted: false, locked: false, hidden: false, clips: [] },
    { id: 'track-audio-1', name: 'Audio Track', type: 'audio', muted: false, locked: false, hidden: false, clips: [] },
  ],
  selectedClipId: null,

  history: [],
  historyIndex: -1,

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),

  setZoomLevel: (zoom) => set({ zoomLevel: Math.max(10, Math.min(200, zoom)) }),

  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),

  setSelectedClipId: (id) => set({ selectedClipId: id }),

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

  addTrack: (type) => {
    get().pushHistory();
    const newTrack: Track = {
      id: `track-${type}-${Date.now()}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track`,
      type,
      muted: false,
      locked: false,
      hidden: false,
      clips: [],
    };
    set((state) => ({ tracks: [newTrack, ...state.tracks] }));
    return newTrack.id;
  },

  addClipToTrack: (trackId, clipData) => {
    get().pushHistory();
    const clipId = `clip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newClip: Clip = {
      id: clipId,
      trackId,
      name: clipData.name || 'Untitled Clip',
      type: clipData.type || 'video',
      startTime: clipData.startTime ?? 0,
      duration: clipData.duration || 5,
      mediaOffset: clipData.mediaOffset || 0,
      sourceDuration: clipData.sourceDuration || 5,
      src: clipData.src || '',
      speed: clipData.speed || 1.0,
      transform: { ...DEFAULT_TRANSFORM, ...clipData.transform },
      filter: { ...DEFAULT_FILTER, ...clipData.filter },
      audio: { ...DEFAULT_AUDIO, ...clipData.audio },
      text: clipData.text || (clipData.type === 'text' ? {
        content: 'Title Text',
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
    get().pushHistory();
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

    // Check if playhead is strictly inside the clip
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
          startTime: clip.startTime + clip.duration + 0.2, // slight offset after original
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

  loadDemoProject: () => {
    const demoVideoTrackId = 'track-video-1';
    const demoTextTrackId = 'track-text-1';

    const videoClip: Partial<Clip> = {
      name: 'Sample Cinematic Video',
      type: 'video',
      startTime: 0,
      duration: 10,
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    };

    const textClip: Partial<Clip> = {
      name: 'Intro Title',
      type: 'text',
      startTime: 1,
      duration: 5,
      text: {
        content: 'AK CUT VIDEO EDITOR',
        fontFamily: 'sans-serif',
        fontSize: 42,
        color: '#00f2fe',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderColor: '#ffffff',
        borderWidth: 2,
        alignment: 'center',
        bold: true,
        italic: false,
      },
    };

    set({
      tracks: [
        {
          id: demoTextTrackId,
          name: 'Text & Titles',
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
          name: 'Main Video',
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
