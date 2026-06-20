// Bridge that lets a companion browser extension (the Faceit "Open in 2D"
// helper) hand a freshly downloaded demo straight to the analyzer, with nothing
// touching disk and nothing uploaded to a server.
//
// The extension's content script runs inside this very page (isolated world)
// and talks to us over window.postMessage. The handshake covers either load
// order: we announce `ready` on mount, and we also answer the extension's
// `hello` with `ready`. The extension then streams download progress and, once
// done, the demo bytes as a transferable ArrayBuffer.

const EXT = 'cs2dv-extension'
const APP = 'cs2dv-app'

type ExtMessage =
  | { source: typeof EXT; kind: 'hello' }
  | { source: typeof EXT; kind: 'download-start'; total: number }
  | { source: typeof EXT; kind: 'download-progress'; loaded: number; total: number }
  | { source: typeof EXT; kind: 'download-error'; message: string }
  | { source: typeof EXT; kind: 'ingest'; fileName?: string; buffer: ArrayBuffer }

function isExtMessage(data: unknown): data is ExtMessage {
  return !!data && typeof data === 'object' && (data as { source?: unknown }).source === EXT
}

export interface ExtensionBridgeHandlers {
  /** Download started; `total` is bytes (0 if the server gave no length). */
  onDownloadStart?: (total: number) => void
  onDownloadProgress?: (loaded: number, total: number) => void
  onDownloadError?: (message: string) => void
  /** Bytes are in; feed the File through the normal ingest path. */
  onDemo: (file: File) => void
}

/**
 * Starts listening for the extension. Returns a disposer that removes the
 * listener.
 */
export function listenForExtensionDemo(handlers: ExtensionBridgeHandlers): () => void {
  function handle(e: MessageEvent) {
    // Same-page, same-origin only: ignore anything cross-frame or cross-origin.
    if (e.source !== window || e.origin !== location.origin) return
    if (!isExtMessage(e.data)) return
    const data = e.data

    switch (data.kind) {
      case 'hello':
        window.postMessage({ source: APP, kind: 'ready' }, location.origin)
        break
      case 'download-start':
        handlers.onDownloadStart?.(data.total)
        break
      case 'download-progress':
        handlers.onDownloadProgress?.(data.loaded, data.total)
        break
      case 'download-error':
        handlers.onDownloadError?.(data.message)
        break
      case 'ingest':
        if (data.buffer instanceof ArrayBuffer) {
          const fileName = data.fileName || 'faceit-demo.dem'
          const file = new File([data.buffer], fileName, { type: 'application/octet-stream' })
          window.postMessage({ source: APP, kind: 'ack' }, location.origin)
          handlers.onDemo(file)
        }
        break
    }
  }

  window.addEventListener('message', handle)
  // Announce readiness in case the extension's content script is already waiting.
  window.postMessage({ source: APP, kind: 'ready' }, location.origin)
  return () => window.removeEventListener('message', handle)
}
