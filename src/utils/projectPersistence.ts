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
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Track and Create Object URL
export function createManagedObjectURL(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  activeObjectURLs.add(url);
  return url;
}

// Revoke managed Object URL
export function revokeManagedObjectURL(url: string): void {
  if (url && activeObjectURLs.has(url)) {
    URL.revokeObjectURL(url);
    activeObjectURLs.delete(url);
  }
}

// Revoke all managed Object URLs
export function revokeAllManagedObjectURLs(): void {
  activeObjectURLs.forEach((url) => URL.revokeObjectURL(url));
  activeObjectURLs.clear();
}

// Store Media Blob in IndexedDB media_assets store - STRICT ERROR THROW
export async function saveMediaAssetBlob(asset: PersistentMediaAsset): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEDIA, 'readwrite');
    const store = tx.objectStore(STORE_MEDIA);
    const req = store.put(asset);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error(`Failed to store media asset "${asset.name}" in IndexedDB: ${req.error?.message || 'IndexedDB Write Error'}`));
    tx.onerror = () => reject(new Error(`Transaction failed for media asset "${asset.name}": ${tx.error?.message || 'IndexedDB Transaction Error'}`));
  });
}

// Delete Media Blob from IndexedDB media_assets store (Priority 3)
export async function deleteMediaAssetBlob(assetId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_MEDIA, 'readwrite');
    const store = tx.objectStore(STORE_MEDIA);
    store.delete(assetId);
  } catch (e) {
    console.error(`Failed to delete media asset ${assetId} from IndexedDB:`, e);
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
    console.error('Failed to retrieve media asset from IndexedDB:', e);
    return null;
  }
}

// Save Project State - STRICT ERROR THROW
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
    console.error('Failed to load project state from IndexedDB:', e);
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
