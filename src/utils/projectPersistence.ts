const DB_NAME = 'ak_cut';
const DB_VERSION = 2;
const STORE_PROJECT = 'project_state';
const STORE_MEDIA = 'media_assets';

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
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Store Media Blob in IndexedDB media_assets store
export async function saveMediaAssetBlob(asset: PersistentMediaAsset): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_MEDIA, 'readwrite');
    const store = tx.objectStore(STORE_MEDIA);
    store.put(asset);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Failed to save media asset to IndexedDB:', e);
  }
}

// Retrieve Media Blob from IndexedDB
export async function getMediaAssetBlob(assetId: string): Promise<PersistentMediaAsset | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_MEDIA, 'readonly');
    const store = tx.objectStore(STORE_MEDIA);
    const request = store.get(assetId);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('Failed to retrieve media asset from IndexedDB:', e);
    return null;
  }
}

// Save Project State
export async function saveProjectStateToIndexedDB(projectData: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PROJECT, 'readwrite');
    const store = tx.objectStore(STORE_PROJECT);
    store.put(projectData, 'active_project');
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Failed to save project state to IndexedDB:', e);
  }
}

// Load Project State
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
    console.warn('Failed to load project state from IndexedDB:', e);
    return null;
  }
}

// Rebuild runtime Object URLs from IndexedDB Media Store
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
      const runtimeUrl = URL.createObjectURL(dbAsset.blob);
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
