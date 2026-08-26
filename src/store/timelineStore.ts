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
  CaptionProps,
  MediaAsset,
  TransitionProps,
  ChromaKeyProps,
  MaskProps,
  SpeedCurveType,
  Keyframe,
  TimelineMarker,
} from '../types/timeline';
import {
  saveProjectStateToIndexedDB,
  loadProjectStateFromIndexedDB,
  saveMediaAssetBlob,
  restoreProjectWithMediaBlobs,
} from '../utils/projectPersistence';

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

export type LayoutMode = 'auto' | 'mobile' | 'desktop';
export type SaveStatus = 'Saved' | 'Saving...' | 'Unsaved changes';

interface TimelineState {
  isPlaying: boolean;
  currentTime: number;
  maxTimelineDuration: number;
  fps: number;
  aspectRatio: AspectRatio;
  zoomLevel: number;
  snappingEnabled: boolean;
  rippleDeleteEnabled: boolean;
  saveStatus: SaveStatus;

  layoutMode: LayoutMode;
  isLeftPanelOpen: boolean;
  isRightPanelOpen: boolean;

  mediaAssets: MediaAsset[];
  tracks: Track[];
  markers: TimelineMarker[];
  selectedClipId: string | null;
  selectedClipIds: string[];
  copiedClips: Clip[];

  history: Track[][];
  historyIndex: number;

  getProjectDuration: () => number;
  saveProjectToDB: () => Promise<void>;
  restoreProjectFromDB: () => Promise<void>;

  setLayoutMode: (mode: LayoutMode) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;

  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setZoomLevel: (zoom: number) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setSelectedClipId: (id: string | null) => void;
  toggleSelectClipId: (id: string) => void;
  setSelectedClipIds: (ids: string[]) => void;
  clearSelection: () => void;
  setSnappingEnabled: (enabled: boolean) => void;
  setRippleDeleteEnabled: (enabled: boolean) => void;

  // Timeline Markers
  addMarker: (time?: number, label?: string, color?: string) => void;
  removeMarker: (id: string) => void;

  addMediaAsset: (asset: Omit<MediaAsset, 'id' | 'createdAt'>, fileBlob?: Blob) => string;
  deleteMediaAsset: (id: string) => void;

  addTrack: (type: MediaType, name?: string) => string;
  deleteTrack: (trackId: string) => void;
  renameTrack: (trackId: string, name: string) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackHidden: (trackId: string) => void;
  toggleTrackLocked: (trackId: string) => void;

  addClipToTrack: (trackId: string, clip: Partial<Clip>) => string;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  updateClipTransform: (clipId: string, transform: Partial<TransformProps>) => void;
  updateClipFilter: (clipId: string, filter: Partial<FilterProps>) => void;
  updateClipAudio: (clipId: string, audio: Partial<AudioProps>) => void;
  updateClipText: (clipId: string, text: Partial<TextProps>) => void;
  updateClipCaption: (clipId: string, caption: Partial<CaptionProps>) => void;
  updateClipTransition: (clipId: string, transition: Partial<TransitionProps>) => void;
  updateClipChromaKey: (clipId: string, chromaKey: Partial<ChromaKeyProps>) => void;
  updateClipMask: (clipId: string, mask: Partial<MaskProps>) => void;
  updateClipSpeedCurve: (clipId: string, curve: SpeedCurveType) => void;
  addKeyframeToClip: (clipId: string) => void;
  removeKeyframeFromClip: (clipId: string, keyframeId: string) => void;

  splitSelectedClip: () => void;
  duplicateSelectedClip: () => void;
  deleteSelectedClip: () => void;
  detachAudioFromSelectedClip: () => void;
  copySelectedClip: () => void;
  pasteClipAtPlayhead: () => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  loadDemoProject: () => void;
}

let saveDebounceTimer: any = null;

