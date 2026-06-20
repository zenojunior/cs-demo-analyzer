// The CLV2 voice container codec now lives in the shared `@cs2/replay-core`
// package (single source of truth for the binary format, shared with the
// extension). Re-exported here to keep the `@/viewer/player/voiceCodec` path.
export * from '@cs2/replay-core/voiceCodec'
