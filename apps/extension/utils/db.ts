// IndexedDB store for parsed demos, in the extension origin (shared by the
// offscreen document that writes and the background that reads metadata). The
// heavy raw demo is discarded after parsing; only the light .cs2dv blob and its
// metadata are kept.
import type { ArchiveMetaRow } from './protocol'

const DB_NAME = 'cs2dv-ext'
const DB_VERSION = 1
const META = 'meta' // matchId -> ArchiveMetaRow
const BLOBS = 'blobs' // matchId -> Blob (.cs2dv)

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  return (dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'matchId' })
      if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }))
}

function tx<T>(stores: string[], mode: IDBTransactionMode, fn: (t: IDBTransaction) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(stores, mode)
        const req = fn(t)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

/** Persists a parsed demo (metadata + .cs2dv blob). */
export async function putArchive(meta: ArchiveMetaRow, blob: Blob): Promise<void> {
  const db = await open()
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction([META, BLOBS], 'readwrite')
    t.objectStore(META).put(meta)
    t.objectStore(BLOBS).put(blob, meta.matchId)
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}

/** Lists stored demos (metadata only), newest first. */
export function listArchives(): Promise<ArchiveMetaRow[]> {
  return tx<ArchiveMetaRow[]>([META], 'readonly', (t) => t.objectStore(META).getAll() as IDBRequest<ArchiveMetaRow[]>).then(
    (rows) => rows.sort((a, b) => b.createdAt - a.createdAt),
  )
}

/** Total bytes used by stored .cs2dv files. */
export async function totalBytes(): Promise<number> {
  const rows = await listArchives()
  return rows.reduce((sum, r) => sum + r.sizeBytes, 0)
}

/** Reads back a stored .cs2dv blob (for viewing/export). */
export function getArchiveBlob(matchId: string): Promise<Blob | undefined> {
  return tx<Blob | undefined>([BLOBS], 'readonly', (t) => t.objectStore(BLOBS).get(matchId) as IDBRequest<Blob | undefined>)
}

/** Removes a stored demo. */
export async function deleteArchive(matchId: string): Promise<void> {
  const db = await open()
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction([META, BLOBS], 'readwrite')
    t.objectStore(META).delete(matchId)
    t.objectStore(BLOBS).delete(matchId)
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}
