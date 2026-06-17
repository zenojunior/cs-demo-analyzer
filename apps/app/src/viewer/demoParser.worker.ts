/**
 * Web Worker that parses a CS2 `.dem` demo in the browser, off the main thread.
 * Loads the WebAssembly module (generated from the Rust crate in
 * `packages/parser`) and returns the `Replay` already in the
 * `@/viewer/schema` format, along with player voice (comms). No demo byte
 * leaves the machine.
 */
import init, { parse_demo } from './parser/demo_parser.js'
import type { VoiceData, VoiceTrack } from '@/viewer/schema'

export interface ParseRequest {
  buffer: ArrayBuffer
  frameRate?: number
}

export type ParseResponse =
  | { type: 'progress'; phase: 'parsing' | 'building' | 'serializing'; tick?: number; totalTicks?: number }
  | { type: 'result'; ok: true; replay: unknown; voice: VoiceData }
  | { type: 'result'; ok: false; error: string }

// Initializes the wasm only once (idempotent across messages).
let ready: Promise<unknown> | null = null

/** Magic of the voice container emitted by the parser (see `build_voice_blob`). */
const VOICE_MAGIC = 0x32564c43 // "CLV2" little-endian

/**
 * Decodes the binary `CLV2` blob into a `VoiceData` structure. Layout (LE):
 * magic u32, sampleRate u32, tickRate u32, playerCount u32; per player:
 * steamId u64, packetCount u32; per packet: tick u32, level f32, len u32, opus[len].
 */
function parseVoiceBlob(blob: Uint8Array): VoiceData {
  const dv = new DataView(blob.buffer, blob.byteOffset, blob.byteLength)
  let o = 0
  if (blob.byteLength < 16 || dv.getUint32(o, true) !== VOICE_MAGIC) {
    return { sampleRate: 48000, tickRate: 64, tracks: [] }
  }
  o += 4
  const sampleRate = dv.getUint32(o, true)
  o += 4
  const tickRate = dv.getUint32(o, true)
  o += 4
  const playerCount = dv.getUint32(o, true)
  o += 4

  const tracks: VoiceTrack[] = []
  for (let i = 0; i < playerCount; i++) {
    const steamId = dv.getBigUint64(o, true).toString()
    o += 8
    const packetCount = dv.getUint32(o, true)
    o += 4
    const packets = new Array(packetCount)
    for (let j = 0; j < packetCount; j++) {
      const tick = dv.getUint32(o, true)
      o += 4
      const level = dv.getFloat32(o, true)
      o += 4
      const len = dv.getUint32(o, true)
      o += 4
      // Copy the slice into its own buffer (the original blob is discarded).
      packets[j] = { tick, level, data: blob.slice(o, o + len) }
      o += len
    }
    tracks.push({ steamId, packets })
  }
  return { sampleRate, tickRate, tracks }
}

self.onmessage = async (e: MessageEvent<ParseRequest>) => {
  const { buffer, frameRate = 8 } = e.data
  try {
    if (!ready) ready = init()
    await ready
    // `buffer` is already the raw `.dem` (decompression happens earlier, in a
    // separate throwaway worker — see `useDemoParser`).
    const dem = new Uint8Array(buffer)
    // The parser reports real progress via this callback (same thread, but the
    // posted messages reach the main thread live): stage 0 = parsing (per tick),
    // 1 = building the replay, 2 = serializing.
    const onProgress = (stage: number, tick: number, totalTicks: number) => {
      if (stage === 0) {
        self.postMessage({ type: 'progress', phase: 'parsing', tick, totalTicks } satisfies ParseResponse)
      } else if (stage === 1) {
        self.postMessage({ type: 'progress', phase: 'building' } satisfies ParseResponse)
      } else {
        self.postMessage({ type: 'progress', phase: 'serializing' } satisfies ParseResponse)
      }
    }
    // Switch the label to "parsing" instantly, before the first tick is reported.
    self.postMessage({ type: 'progress', phase: 'parsing' } satisfies ParseResponse)
    const out = parse_demo(dem, frameRate, onProgress)
    // JS-side finalization: turning the parser's big JSON string into objects.
    self.postMessage({ type: 'progress', phase: 'serializing' } satisfies ParseResponse)
    const replay = JSON.parse(out.replay)
    const voice = parseVoiceBlob(out.voice)
    out.free()

    // Transfer each packet's buffer (zero-copy) to the main thread.
    const transfer = voice.tracks.flatMap((t) => t.packets.map((p) => p.data.buffer))
    const res: ParseResponse = { type: 'result', ok: true, replay, voice }
    self.postMessage(res, { transfer })
  } catch (err) {
    const res: ParseResponse = {
      type: 'result',
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
    self.postMessage(res)
  }
}
