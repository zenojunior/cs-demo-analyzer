import { ref } from 'vue'

/**
 * Records a `<canvas>` to a downloadable WebM clip via `MediaRecorder` +
 * `canvas.captureStream`. The canvas already holds each finished frame (the 2D
 * map draws everything onto it), so recording is just grabbing its stream while
 * something else drives the playback. No audio: replay clips are silent.
 *
 * Usage: `start(canvas)`, drive one pass of the playback, then `await stop()`
 * for the Blob. The caller owns play/seek; this only owns the encoder.
 */

/** Pick the best WebM codec the browser will actually record. */
function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? null
}

export function useClipRecorder() {
  const recording = ref(false)
  const supported = pickMimeType() != null && typeof HTMLCanvasElement.prototype.captureStream === 'function'

  let recorder: MediaRecorder | null = null
  let chunks: Blob[] = []

  function start(canvas: HTMLCanvasElement, fps = 30) {
    const mimeType = pickMimeType()
    if (!mimeType) throw new Error('MediaRecorder/WebM not supported')
    chunks = []
    const stream = canvas.captureStream(fps)
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 })
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data)
    }
    recorder.start()
    recording.value = true
  }

  /** Stops recording and resolves the captured clip as a WebM Blob. */
  function stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const rec = recorder
      if (!rec) {
        reject(new Error('not recording'))
        return
      }
      rec.onstop = () => {
        recording.value = false
        recorder = null
        resolve(new Blob(chunks, { type: 'video/webm' }))
      }
      rec.stop()
    })
  }

  /** Suspends capture (e.g. while the tab is hidden and rAF is throttled). */
  function pause() {
    if (recorder?.state === 'recording') recorder.pause()
  }
  function resume() {
    if (recorder?.state === 'paused') recorder.resume()
  }

  return { recording, supported, start, stop, pause, resume }
}

/** True when the browser can write an image to the clipboard (Async Clipboard
 *  API with `ClipboardItem`). Video can't be copied anywhere, but a PNG can. */
export const canCopyImage =
  typeof navigator !== 'undefined' &&
  !!navigator.clipboard &&
  typeof navigator.clipboard.write === 'function' &&
  typeof ClipboardItem !== 'undefined'

/** Copies the canvas's current frame to the clipboard as a PNG (a still image:
 *  the clipboard accepts no video format), pasteable into any app. */
export async function copyCanvasToClipboard(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) throw new Error('canvas toBlob failed')
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

/** Triggers a browser download of a Blob under `name`. */
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
