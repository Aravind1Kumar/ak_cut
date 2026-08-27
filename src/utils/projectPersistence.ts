const DB_NAME = 'ak_cut';
const DB_VERSION = 3;
const STORE_PROJECT = 'project_state';
const STORE_MEDIA = 'media_assets';
const STORE_PRESETS = 'user_presets';
const STORE_TEMPLATES = 'project_templates';

export interface PersistentMediaAsset {
  id: string;
  name: string;
  mimeType: string;
  type: 'video' | 'audio' | 'image';
  blob: Blob;
  size: number;
  duration?: number;
  width?: number;
  height?: number;
}

const activeObjectURLs = new Set<string>();

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PROJECT)) {
        db.createObjectStore(STORE_PROJECT);
      }
      if (!db.objectStoreNames.contains(STORE_MEDIA)) {
        db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PRESETS)) {
        db.createObjectStore(STORE_PRESETS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_TEMPLATES)) {
        db.createObjectStore(STORE_TEMPLATES, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createManagedObjectURL(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  activeObjectURLs.add(url);
  return url;
}

export function revokeAllManagedObjectURLs(): void {
  activeObjectURLs.forEach((url) => URL.revokeObjectURL(url));
  activeObjectURLs.clear();
}

export async function saveMediaAssetBlob(asset: PersistentMediaAsset): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEDIA, 'readwrite');
    const store = tx.objectStore(STORE_MEDIA);
    const req = store.put(asset);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error(`Failed to store media blob in IndexedDB: ${req.error?.message || 'IndexedDB Error'}`));
    tx.onerror = () => reject(new Error(`Media blob transaction failed: ${tx.error?.message || 'IndexedDB Error'}`));
  });
}

export async function getMediaAssetBlob(id: string): Promise<PersistentMediaAsset | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_MEDIA, 'readonly');
    const store = tx.objectStore(STORE_MEDIA);
    const request = store.get(id);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error(`Failed to load media asset ${id} from IndexedDB:`, e);
    return null;
  }
}

export async function deleteMediaAssetBlob(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEDIA, 'readwrite');
    const store = tx.objectStore(STORE_MEDIA);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveProjectStateToIndexedDB(projectData: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECT, 'readwrite');
    const store = tx.objectStore(STORE_PROJECT);
    const req = store.put(projectData, 'active_project');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error(`Failed to save project state to IndexedDB: ${req.error?.message || 'IndexedDB Error'}`));
    tx.onerror = () => reject(new Error(`Project save transaction failed: ${tx.error?.message || 'IndexedDB Error'}`));
  });
}

export async function loadProjectStateFromIndexedDB(): Promise<any | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PROJECT, 'readonly');
    const store = tx.objectStore(STORE_PROJECT);
    const request = store.get('active_project');
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to load project state from IndexedDB:', e);
    return null;
  }
}

export const saveProject = saveProjectStateToIndexedDB;
export const loadProject = loadProjectStateFromIndexedDB;

export async function restoreProjectWithMediaBlobs(projectState: any): Promise<{
  tracks: any[];
  mediaAssets: any[];
}> {
  if (!projectState || !projectState.tracks) {
    return { tracks: [], mediaAssets: [] };
  }

  const assetUrlMap = new Map<string, string>();
  const restoredMediaAssets: any[] = [];

  for (const asset of projectState.mediaAssets || []) {
    const dbAsset = await getMediaAssetBlob(asset.id);
    if (dbAsset && dbAsset.blob) {
      const runtimeUrl = createManagedObjectURL(dbAsset.blob);
      assetUrlMap.set(asset.id, runtimeUrl);
      restoredMediaAssets.push({
        ...asset,
        src: runtimeUrl,
      });
    } else {
      restoredMediaAssets.push(asset);
    }
  }

  const restoredTracks = projectState.tracks.map((track: any) => ({
    ...track,
    clips: track.clips.map((clip: any) => {
      const runtimeUrl = assetUrlMap.get(clip.assetId) || clip.src;
      return {
        ...clip,
        src: runtimeUrl,
      };
    }),
  }));

  return {
    tracks: restoredTracks,
    mediaAssets: restoredMediaAssets,
  };
}

// User Presets IndexedDB Persistence
export async function saveUserPresetToIndexedDB(preset: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PRESETS, 'readwrite');
    const store = tx.objectStore(STORE_PRESETS);
    const req = store.put(preset);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getUserPresetsFromIndexedDB(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PRESETS, 'readonly');
    const store = tx.objectStore(STORE_PRESETS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteUserPresetFromIndexedDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PRESETS, 'readwrite');
    const store = tx.objectStore(STORE_PRESETS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Project Templates IndexedDB Persistence
export async function saveTemplateToIndexedDB(template: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TEMPLATES, 'readwrite');
    const store = tx.objectStore(STORE_TEMPLATES);
    const req = store.put(template);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getTemplatesFromIndexedDB(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TEMPLATES, 'readonly');
    const store = tx.objectStore(STORE_TEMPLATES);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteTemplateFromIndexedDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TEMPLATES, 'readwrite');
    const store = tx.objectStore(STORE_TEMPLATES);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
