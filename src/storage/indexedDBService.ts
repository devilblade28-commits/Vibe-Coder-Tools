/**
 * IndexedDB Service
 * 
 * Handles persistent storage of project content using IndexedDB.
 * This is the source of truth for all project data including files, folders, and assets.
 * 
 * **Use IndexedDB for:**
 * - Project metadata
 * - File content (code, text)
 * - Folder structure
 * - Binary assets (images, fonts, etc.)
 * 
 * **NEVER store in localStorage:**
 * - File content
 * - Binary blobs
 * - Large data structures
 * 
 * Object stores:
 * - `projects` — Project metadata (keyed by id)
 * - `files` — ProjectFile records (indexed by projectId)
 * - `folders` — ProjectFolder records (indexed by projectId)
 * - `assets` — ProjectAsset records with Blob (indexed by projectId)
 * 
 * @module indexedDBService
 */

const DB_NAME = 'ai-builder-db'
const DB_VERSION = 2  // bumped for assets store

type StoreName = 'projects' | 'files' | 'folders' | 'assets'

/** Cached database instance for performance */
let _db: IDBDatabase | null = null

// ─── Database Connection ───────────────────────────────────────────────────────

/**
 * Opens the IndexedDB database, creating it if necessary.
 * Returns a cached instance if already opened.
 * 
 * Handles database upgrades and schema migrations automatically.
 * 
 * @returns Promise resolving to the IDBDatabase instance
 * @throws Error if the database cannot be opened
 */
export function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('files')) {
        const fileStore = db.createObjectStore('files', { keyPath: 'id' })
        fileStore.createIndex('projectId', 'projectId', { unique: false })
      }
      if (!db.objectStoreNames.contains('folders')) {
        const folderStore = db.createObjectStore('folders', { keyPath: 'id' })
        folderStore.createIndex('projectId', 'projectId', { unique: false })
      }
      if (!db.objectStoreNames.contains('assets')) {
        const assetStore = db.createObjectStore('assets', { keyPath: 'id' })
        assetStore.createIndex('projectId', 'projectId', { unique: false })
      }
    }

    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result
      // Handle database being closed externally (e.g., deleteDatabase)
      _db.onclose = () => { _db = null }
      _db.onerror = (ev) => console.error('[IndexedDB] Database error:', ev)
      resolve(_db)
    }

    req.onerror = () => {
      console.error('[IndexedDB] Failed to open database:', req.error)
      reject(req.error)
    }
    req.onblocked = () => console.warn('[IndexedDB] Upgrade blocked by another tab')
  })
}

/**
 * Wraps an IDBRequest in a Promise for async/await usage.
 * 
 * @template T - The type of the request result
 * @param req - The IDBRequest to wrap
 * @returns Promise resolving to the request result
 */
function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      console.error('[IndexedDB] Request error:', req.error)
      reject(req.error)
    }
  })
}

/**
 * Opens a transaction and returns the object store.
 * 
 * @param store - The store name to open
 * @param mode - Transaction mode ('readonly' or 'readwrite')
 * @returns Promise resolving to an object with the store and transaction
 */
async function txStore(store: StoreName, mode: IDBTransactionMode = 'readonly') {
  const db = await openDB()
  const tx = db.transaction(store, mode)
  return { store: tx.objectStore(store), tx }
}

// ─── Projects ────────────────────────────────────────────────────────────────

/**
 * Retrieves a project by ID.
 * 
 * @template T - The project type (usually Project from types)
 * @param id - The project ID
 * @returns Promise resolving to the project or undefined if not found
 */
export async function getProject<T>(id: string): Promise<T | undefined> {
  try {
    const { store } = await txStore('projects')
    return wrap(store.get(id))
  } catch (error) {
    console.error(`[IndexedDB] Failed to get project "${id}":`, error)
    throw error
  }
}

/**
 * Stores a project in the database.
 * Creates or updates depending on whether the ID exists.
 * 
 * @template T - The project type
 * @param project - The project object to store
 */
export async function putProject<T>(project: T): Promise<void> {
  try {
    const { store } = await txStore('projects', 'readwrite')
    await wrap(store.put(project))
  } catch (error) {
    console.error('[IndexedDB] Failed to put project:', error)
    throw error
  }
}

