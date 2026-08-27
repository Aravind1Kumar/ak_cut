import { create } from 'zustand';
import {
  Clip,
  Track,
  TransformProps,
  FilterProps,
  AudioProps,
  TextProps,
  CaptionProps,
  TransitionProps,
  ChromaKeyProps,
  MaskProps,
  Keyframe,
  TimelineMarker,
  MediaAsset,
  AspectRatio,
  ProjectState,
  MediaType,
  SpeedCurveType,
} from '../types/timeline';
import { saveProject, loadProject, restoreProjectWithMediaBlobs } from '../utils/projectPersistence';

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
  targetColor: '#00ff00',
  colorDistance: 0.4,
  smoothness: 0.1,
};

const DEFAULT_MASK: MaskProps = {
  type: 'none',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
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
  markers: TimelineMarker[];
  tracks: Track[];
  selectedClipId: string | null;
  selectedClipIds: string[];
  copiedClip: Clip | null;

  history: Track[][];
  historyIndex: number;

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

  addMarker: (time?: number, label?: string, color?: string) => void;
  removeMarker: (id: string) => void;

  isAssetReferenced: (assetId: string) => boolean;
  addMediaAsset: (asset: Omit<MediaAsset, 'id' | 'createdAt'>, fileBlob?: Blob) => string;
  deleteMediaAsset: (id: string) => Promise<boolean>;

  addTrack: (type: MediaType, name?: string) => string;
  deleteTrack: (trackId: string) => void;
  renameTrack: (trackId: string, name: string) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackHidden: (trackId: string) => void;
  toggleTrackLocked: (trackId: string) => void;

  addClipToTrack: (trackId: string, clip: Partial<Clip>) => string;
  addTextClipDirectlyOnCanvas: (initialContent?: string) => string;
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
  freezeFrameSelectedClip: (dataUrl: string) => void;
  duplicateSelectedClip: () => void;
  deleteSelectedClip: () => void;
  detachAudioFromSelectedClip: () => void;
  copySelectedClip: () => void;
  pasteClipAtPlayhead: () => void;

  beginTransaction: () => void;
  commitTransaction: () => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  loadDemoProject: () => void;
  restoreProjectFromDB: () => Promise<void>;
  restoreProjectData: (projectState: any) => Promise<void>;
  getProjectDuration: () => number;
  saveProjectToDB: () => void;
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
    { id: 'track-v1', name: 'Main Video Track', type: 'video', locked: false, hidden: false, muted: false, clips: [] },
    { id: 'track-a1', name: 'Main Audio Track', type: 'audio', locked: false, hidden: false, muted: false, clips: [] },
    { id: 'track-t1', name: 'Text Track', type: 'text', locked: false, hidden: false, muted: false, clips: [] },
  ],

  selectedClipId: null,
  selectedClipIds: [],
  copiedClip: null,

  history: [],
  historyIndex: -1,

  setLayoutMode: (mode) => set({ layoutMode: mode }),
  toggleLeftPanel: () => set((state) => ({ isLeftPanelOpen: !state.isLeftPanelOpen })),
  toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
  setLeftPanelOpen: (open) => set({ isLeftPanelOpen: open }),
  setRightPanelOpen: (open) => set({ isRightPanelOpen: open }),

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
  setZoomLevel: (zoom) => set({ zoomLevel: Math.max(10, Math.min(200, zoom)) }),
  setAspectRatio: (ratio) => {
    set({ aspectRatio: ratio });
    get().saveProjectToDB();
  },

  setSelectedClipId: (id) => set({ selectedClipId: id, selectedClipIds: id ? [id] : [] }),
  toggleSelectClipId: (id) =>
    set((state) => {
      const exists = state.selectedClipIds.includes(id);
      const updated = exists ? state.selectedClipIds.filter((i) => i !== id) : [...state.selectedClipIds, id];
      return { selectedClipIds: updated, selectedClipId: updated.length > 0 ? updated[updated.length - 1] : null };
    }),

  setSelectedClipIds: (ids) => set({ selectedClipIds: ids, selectedClipId: ids.length > 0 ? ids[0] : null }),
  clearSelection: () => set({ selectedClipId: null, selectedClipIds: [] }),
  setSnappingEnabled: (enabled) => set({ snappingEnabled: enabled }),
  setRippleDeleteEnabled: (enabled) => set({ rippleDeleteEnabled: enabled }),

  addMarker: (time, label = 'Marker', color = '#00f2fe') => {
    get().pushHistory();
    const markerTime = time !== undefined ? time : get().currentTime;
    const newMarker: TimelineMarker = {
      id: `marker-${Date.now()}`,
      time: markerTime,
      label,
      color,
    };
    set((state) => ({ markers: [...state.markers, newMarker] }));
    get().saveProjectToDB();
  },

  removeMarker: (id) => {
    get().pushHistory();
    set((state) => ({ markers: state.markers.filter((m) => m.id !== id) }));
    get().saveProjectToDB();
  },

  isAssetReferenced: (assetId) => {
    const { tracks } = get();
    for (const track of tracks) {
      if (track.clips.some((clip) => clip.assetId === assetId)) return true;
    }
    return false;
  },

  addMediaAsset: (assetData) => {
    const id = `asset-${Date.now()}`;
    const newAsset: MediaAsset = {
      ...assetData,
      id,
      createdAt: Date.now(),
    };
    set((state) => ({ mediaAssets: [...state.mediaAssets, newAsset] }));
    get().saveProjectToDB();
    return id;
  },

  deleteMediaAsset: async (id) => {
    if (get().isAssetReferenced(id)) return false;
    set((state) => ({ mediaAssets: state.mediaAssets.filter((a) => a.id !== id) }));
    get().saveProjectToDB();
    return true;
  },

  addTrack: (type, name) => {
    get().pushHistory();
    const count = get().tracks.filter((t) => t.type === type).length + 1;
    const id = `track-${type}-${Date.now()}`;
    const newTrack: Track = {
      id,
      name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${count}`,
      type,
      locked: false,
      hidden: false,
      muted: false,
      clips: [],
    };
    set((state) => ({ tracks: [...state.tracks, newTrack] }));
    get().saveProjectToDB();
    return id;
  },

  deleteTrack: (trackId) => {
    get().pushHistory();
    set((state) => ({ tracks: state.tracks.filter((t) => t.id !== trackId) }));
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
      name: clipData.name || clipData.text?.content || 'Untitled Clip',
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

  addTextClipDirectlyOnCanvas: (initialContent = 'Type here') => {
    let textTrack = get().tracks.find((t) => t.type === 'text');
    let textTrackId = textTrack?.id || get().addTrack('text', 'Text Track 1');

    const clipId = get().addClipToTrack(textTrackId, {
      name: initialContent,
      type: 'text',
      startTime: get().currentTime,
      duration: 3,
      text: {
        content: initialContent,
        fontFamily: 'Inter, sans-serif',
        fontSize: 44,
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderColor: '#00f2fe',
        borderWidth: 0,
        alignment: 'center',
        bold: true,
        italic: false,
      },
    });

    set({ selectedClipId: clipId, selectedClipIds: [clipId] });
    return clipId;
  },

  updateClip: (clipId, updates) => {
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id === clipId) {
            const updated = { ...clip, ...updates };
            if (updates.text?.content) {
              updated.name = updates.text.content.slice(0, 20);
            }
            return updated;
          }
          return clip;
        }),
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
        clips: track.clips.map((clip) => {
          if (clip.id === clipId && clip.text) {
            const updatedText = { ...clip.text, ...text };
            return {
              ...clip,
              name: updatedText.content.slice(0, 20),
              text: updatedText,
            };
          }
          return clip;
        }),
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

  freezeFrameSelectedClip: (dataUrl) => {
    const { selectedClipId, currentTime, tracks } = get();
    if (!selectedClipId) return;

    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipId);
      if (clip && clip.type === 'video' && currentTime > clip.startTime && currentTime < clip.startTime + clip.duration) {
        get().pushHistory();

        const firstSegmentDuration = currentTime - clip.startTime;
        const freezeDuration = 3.0;
        const secondSegmentDuration = clip.duration - firstSegmentDuration;
        const secondMediaOffset = clip.mediaOffset + firstSegmentDuration * clip.speed;

        const updatedClips = track.clips.map((c) => {
          if (c.id === clip.id) {
            return { ...c, duration: firstSegmentDuration };
          }
          return c;
        });

        const freezeClipId = `clip-freeze-${Date.now()}`;
        const freezeClip: Clip = {
          id: freezeClipId,
          trackId: track.id,
          name: `Freeze: ${clip.name}`,
          type: 'image',
          startTime: currentTime,
          duration: freezeDuration,
          mediaOffset: 0,
          sourceDuration: freezeDuration,
          src: dataUrl,
          speed: 1,
          transform: { ...clip.transform },
          filter: { ...clip.filter },
          audio: { volume: 0, fadeIn: 0, fadeOut: 0, muted: true },
          transition: { type: 'none', duration: 0.5 },
          keyframes: [],
        };

        const secondClipId = `clip-${Date.now()}-2`;
        const secondClip: Clip = {
          ...clip,
          id: secondClipId,
          startTime: currentTime + freezeDuration,
          duration: secondSegmentDuration,
          mediaOffset: secondMediaOffset,
        };

        set((state) => ({
          tracks: state.tracks.map((t) =>
            t.id === track.id
              ? { ...t, clips: [...updatedClips.filter((c) => c.id !== secondClipId), freezeClip, secondClip] }
              : t
          ),
          selectedClipId: freezeClipId,
          selectedClipIds: [freezeClipId],
        }));

        get().saveProjectToDB();
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
        const deletedOnTrack = track.clips.filter((c) => selectedClipIds.includes(c.id));
        const remainingClips = track.clips.filter((c) => !selectedClipIds.includes(c.id));

        if (!rippleDeleteEnabled || deletedOnTrack.length === 0) {
          return { ...track, clips: remainingClips };
        }

        const sortedDeleted = [...deletedOnTrack].sort((a, b) => a.startTime - b.startTime);
        const rippledClips = remainingClips.map((clip) => {
          const deletedBefore = sortedDeleted.filter((dc) => dc.startTime < clip.startTime);
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
        if (clip) {
          clipsToCopy.push(clip);
          break;
        }
      }
    });

    if (clipsToCopy.length > 0) {
      set({ copiedClip: clipsToCopy[0] });
    }
  },

  pasteClipAtPlayhead: () => {
    const { copiedClip, currentTime, tracks } = get();
    if (!copiedClip) return;

    let targetTrack = tracks.find((t) => t.type === copiedClip.type);
    let targetTrackId = targetTrack?.id || get().addTrack(copiedClip.type);

    get().addClipToTrack(targetTrackId, {
      ...copiedClip,
      id: undefined,
      startTime: currentTime,
    });
  },

  beginTransaction: () => {
    get().pushHistory();
  },

  commitTransaction: () => {
    get().saveProjectToDB();
  },

  pushHistory: () => {
    const { tracks, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(tracks)));
    if (newHistory.length > 50) newHistory.shift();

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      saveStatus: 'Unsaved changes',
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevTracks = history[historyIndex - 1];
      set({
        tracks: JSON.parse(JSON.stringify(prevTracks)),
        historyIndex: historyIndex - 1,
        saveStatus: 'Unsaved changes',
      });
      get().saveProjectToDB();
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextTracks = history[historyIndex + 1];
      set({
        tracks: JSON.parse(JSON.stringify(nextTracks)),
        historyIndex: historyIndex + 1,
        saveStatus: 'Unsaved changes',
      });
      get().saveProjectToDB();
    }
  },

  getProjectDuration: () => {
    const { tracks } = get();
    let max = 10;
    tracks.forEach((t) => {
      t.clips.forEach((c) => {
        const end = c.startTime + c.duration;
        if (end > max) max = end;
      });
    });
    return max;
  },

  saveProjectToDB: () => {
    set({ saveStatus: 'Saving...' });
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);

    saveDebounceTimer = setTimeout(async () => {
      const { aspectRatio, tracks, mediaAssets, markers } = get();
      const duration = get().getProjectDuration();

      const stateToSave: ProjectState = {
        id: 'default_project',
        name: localStorage.getItem('ak_cut_project_name') || 'Untitled Project',
        updatedAt: Date.now(),
        aspectRatio,
        duration,
        tracks,
        mediaAssets,
        markers,
      };

      try {
        await saveProject(stateToSave);
        set({ saveStatus: 'Saved' });
      } catch (err) {
        console.error('Autosave Error:', err);
        set({ saveStatus: 'Unsaved changes' });
      }
    }, 400);
  },

  restoreProjectFromDB: async () => {
    try {
      const state = await loadProject();
      if (state) {
        const restored = await restoreProjectWithMediaBlobs(state);
        set({
          aspectRatio: state.aspectRatio || '16:9',
          tracks: restored.tracks || state.tracks,
          mediaAssets: restored.mediaAssets || state.mediaAssets,
          markers: state.markers || [],
          saveStatus: 'Saved',
        });
      }
    } catch (e) {
      console.error('Failed to restore project state:', e);
    }
  },

  restoreProjectData: async (projectState: any) => {
    try {
      const restored = await restoreProjectWithMediaBlobs(projectState);
      set({
        aspectRatio: projectState.aspectRatio || '16:9',
        tracks: restored.tracks || projectState.tracks,
        mediaAssets: restored.mediaAssets || projectState.mediaAssets,
        markers: projectState.markers || [],
        saveStatus: 'Saved',
      });
      get().saveProjectToDB();
    } catch (e) {
      console.error('Failed to restore project data:', e);
    }
  },

  loadDemoProject: () => {
    set({ saveStatus: 'Saved' });
  },
}));
