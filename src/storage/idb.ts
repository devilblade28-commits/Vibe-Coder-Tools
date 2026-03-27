/**
 * IndexedDB wrapper — source of truth for all project content.
 * NEVER store file content or large blobs in localStorage.
 *
 * Object stores:
 *   projects  — Project metadata
 *   files     — ProjectFile records (index: projectId)
 *   folders   — ProjectFolder records (index: projectId)
 *   assets    — ProjectAsset records with Blob (index: projectId)
 */

const DB_NAME = 'ai-builder-db'
const DB_VERSION = 2  // bumped for assets store

type StoreName = 'projects' | 'files' | 'folders' | 'assets'

let _db: IDBDatabase | null = null

export function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result

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
      // Handle database being closed externally (e.g. deleteDatabase)
      _db.onclose = () => { _db = null }
      _db.onerror = (ev) => console.error('IDB error', ev)
      resolve(_db)
    }

    req.onerror = () => reject(req.error)
    req.onblocked = () => console.warn('IDB upgrade blocked by another tab')
  })
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Open a transaction and return the object store. */
async function txStore(store: StoreName, mode: IDBTransactionMode = 'readonly') {
  const db = await openDB()
  const tx = db.transaction(store, mode)
  return { store: tx.objectStore(store), tx }
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function getProject<T>(id: string): Promise<T | undefined> {
  const { store } = await txStore('projects')
  return wrap(store.get(id))
}

export async function putProject<T>(project: T): Promise<void> {
  const { store } = await txStore('projects', 'readwrite')
  await wrap(store.put(project))
}

export async function deleteProject(id: string): Promise<void> {
  const { store } = await txStore('projects', 'readwrite')
  await wrap(store.delete(id))
}

// ─── Files ───────────────────────────────────────────────────────────────────

export async function getFilesForProject<T>(projectId: string): Promise<T[]> {
  const { store } = await txStore('files')
  return wrap(store.index('projectId').getAll(projectId))
}

export async function getFile<T>(id: string): Promise<T | undefined> {
  const { store } = await txStore('files')
  return wrap(store.get(id))
}

export async function putFile<T>(file: T): Promise<void> {
  const { store } = await txStore('files', 'readwrite')
  await wrap(store.put(file))
}

export async function deleteFile(id: string): Promise<void> {
  const { store } = await txStore('files', 'readwrite')
  await wrap(store.delete(id))
}

/** Delete all files for a project in a single transaction. */
export async function deleteFilesForProject(projectId: string): Promise<void> {
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
}

// ─── Folders ─────────────────────────────────────────────────────────────────

export async function getFoldersForProject<T>(projectId: string): Promise<T[]> {
  const { store } = await txStore('folders')
  return wrap(store.index('projectId').getAll(projectId))
}

export async function putFolder<T>(folder: T): Promise<void> {
  const { store } = await txStore('folders', 'readwrite')
  await wrap(store.put(folder))
}

export async function deleteFolder(id: string): Promise<void> {
  const { store } = await txStore('folders', 'readwrite')
  await wrap(store.delete(id))
}

export async function deleteFoldersForProject(projectId: string): Promise<void> {
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
}

// ─── Assets ──────────────────────────────────────────────────────────────────

export async function getAssetsForProject<T>(projectId: string): Promise<T[]> {
  const { store } = await txStore('assets')
  return wrap(store.index('projectId').getAll(projectId))
}

export async function getAsset<T>(id: string): Promise<T | undefined> {
  const { store } = await txStore('assets')
  return wrap(store.get(id))
}

export async function putAsset<T>(asset: T): Promise<void> {
  const { store } = await txStore('assets', 'readwrite')
  await wrap(store.put(asset))
}

export async function deleteAsset(id: string): Promise<void> {
  const { store } = await txStore('assets', 'readwrite')
  await wrap(store.delete(id))
}

export async function deleteAssetsForProject(projectId: string): Promise<void> {
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
}

/** Wipe the entire database — used by Reset All. */
export function deleteDatabase(): Promise<void> {
  _db = null
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => {
      // Another tab has the DB open; resolve anyway and let them handle it
      console.warn('deleteDatabase blocked — another tab may be open')
      resolve()
    }
  })
}