/**
 * Deletes a project by ID.
 * Note: This does NOT delete associated files, folders, or assets.
 * Use deleteFilesForProject, deleteFoldersForProject, deleteAssetsForProject.
 * 
 * @param id - The project ID to delete
 */
export async function deleteProject(id: string): Promise<void> {
  try {
    const { store } = await txStore('projects', 'readwrite')
    await wrap(store.delete(id))
  } catch (error) {
    console.error(`[IndexedDB] Failed to delete project "${id}":`, error)
    throw error
  }
}

// ─── Files ───────────────────────────────────────────────────────────────────

/**
 * Retrieves all files for a given project.
 * 
 * @template T - The file type (usually ProjectFile from types)
 * @param projectId - The project ID
 * @returns Promise resolving to an array of files
 */
export async function getFilesForProject<T>(projectId: string): Promise<T[]> {
  try {
    const { store } = await txStore('files')
    return wrap(store.index('projectId').getAll(projectId))
  } catch (error) {
    console.error(`[IndexedDB] Failed to get files for project "${projectId}":`, error)
    throw error
  }
}

/**
 * Retrieves a single file by ID.
 * 
 * @template T - The file type
 * @param id - The file ID
 * @returns Promise resolving to the file or undefined if not found
 */
export async function getFile<T>(id: string): Promise<T | undefined> {
  try {
    const { store } = await txStore('files')
    return wrap(store.get(id))
  } catch (error) {
    console.error(`[IndexedDB] Failed to get file "${id}":`, error)
    throw error
  }
}

/**
 * Stores a file in the database.
 * Creates or updates depending on whether the ID exists.
 * 
 * @template T - The file type
 * @param file - The file object to store
 */
export async function putFile<T>(file: T): Promise<void> {
  try {
    const { store } = await txStore('files', 'readwrite')
    await wrap(store.put(file))
  } catch (error) {
    console.error('[IndexedDB] Failed to put file:', error)
    throw error
  }
}

/**
 * Deletes a file by ID.
 * 
 * @param id - The file ID to delete
 */
export async function deleteFile(id: string): Promise<void> {
  try {
    const { store } = await txStore('files', 'readwrite')
    await wrap(store.delete(id))
  } catch (error) {
    console.error(`[IndexedDB] Failed to delete file "${id}":`, error)
    throw error
  }
}

/**
 * Deletes all files for a project in a single transaction.
 * More efficient than deleting files one by one.
 * 
 * @param projectId - The project ID
 */
