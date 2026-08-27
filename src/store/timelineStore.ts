import { create } from 'zustand';
import {
  Clip,
  Track,
  MediaAsset,
  TimelineMarker,
  AspectRatio,
  MediaType,
  TransformProps,
  FilterProps,
  AudioProps,
  TextProps,
  CaptionProps,
  TransitionProps,
  ChromaKeyProps,
  MaskProps,
  Keyframe,
  SpeedCurveType,
} from '../types/timeline';
import {
  saveProjectStateToIndexedDB,
  loadProjectStateFromIndexedDB,
  saveMediaAssetBlob,
  getMediaAssetBlob,
  deleteMediaAssetBlob,
  restoreProjectWithMediaBlobs,
  createManagedObjectURL,
} from '../utils/projectPersistence';

const DEFAULT_TRANSFORM: TransformProps = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  opacity: 1,
  blendMode: 'normal',
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
  editingTextClipId: string | null;
  copiedClip: Clip | null;
  copiedTextStyle: Partial<TextProps> | null;

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
  setEditingTextClipId: (id: string | null) => void;
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

  groupSelectedClips: () => void;
  ungroupSelectedClips: () => void;

  splitSelectedClip: () => void;
  freezeFrameSelectedClip: (dataUrl: string) => void;
  duplicateSelectedClip: () => void;
  deleteSelectedClip: () => void;

  detachAudioFromSelectedClip: () => void;
  copySelectedClip: () => void;
  pasteClipAtPlayhead: () => void;
  copySelectedClipTextStyle: () => void;
  pasteSelectedClipTextStyle: () => void;

  beginTransaction: () => void;
  commitTransaction: () => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  saveProjectToDB: () => Promise<void>;
  loadProjectFromDB: () => Promise<void>;
  restoreProjectFromDB: () => Promise<void>;
  getProjectDuration: () => number;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  isPlaying: false,
  currentTime: 0,
  maxTimelineDuration: 60,
  fps: 30,
  aspectRatio: '16:9',
  zoomLevel: 100,
  snappingEnabled: true,
  rippleDeleteEnabled: false,
  saveStatus: 'Saved',

  layoutMode: 'auto',
  isLeftPanelOpen: true,
  isRightPanelOpen: true,

  mediaAssets: [],
  markers: [],
  tracks: [
    { id: 'track-v1', name: 'Main Video', type: 'video', locked: false, hidden: false, muted: false, clips: [] },
    { id: 'track-a1', name: 'Audio 1', type: 'audio', locked: false, hidden: false, muted: false, clips: [] },
  ],
  selectedClipId: null,
  selectedClipIds: [],
  editingTextClipId: null,
  copiedClip: null,
  copiedTextStyle: null,

  history: [],
  historyIndex: -1,

  setLayoutMode: (mode) => set({ layoutMode: mode }),
  toggleLeftPanel: () => set((state) => ({ isLeftPanelOpen: !state.isLeftPanelOpen })),
  toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
  setLeftPanelOpen: (open) => set({ isLeftPanelOpen: open }),
  setRightPanelOpen: (open) => set({ isRightPanelOpen: open }),

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
  setZoomLevel: (zoom) => set({ zoomLevel: Math.max(10, Math.min(500, zoom)) }),

  setAspectRatio: (ratio) => {
    get().pushHistory();
    set({ aspectRatio: ratio });
    get().saveProjectToDB();
  },

  setSelectedClipId: (id) =>
    set((state) => ({
      selectedClipId: id,
      selectedClipIds: id ? [id] : [],
      editingTextClipId: state.editingTextClipId === id ? id : null,
    })),

  setEditingTextClipId: (id) => set({ editingTextClipId: id }),

  toggleSelectClipId: (id) =>
    set((state) => {
      const exists = state.selectedClipIds.includes(id);
      const updated = exists ? state.selectedClipIds.filter((i) => i !== id) : [...state.selectedClipIds, id];
      return {
        selectedClipIds: updated,
        selectedClipId: updated.length > 0 ? updated[updated.length - 1] : null,
        editingTextClipId: null,
      };
    }),

  setSelectedClipIds: (ids) =>
    set({ selectedClipIds: ids, selectedClipId: ids.length > 0 ? ids[0] : null, editingTextClipId: null }),

  clearSelection: () => set({ selectedClipId: null, selectedClipIds: [], editingTextClipId: null }),
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

  addMediaAsset: (assetData, fileBlob) => {
    const id = `asset-${Date.now()}`;
    const newAsset: MediaAsset = {
      ...assetData,
      id,
      createdAt: Date.now(),
    };

    if (fileBlob) {
      saveMediaAssetBlob({
        id,
        name: assetData.name,
        mimeType: fileBlob.type,
        type: (assetData.type as string) === 'caption' ? 'video' : (assetData.type as any),
        blob: fileBlob,
        size: fileBlob.size,
        duration: assetData.duration,
        width: assetData.width,
        height: assetData.height,
      }).catch((err) => console.error('Failed to store media blob in IndexedDB:', err));
    }

    set((state) => ({ mediaAssets: [...state.mediaAssets, newAsset] }));
    get().saveProjectToDB();
    return id;
  },

  deleteMediaAsset: async (id) => {
    if (get().isAssetReferenced(id)) {
      alert('Cannot delete media asset that is currently used in timeline clips.');
      return false;
    }

    get().pushHistory();
    await deleteMediaAssetBlob(id);
    set((state) => ({
      mediaAssets: state.mediaAssets.filter((a) => a.id !== id),
    }));
    get().saveProjectToDB();
    return true;
  },

  addTrack: (type, name) => {
    get().pushHistory();
    const id = `track-${Date.now()}`;
    const count = get().tracks.filter((t) => t.type === type).length + 1;
    const trackName = name || `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${count}`;

    const newTrack: Track = {
      id,
      name: trackName,
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
    get().pushHistory();
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, name } : t)),
    }));
    get().saveProjectToDB();
  },

  toggleTrackMute: (trackId) => {
    get().pushHistory();
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t)),
    }));
    get().saveProjectToDB();
  },

  toggleTrackHidden: (trackId) => {
    get().pushHistory();
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, hidden: !t.hidden } : t)),
    }));
    get().saveProjectToDB();
  },

  toggleTrackLocked: (trackId) => {
    get().pushHistory();
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t)),
    }));
    get().saveProjectToDB();
  },

  addClipToTrack: (trackId, clipData) => {
    get().pushHistory();
    const id = `clip-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
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
      groupId: clipData.groupId,
      transform: { ...DEFAULT_TRANSFORM, ...clipData.transform },
      filter: { ...DEFAULT_FILTER, ...clipData.filter },
      audio: { ...DEFAULT_AUDIO, ...clipData.audio },
      text: clipData.text,
      caption: clipData.caption,
      shape: clipData.shape,
      sticker: clipData.sticker,
      transition: clipData.transition || { type: 'none', duration: 0.5 },
      chromaKey: clipData.chromaKey || DEFAULT_CHROMA_KEY,
      mask: clipData.mask || DEFAULT_MASK,
      keyframes: clipData.keyframes || [],
    };

    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t)),
      selectedClipId: id,
      selectedClipIds: [id],
      editingTextClipId: clipData.type === 'text' ? id : null,
    }));

    get().saveProjectToDB();
    return id;
  },

  addTextClipDirectlyOnCanvas: (initialContent = 'Type Text Here') => {
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
        fontSize: 48,
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderColor: '#00f2fe',
        borderWidth: 0,
        alignment: 'center',
        bold: true,
        italic: false,
        backgroundEnabled: true,
        backgroundOpacity: 0.6,
        backgroundPadding: 16,
        borderRadius: 8,
      },
    });

    set({ selectedClipId: clipId, selectedClipIds: [clipId], editingTextClipId: clipId });
    return clipId;
  },

  updateClip: (clipId, updates) => {
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id === clipId) {
            const updated = { ...clip, ...updates };
            if (updates.text?.content !== undefined) {
              updated.name = updates.text.content ? updates.text.content.slice(0, 20) : 'Text Clip';
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
          if (clip.id === clipId) {
            const currentText: TextProps = clip.text || {
              content: '',
              fontFamily: 'Inter, sans-serif',
              fontSize: 48,
              color: '#ffffff',
              backgroundColor: 'transparent',
              borderColor: '#000000',
              borderWidth: 0,
              alignment: 'center',
              bold: false,
              italic: false,
            };
            const updatedText: TextProps = { ...currentText, ...text };
            return {
              ...clip,
              name: updatedText.content ? updatedText.content.slice(0, 20) : 'Text Clip',
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
    get().pushHistory();
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId ? { ...clip, caption: { ...(clip.caption || { text: '', stylePreset: 'social' }), ...caption } } : clip
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
          clip.id === clipId ? { ...clip, chromaKey: { ...(clip.chromaKey || DEFAULT_CHROMA_KEY), ...chromaKey } } : clip
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
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => (clip.id === clipId ? { ...clip, speedCurve: curve } : clip)),
      })),
    }));
    get().saveProjectToDB();
  },

  addKeyframeToClip: (clipId) => {
    get().pushHistory();
    const { currentTime, tracks } = get();
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip) {
        const relTime = Math.max(0, Math.min(clip.duration, currentTime - clip.startTime));
        const newKf: Keyframe = {
          id: `kf-${Date.now()}`,
          time: relTime,
          transform: { ...clip.transform },
          filter: { ...clip.filter },
          audio: { ...clip.audio },
          text: clip.text ? { ...clip.text } : undefined,
          easing: 'linear',
        };
        const updatedKfs = [...clip.keyframes.filter((k) => Math.abs(k.time - relTime) > 0.05), newKf].sort(
          (a, b) => a.time - b.time
        );
        get().updateClip(clipId, { keyframes: updatedKfs });
        break;
      }
    }
  },

  removeKeyframeFromClip: (clipId, keyframeId) => {
    get().pushHistory();
    const { tracks } = get();
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip) {
        const updatedKfs = clip.keyframes.filter((k) => k.id !== keyframeId);
        get().updateClip(clipId, { keyframes: updatedKfs });
        break;
      }
    }
  },

  groupSelectedClips: () => {
    const { selectedClipIds, tracks, pushHistory, saveProjectToDB } = get();
    if (selectedClipIds.length < 2) return;
    pushHistory();
    const groupId = `group-${Date.now()}`;
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => (selectedClipIds.includes(clip.id) ? { ...clip, groupId } : clip)),
      })),
    }));
    saveProjectToDB();
  },

  ungroupSelectedClips: () => {
    const { selectedClipIds, tracks, pushHistory, saveProjectToDB } = get();
    if (selectedClipIds.length === 0) return;
    pushHistory();
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => (selectedClipIds.includes(clip.id) ? { ...clip, groupId: undefined } : clip)),
      })),
    }));
    saveProjectToDB();
  },

  splitSelectedClip: () => {
    get().pushHistory();
    const { selectedClipId, currentTime, tracks } = get();
    if (!selectedClipId) return;

    let targetTrack: Track | null = null;
    let targetClip: Clip | null = null;

    for (const track of tracks) {
      const found = track.clips.find((c) => c.id === selectedClipId);
      if (found) {
        targetTrack = track;
        targetClip = found;
        break;
      }
    }

    if (!targetTrack || !targetClip) return;
    if (currentTime <= targetClip.startTime || currentTime >= targetClip.startTime + targetClip.duration) return;

    const splitOffset = currentTime - targetClip.startTime;

    const firstClip: Clip = {
      ...targetClip,
      duration: splitOffset,
    };

    const secondClip: Clip = {
      ...targetClip,
      id: `clip-${Date.now()}`,
      startTime: currentTime,
      duration: targetClip.duration - splitOffset,
      mediaOffset: targetClip.mediaOffset + splitOffset,
    };

    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === targetTrack!.id
          ? {
              ...t,
              clips: t.clips.flatMap((c) => (c.id === targetClip!.id ? [firstClip, secondClip] : [c])),
            }
          : t
      ),
      selectedClipId: secondClip.id,
      selectedClipIds: [secondClip.id],
    }));

    get().saveProjectToDB();
  },

  freezeFrameSelectedClip: (dataUrl) => {
    get().pushHistory();
    const { selectedClipId, currentTime, tracks, addTrack, addClipToTrack } = get();
    if (!selectedClipId) return;

    let targetClip: Clip | null = null;
    for (const track of tracks) {
      const found = track.clips.find((c) => c.id === selectedClipId);
      if (found) {
        targetClip = found;
        break;
      }
    }
    if (!targetClip) return;

    let imageTrack = tracks.find((t) => t.type === 'image');
    let targetTrackId = imageTrack?.id || addTrack('image', 'Freeze Frame Track');

    addClipToTrack(targetTrackId, {
      name: `Freeze: ${targetClip.name}`,
      type: 'image',
      src: dataUrl,
      startTime: currentTime,
      duration: 3,
    });
  },

  duplicateSelectedClip: () => {
    get().pushHistory();
    const { selectedClipId, tracks } = get();
    if (!selectedClipId) return;

    for (const track of tracks) {
      const found = track.clips.find((c) => c.id === selectedClipId);
      if (found) {
        const newClip: Clip = {
          ...found,
          id: `clip-${Date.now()}`,
          startTime: found.startTime + found.duration + 0.5,
        };
        set((state) => ({
          tracks: state.tracks.map((t) => (t.id === track.id ? { ...t, clips: [...t.clips, newClip] } : t)),
          selectedClipId: newClip.id,
          selectedClipIds: [newClip.id],
        }));
        get().saveProjectToDB();
        break;
      }
    }
  },

  deleteSelectedClip: () => {
    get().pushHistory();
    const { selectedClipIds, selectedClipId } = get();
    const idsToDelete = selectedClipIds.length > 0 ? selectedClipIds : selectedClipId ? [selectedClipId] : [];
    if (idsToDelete.length === 0) return;

    set((state) => ({
      tracks: state.tracks.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => !idsToDelete.includes(c.id)),
      })),
      selectedClipId: null,
      selectedClipIds: [],
      editingTextClipId: null,
    }));

    get().saveProjectToDB();
  },

  detachAudioFromSelectedClip: () => {
    get().pushHistory();
    const { selectedClipId, tracks, addTrack, addClipToTrack } = get();
    if (!selectedClipId) return;

    let targetClip: Clip | null = null;
    for (const track of tracks) {
      const found = track.clips.find((c) => c.id === selectedClipId);
      if (found && found.type === 'video' && found.src) {
        targetClip = found;
        break;
      }
    }

    if (!targetClip) return;

    let audioTrack = tracks.find((t) => t.type === 'audio');
    let targetTrackId = audioTrack?.id || addTrack('audio', 'Extracted Audio Track');

    addClipToTrack(targetTrackId, {
      name: `Audio from ${targetClip.name}`,
      type: 'audio',
      assetId: targetClip.assetId,
      src: targetClip.src,
      startTime: targetClip.startTime,
      duration: targetClip.duration,
      mediaOffset: targetClip.mediaOffset,
      sourceDuration: targetClip.sourceDuration,
      speed: targetClip.speed,
    });

    get().updateClipAudio(targetClip.id, { muted: true });
  },

  copySelectedClip: () => {
    const { tracks, selectedClipId } = get();
    if (!selectedClipId) return;
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipId);
      if (clip) {
        set({ copiedClip: clip });
        break;
      }
    }
  },

  pasteClipAtPlayhead: () => {
    const { copiedClip, currentTime, tracks, addClipToTrack } = get();
    if (!copiedClip) return;

    let targetTrack = tracks.find((t) => t.id === copiedClip.trackId) || tracks[0];
    addClipToTrack(targetTrack.id, {
      ...copiedClip,
      startTime: currentTime,
    });
  },

  copySelectedClipTextStyle: () => {
    const { tracks, selectedClipId } = get();
    if (!selectedClipId) return;
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipId);
      if (clip && clip.text) {
        const { content, ...styleProps } = clip.text;
        set({ copiedTextStyle: styleProps });
        break;
      }
    }
  },

  pasteSelectedClipTextStyle: () => {
    const { selectedClipId, copiedTextStyle, updateClipText, pushHistory } = get();
    if (!selectedClipId || !copiedTextStyle) return;
    pushHistory();
    updateClipText(selectedClipId, copiedTextStyle);
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
    const snapshot = JSON.parse(JSON.stringify(tracks));
    newHistory.push(snapshot);
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
      const snapshot = JSON.parse(JSON.stringify(history[newIndex]));
      set({
        tracks: snapshot,
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
      const snapshot = JSON.parse(JSON.stringify(history[newIndex]));
      set({
        tracks: snapshot,
        historyIndex: newIndex,
        saveStatus: 'Unsaved changes',
      });
      get().saveProjectToDB();
    }
  },

  saveProjectToDB: async () => {
    const { tracks, mediaAssets, markers, aspectRatio } = get();
    set({ saveStatus: 'Saving...' });

    const serializableAssets = mediaAssets.map((asset) => ({
      ...asset,
      src: undefined,
    }));

    const projectData = {
      id: 'current_project',
      updatedAt: Date.now(),
      aspectRatio,
      tracks,
      mediaAssets: serializableAssets,
      markers,
    };

    try {
      await saveProjectStateToIndexedDB(projectData);
      set({ saveStatus: 'Saved' });
    } catch (e) {
      console.error('Failed to save project to IndexedDB:', e);
      set({ saveStatus: 'Unsaved changes' });
    }
  },

  loadProjectFromDB: async () => {
    try {
      const savedData = await loadProjectStateFromIndexedDB();
      if (!savedData) return;

      const restored = await restoreProjectWithMediaBlobs(savedData);
      set({
        aspectRatio: savedData.aspectRatio || '16:9',
        tracks: restored.tracks,
        mediaAssets: restored.mediaAssets,
        markers: savedData.markers || [],
        history: [restored.tracks],
        historyIndex: 0,
        saveStatus: 'Saved',
      });
    } catch (e) {
      console.error('Failed to load project from IndexedDB:', e);
    }
  },

  restoreProjectFromDB: async () => {
    return get().loadProjectFromDB();
  },

  getProjectDuration: () => {
    const { tracks } = get();
    let maxTime = 0;
    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const end = clip.startTime + clip.duration;
        if (end > maxTime) maxTime = end;
      });
    });
    return maxTime > 0 ? maxTime : 60;
  },
}));