export const useTimelineStore = create<TimelineState>((set, get) => ({
  isPlaying: false,
  currentTime: 0,
  maxTimelineDuration: 60,
  fps: 30,
  aspectRatio: '16:9',
  zoomLevel: 40,
  snappingEnabled: true,
  rippleDeleteEnabled: false,
  saveStatus: 'Saved',

  layoutMode: 'auto',
  isLeftPanelOpen: true,
  isRightPanelOpen: true,

  mediaAssets: [],
  markers: [],
  tracks: [
    {
      id: 'track-video-1',
      name: 'Video Track 1',
      type: 'video',
      muted: false,
      locked: false,
      hidden: false,
      clips: [],
    },
    {
      id: 'track-text-1',
      name: 'Text Track 1',
      type: 'text',
      muted: false,
      locked: false,
      hidden: false,
      clips: [],
    },
    {
      id: 'track-audio-1',
      name: 'Audio Track 1',
      type: 'audio',
      muted: false,
      locked: false,
      hidden: false,
      clips: [],
    },
  ],

  selectedClipId: null,
  selectedClipIds: [],
  copiedClips: [],
  history: [],
  historyIndex: -1,

  getProjectDuration: () => {
    const { tracks } = get();
    let maxEnd = 10;
    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const clipEnd = clip.startTime + clip.duration;
        if (clipEnd > maxEnd) maxEnd = clipEnd;
      });
    });
    return Math.ceil(maxEnd);
  },

  saveProjectToDB: async () => {
    set({ saveStatus: 'Saving...' });
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);

    saveDebounceTimer = setTimeout(async () => {
      const state = get();
      const projectData = {
        aspectRatio: state.aspectRatio,
        zoomLevel: state.zoomLevel,
        maxTimelineDuration: state.maxTimelineDuration,
        tracks: state.tracks,
        mediaAssets: state.mediaAssets,
        markers: state.markers,
      };
      await saveProjectStateToIndexedDB(projectData);
      set({ saveStatus: 'Saved' });
    }, 500);
  },

  restoreProjectFromDB: async () => {
    const rawState = await loadProjectStateFromIndexedDB();
    if (rawState) {
      const { tracks, mediaAssets } = await restoreProjectWithMediaBlobs(rawState);
      set({
        aspectRatio: rawState.aspectRatio || '16:9',
        zoomLevel: rawState.zoomLevel || 40,
        maxTimelineDuration: rawState.maxTimelineDuration || 60,
        tracks: tracks || [],
        mediaAssets: mediaAssets || [],
        markers: rawState.markers || [],
        saveStatus: 'Saved',
      });
    }
  },

  setLayoutMode: (mode) => set({ layoutMode: mode }),
  toggleLeftPanel: () => set((state) => ({ isLeftPanelOpen: !state.isLeftPanelOpen })),
  toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
  setLeftPanelOpen: (open) => set({ isLeftPanelOpen: open }),
  setRightPanelOpen: (open) => set({ isRightPanelOpen: open }),

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
  setZoomLevel: (zoom) => set({ zoomLevel: Math.max(10, Math.min(400, zoom)) }),
  setAspectRatio: (ratio) => {
    set({ aspectRatio: ratio });
    get().saveProjectToDB();
  },
  setSelectedClipId: (id) => set({ selectedClipId: id, selectedClipIds: id ? [id] : [] }),
  toggleSelectClipId: (id) => {
    const { selectedClipIds } = get();
    if (selectedClipIds.includes(id)) {
      const next = selectedClipIds.filter((i) => i !== id);
      set({ selectedClipIds: next, selectedClipId: next[next.length - 1] || null });
    } else {
      const next = [...selectedClipIds, id];
      set({ selectedClipIds: next, selectedClipId: id });
    }
  },
  setSelectedClipIds: (ids) => set({ selectedClipIds: ids, selectedClipId: ids[0] || null }),
  clearSelection: () => set({ selectedClipId: null, selectedClipIds: [] }),
  setSnappingEnabled: (enabled) => set({ snappingEnabled: enabled }),
  setRippleDeleteEnabled: (enabled) => set({ rippleDeleteEnabled: enabled }),

  addMarker: (time, label, color) => {
    const markerTime = time ?? get().currentTime;
    const newMarker: TimelineMarker = {
      id: `marker-${Date.now()}`,
      time: markerTime,
      label: label || `Marker ${get().markers.length + 1}`,
      color: color || '#00f2fe',
    };
    set((state) => ({ markers: [...state.markers, newMarker] }));
    get().saveProjectToDB();
  },

  removeMarker: (id) => {
    set((state) => ({ markers: state.markers.filter((m) => m.id !== id) }));
    get().saveProjectToDB();
  },

  addMediaAsset: (assetData, fileBlob) => {
    const id = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newAsset: MediaAsset = {
      ...assetData,
      id,
      assetId: id,
      createdAt: Date.now(),
    };

    if (fileBlob) {
      saveMediaAssetBlob({
        id,
        name: assetData.name,
        mimeType: fileBlob.type || 'video/mp4',
        type: assetData.type as any,
        blob: fileBlob,
        size: fileBlob.size,
        duration: assetData.duration,
      });
    }

    set((state) => ({ mediaAssets: [...state.mediaAssets, newAsset] }));
    get().saveProjectToDB();
    return id;
  },

  deleteMediaAsset: (id) => {
    set((state) => ({
      mediaAssets: state.mediaAssets.filter((a) => a.id !== id),
    }));
    get().saveProjectToDB();
  },

  addTrack: (type, name) => {
    get().pushHistory();
    const id = `track-${type}-${Date.now()}`;
    const trackName = name || `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${get().tracks.length + 1}`;
    const newTrack: Track = {
      id,
      name: trackName,
      type,
      muted: false,
      locked: false,
      hidden: false,
      clips: [],
    };
    set((state) => ({ tracks: [...state.tracks, newTrack] }));
    get().saveProjectToDB();
    return id;
  },

  deleteTrack: (trackId) => {
    get().pushHistory();
    set((state) => ({
      tracks: state.tracks.filter((t) => t.id !== trackId),
    }));
    get().saveProjectToDB();
  },

  renameTrack: (trackId, name) => {
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, name } : t)),
    }));
    get().saveProjectToDB();
  },

  toggleTrackMute: (trackId) => {
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t)),
    }));
    get().saveProjectToDB();
  },

  toggleTrackHidden: (trackId) => {
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, hidden: !t.hidden } : t)),
    }));
    get().saveProjectToDB();
  },

  toggleTrackLocked: (trackId) => {
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t)),
    }));
    get().saveProjectToDB();
  },

  addClipToTrack: (trackId, clipData) => {
    get().pushHistory();
    const id = `clip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newClip: Clip = {
      id,
      assetId: clipData.assetId,
      trackId,
      name: clipData.name || 'Untitled Clip',
      type: clipData.type || 'video',
      startTime: clipData.startTime ?? get().currentTime,
      duration: clipData.duration ?? 5,
      mediaOffset: clipData.mediaOffset ?? 0,
      sourceDuration: clipData.sourceDuration ?? 10,
      src: clipData.src || '',
      speed: clipData.speed ?? 1,
      speedCurve: clipData.speedCurve || 'flat',
      transform: { ...DEFAULT_TRANSFORM, ...clipData.transform },
      filter: { ...DEFAULT_FILTER, ...clipData.filter },
      audio: { ...DEFAULT_AUDIO, ...clipData.audio },
      text: clipData.text,
      caption: clipData.caption,
      transition: clipData.transition || { type: 'none', duration: 0.5 },
      chromaKey: clipData.chromaKey || DEFAULT_CHROMA_KEY,
      mask: clipData.mask || DEFAULT_MASK,
      keyframes: clipData.keyframes || [],
    };

    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t)),
      selectedClipId: id,
      selectedClipIds: [id],
    }));

    get().saveProjectToDB();
    return id;
  },

  updateClip: (clipId, updates) => {
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => (clip.id === clipId ? { ...clip, ...updates } : clip)),
      })),
    }));
    get().saveProjectToDB();
  },

  updateClipTransform: (clipId, transform) => {
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId ? { ...clip, transform: { ...clip.transform, ...transform } } : clip
        ),
      })),
    }));
    get().saveProjectToDB();
  },

  updateClipFilter: (clipId, filter) => {
    get().pushHistory();
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId ? { ...clip, filter: { ...clip.filter, ...filter } } : clip
        ),
      })),
    }));
    get().saveProjectToDB();
  },

  updateClipAudio: (clipId, audio) => {
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId ? { ...clip, audio: { ...clip.audio, ...audio } } : clip
        ),
      })),
    }));
    get().saveProjectToDB();
  },

  updateClipText: (clipId, text) => {
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId && clip.text ? { ...clip, text: { ...clip.text, ...text } } : clip
        ),
      })),
    }));
    get().saveProjectToDB();
  },

  updateClipCaption: (clipId, caption) => {
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId && clip.caption ? { ...clip, caption: { ...clip.caption, ...caption } } : clip
        ),
      })),
    }));
    get().saveProjectToDB();
  },

  updateClipTransition: (clipId, transition) => {
    get().pushHistory();
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId
            ? { ...clip, transition: { ...clip.transition, type: transition.type || 'none', duration: transition.duration || 0.5 } }
            : clip
        ),
      })),
    }));
    get().saveProjectToDB();
  },

  updateClipChromaKey: (clipId, chromaKey) => {
    get().pushHistory();
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId
            ? { ...clip, chromaKey: { ...(clip.chromaKey || DEFAULT_CHROMA_KEY), ...chromaKey } }
            : clip
        ),
      })),
    }));
    get().saveProjectToDB();
  },

  updateClipMask: (clipId, mask) => {
    get().pushHistory();
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId ? { ...clip, mask: { ...(clip.mask || DEFAULT_MASK), ...mask } } : clip
        ),
      })),
    }));
    get().saveProjectToDB();
  },

  updateClipSpeedCurve: (clipId, curve) => {
    get().pushHistory();
    let speedMult = 1;
    if (curve === 'hero') speedMult = 1.5;
    else if (curve === 'montage') speedMult = 2;
    else if (curve === 'bulletTime') speedMult = 0.5;

    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId ? { ...clip, speedCurve: curve, speed: speedMult } : clip
        ),
      })),
    }));
    get().saveProjectToDB();
  },

  addKeyframeToClip: (clipId) => {
    get().pushHistory();
    const { currentTime } = get();

    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id === clipId) {
            const relTime = Math.max(0, currentTime - clip.startTime);
            const kfId = `kf-${Date.now()}`;
            const newKf: Keyframe = {
              id: kfId,
              time: relTime,
              transform: { ...clip.transform },
            };
            return { ...clip, keyframes: [...clip.keyframes, newKf] };
          }
          return clip;
        }),
      })),
    }));
    get().saveProjectToDB();
  },

  removeKeyframeFromClip: (clipId, keyframeId) => {
    get().pushHistory();
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId
            ? { ...clip, keyframes: clip.keyframes.filter((k) => k.id !== keyframeId) }
            : clip
        ),
      })),
    }));
    get().saveProjectToDB();
  },

  splitSelectedClip: () => {
    const { selectedClipId, currentTime, tracks } = get();
    if (!selectedClipId) return;

    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipId);
      if (clip && currentTime > clip.startTime && currentTime < clip.startTime + clip.duration) {
        get().pushHistory();
        const firstSegmentDuration = currentTime - clip.startTime;
        const secondSegmentDuration = clip.duration - firstSegmentDuration;

        get().updateClip(clip.id, { duration: firstSegmentDuration });

        get().addClipToTrack(track.id, {
          ...clip,
          id: undefined,
          startTime: currentTime,
          duration: secondSegmentDuration,
          mediaOffset: clip.mediaOffset + firstSegmentDuration * clip.speed,
        });

        break;
      }
    }
  },

  duplicateSelectedClip: () => {
    const { selectedClipIds, tracks } = get();
    if (selectedClipIds.length === 0) return;

    get().pushHistory();
    selectedClipIds.forEach((clipId) => {
      for (const track of tracks) {
        const clip = track.clips.find((c) => c.id === clipId);
        if (clip) {
          get().addClipToTrack(track.id, {
            ...clip,
            id: undefined,
            startTime: clip.startTime + clip.duration + 0.2,
          });
          break;
        }
      }
    });
  },

  deleteSelectedClip: () => {
    const { selectedClipIds, rippleDeleteEnabled, tracks } = get();
    if (selectedClipIds.length === 0) return;

    get().pushHistory();

    set((state) => ({
      tracks: state.tracks.map((track) => {
        const remainingClips = track.clips.filter((c) => !selectedClipIds.includes(c.id));
        if (!rippleDeleteEnabled) return { ...track, clips: remainingClips };

        // Ripple Delete Adjustment
        let shift = 0;
        const sorted = [...track.clips].sort((a, b) => a.startTime - b.startTime);
        const rippledClips = sorted
          .filter((c) => !selectedClipIds.includes(c.id))
          .map((clip) => {
            const deletedBefore = sorted.filter(
              (dc) => selectedClipIds.includes(dc.id) && dc.startTime < clip.startTime
            );
            const totalDeletedDuration = deletedBefore.reduce((acc, dc) => acc + dc.duration, 0);
            return {
              ...clip,
              startTime: Math.max(0, clip.startTime - totalDeletedDuration),
            };
          });

        return { ...track, clips: rippledClips };
      }),
      selectedClipId: null,
      selectedClipIds: [],
    }));

    get().saveProjectToDB();
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
          assetId: clip.assetId,
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
    const { selectedClipIds, tracks } = get();
    const clipsToCopy: Clip[] = [];

    selectedClipIds.forEach((id) => {
      for (const track of tracks) {
        const clip = track.clips.find((c) => c.id === id);
        if (clip) clipsToCopy.push({ ...clip });
      }
    });

    if (clipsToCopy.length > 0) {
      set({ copiedClips: clipsToCopy });
    }
  },

  pasteClipAtPlayhead: () => {
    const { copiedClips, currentTime, tracks } = get();
    if (copiedClips.length === 0) return;

    get().pushHistory();
    const minStart = Math.min(...copiedClips.map((c) => c.startTime));

    copiedClips.forEach((clip) => {
      const targetTrack = tracks.find((t) => t.type === clip.type) || tracks[0];
      const offsetFromMin = clip.startTime - minStart;

      get().addClipToTrack(targetTrack.id, {
        ...clip,
        id: undefined,
        startTime: currentTime + offsetFromMin,
      });
    });
  },

  pushHistory: () => {
    const { tracks, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(tracks)));
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      saveStatus: 'Unsaved changes',
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({
        tracks: JSON.parse(JSON.stringify(history[newIndex])),
        historyIndex: newIndex,
        saveStatus: 'Unsaved changes',
      });
      get().saveProjectToDB();
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set({
        tracks: JSON.parse(JSON.stringify(history[newIndex])),
        historyIndex: newIndex,
        saveStatus: 'Unsaved changes',
      });
      get().saveProjectToDB();
    }
  },

  loadDemoProject: () => {
    get().restoreProjectFromDB();
  },
}));