export async function deleteFilesForProject(projectId: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction('files', 'readwrite')
    const store = tx.objectStore('files')

    const ids: string[] = await wrap(store.index('projectId').getAllKeys(projectId) as IDBRequest<string[]>)

    return new Promise((resolve, reject) => {
      let pending = ids.length
      if (pending === 0) { resolve(); return }

      for (const id of ids) {
        const req = store.delete(id)
        req.onsuccess = () => { if (--pending === 0) resolve() }
        req.onerror = () => reject(req.error)
      }

      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.error(`[IndexedDB] Failed to delete files for project "${projectId}":`, error)
    throw error
  }
}

// ─── Folders ─────────────────────────────────────────────────────────────────

/**
 * Retrieves all folders for a given project.
 * 
 * @template T - The folder type (usually ProjectFolder from types)
 * @param projectId - The project ID
 * @returns Promise resolving to an array of folders
 */
export async function getFoldersForProject<T>(projectId: string): Promise<T[]> {
  try {
    const { store } = await txStore('folders')
    return wrap(store.index('projectId').getAll(projectId))
  } catch (error) {
    console.error(`[IndexedDB] Failed to get folders for project "${projectId}":`, error)
    throw error
  }
}

/**
 * Stores a folder in the database.
 * Creates or updates depending on whether the ID exists.
 * 
 * @template T - The folder type
 * @param folder - The folder object to store
 */
export async function putFolder<T>(folder: T): Promise<void> {
  try {
    const { store } = await txStore('folders', 'readwrite')
    await wrap(store.put(folder))
  } catch (error) {
    console.error('[IndexedDB] Failed to put folder:', error)
    throw error
  }
}

/**
 * Deletes a folder by ID.
 * 
 * @param id - The folder ID to delete
 */
export async function deleteFolder(id: string): Promise<void> {
  try {
    const { store } = await txStore('folders', 'readwrite')
    await wrap(store.delete(id))
  } catch (error) {
    console.error(`[IndexedDB] Failed to delete folder "${id}":`, error)
    throw error
  }
}

/**
 * Deletes all folders for a project in a single transaction.
 * 
 * @param projectId - The project ID
 */
export async function deleteFoldersForProject(projectId: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction('folders', 'readwrite')
    const store = tx.objectStore('folders')
    const ids: string[] = await wrap(store.index('projectId').getAllKeys(projectId) as IDBRequest<string[]>)

    return new Promise((resolve, reject) => {
      let pending = ids.length
      if (pending === 0) { resolve(); return }
      for (const id of ids) {
        const req = store.delete(id)
        req.onsuccess = () => { if (--pending === 0) resolve() }
        req.onerror = () => reject(req.error)
      }
      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.error(`[IndexedDB] Failed to delete folders for project "${projectId}":`, error)
    throw error
  }
}

// ─── Assets ──────────────────────────────────────────────────────────────────

/**
 * Retrieves all assets for a given project.
 * 
 * @template T - The asset type (usually ProjectAsset from types)
 * @param projectId - The project ID
 * @returns Promise resolving to an array of assets
 */
export async function getAssetsForProject<T>(projectId: string): Promise<T[]> {
  try {
    const { store } = await txStore('assets')
    return wrap(store.index('projectId').getAll(projectId))
  } catch (error) {
    console.error(`[IndexedDB] Failed to get assets for project "${projectId}":`, error)
    throw error
  }
}

/**
 * Retrieves a single asset by ID.
 * 
 * @template T - The asset type
 * @param id - The asset ID
 * @returns Promise resolving to the asset or undefined if not found
 */
export async function getAsset<T>(id: string): Promise<T | undefined> {
  try {
    const { store } = await txStore('assets')
    return wrap(store.get(id))
  } catch (error) {
    console.error(`[IndexedDB] Failed to get asset "${id}":`, error)
    throw error
  }
}

/**
 * Stores an asset in the database.
 * Assets include binary Blob data stored directly in IndexedDB.
 * 
 * @template T - The asset type
 * @param asset - The asset object to store (must include Blob)
 */
export async function putAsset<T>(asset: T): Promise<void> {
  try {
    const { store } = await txStore('assets', 'readwrite')
    await wrap(store.put(asset))
  } catch (error) {
    console.error('[IndexedDB] Failed to put asset:', error)
    throw error
  }
}

/**
 * Deletes an asset by ID.
 * 
 * @param id - The asset ID to delete
 */
export async function deleteAsset(id: string): Promise<void> {
  try {
    const { store } = await txStore('assets', 'readwrite')
    await wrap(store.delete(id))
  } catch (error) {
    console.error(`[IndexedDB] Failed to delete asset "${id}":`, error)
    throw error
  }
}

/**
 * Deletes all assets for a project in a single transaction.
 * 
 * @param projectId - The project ID
 */
export async function deleteAssetsForProject(projectId: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction('assets', 'readwrite')
    const store = tx.objectStore('assets')
    const ids: string[] = await wrap(store.index('projectId').getAllKeys(projectId) as IDBRequest<string[]>)

    return new Promise((resolve, reject) => {
      let pending = ids.length
      if (pending === 0) { resolve(); return }
      for (const id of ids) {
        const req = store.delete(id)
        req.onsuccess = () => { if (--pending === 0) resolve() }
        req.onerror = () => reject(req.error)
      }
      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.error(`[IndexedDB] Failed to delete assets for project "${projectId}":`, error)
    throw error
  }
}

// ─── Database Management ─────────────────────────────────────────────────────

/**
 * Wipes the entire IndexedDB database.
 * Used during "Reset All" to clear all project data.
 * 
 * **Warning:** This is irreversible. All projects, files, folders, and assets will be lost.
 */
export function deleteDatabase(): Promise<void> {
  _db = null
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => {
      console.log('[IndexedDB] Database deleted successfully')
      resolve()
    }
    req.onerror = () => {
      console.error('[IndexedDB] Failed to delete database:', req.error)
      reject(req.error)
    }
    req.onblocked = () => {
      // Another tab has the DB open; resolve anyway and let them handle it
      console.warn('[IndexedDB] deleteDatabase blocked — another tab may be open')
      resolve()
    }
  })
}