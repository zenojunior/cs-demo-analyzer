// The `.cs2dv` archive codec now lives in the shared `@cs2/replay-core` package
// so the extension's offscreen pipeline reuses the exact same source. Re-exported
// here to keep the `@/viewer/ingest/demoArchive` import path.
export * from '@cs2/replay-core/demoArchive'
