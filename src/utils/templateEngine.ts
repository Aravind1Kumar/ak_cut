import { useTimelineStore } from '../store/timelineStore';
import { AspectRatio, MediaType } from '../types/timeline';

export interface TemplateClipPlaceholder {
  name: string;
  type: MediaType;
  startTime: number;
  duration: number;
  transform?: any;
  filter?: any;
  text?: any;
  captionStylePreset?: string;
  shape?: any;
  sticker?: any;
}

export interface TemplateTrackPlaceholder {
  name: string;
  type: MediaType;
  clips: TemplateClipPlaceholder[];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  aspectRatio: AspectRatio;
  tracks: TemplateTrackPlaceholder[];
  createdAt: number;
}

const STORAGE_KEY_TEMPLATES = 'ak_cut_project_templates';

export async function saveCurrentProjectAsTemplate(name: string): Promise<ProjectTemplate> {
  const store = useTimelineStore.getState();
  const { tracks, aspectRatio } = store;

  const templateTracks: TemplateTrackPlaceholder[] = tracks.map((track) => ({
    name: track.name,
    type: track.type,
    clips: track.clips.map((clip) => ({
      name: clip.name,
      type: clip.type,
      startTime: clip.startTime,
      duration: clip.duration,
      transform: { ...clip.transform },
      filter: { ...clip.filter },
      text: clip.text ? { ...clip.text } : undefined,
      captionStylePreset: clip.caption?.stylePreset,
      shape: clip.shape ? { ...clip.shape } : undefined,
      sticker: clip.sticker ? { ...clip.sticker } : undefined,
    })),
  }));

  const template: ProjectTemplate = {
    id: `template-${Date.now()}`,
    name,
    aspectRatio,
    tracks: templateTracks,
    createdAt: Date.now(),
  };

  try {
    const current = await getTemplatesFromDB();
    const updated = [...current.filter((t) => t.id !== template.id), template];
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save project template:', e);
  }

  return template;
}

export async function getTemplatesFromDB(): Promise<ProjectTemplate[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to load templates:', e);
    return [];
  }
}

export function applyTemplateToTimeline(template: ProjectTemplate) {
  const store = useTimelineStore.getState();
  store.pushHistory();
  store.setAspectRatio(template.aspectRatio);

  // Clear existing tracks & rebuild from template placeholders
  const trackIds = store.tracks.map((t) => t.id);
  trackIds.forEach((tid) => store.deleteTrack(tid));

  template.tracks.forEach((trackPlaceholder) => {
    const trackId = store.addTrack(trackPlaceholder.type, trackPlaceholder.name);
    trackPlaceholder.clips.forEach((clipPlaceholder) => {
      store.addClipToTrack(trackId, {
        name: clipPlaceholder.name,
        type: clipPlaceholder.type,
        startTime: clipPlaceholder.startTime,
        duration: clipPlaceholder.duration,
        mediaOffset: 0,
        sourceDuration: clipPlaceholder.duration,
        src: '',
        speed: 1,
        transform: clipPlaceholder.transform || { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0 },
        filter: clipPlaceholder.filter || { brightness: 100, contrast: 100, saturation: 100, blur: 0, hueRotate: 0, sepia: 0 },
        text: clipPlaceholder.text,
        caption: clipPlaceholder.captionStylePreset ? { text: 'Sample Caption', stylePreset: clipPlaceholder.captionStylePreset as any } : undefined,
        shape: clipPlaceholder.shape,
        sticker: clipPlaceholder.sticker,
        audio: { volume: 1, fadeIn: 0, fadeOut: 0, muted: false },
        keyframes: [],
      });
    });
  });

  store.saveProjectToDB();
}
