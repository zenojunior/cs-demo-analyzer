// The normalized replay contract now lives in the shared `@cs2/replay-core`
// package so the browser extension consumes the exact same source (no more
// hand-vendored copies). Re-exported here to keep the documented
// `@/viewer/domain/schema` import path and grouping intact.
export * from '@cs2/replay-core/schema'
