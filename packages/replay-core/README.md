# @cs2/replay-core

The framework-free core of the CS Demo Analyzer replay pipeline, shared by the
web app (`apps/app`) and the browser extension (`apps/extension`) so both build
from a single source instead of hand-vendored copies.

Pure TypeScript, no Vue / DOM-framework dependencies. Compression uses the
browser-native `CompressionStream` / `DecompressionStream`.

## Modules

- `@cs2/replay-core/schema` — the normalized `Replay` contract (the intermediate
  format between the WASM parser and the 2D viewer). Pure types.
- `@cs2/replay-core/voiceCodec` — the CLV2 binary container for player voice
  (raw Opus frames), packed/unpacked around the JSON `Replay`.
- `@cs2/replay-core/demoArchive` — the `.cs2dv` archive codec (replay + voice +
  comments → one gzipped file, and back), letting an import skip the WASM parser.
- `@cs2/replay-core` — barrel re-export of all three.

Consumed via TypeScript source (the Turborepo "internal package" pattern); each
app's bundler (Vite / WXT) transpiles it. No build step.

## Not here

The WASM parser itself lives in `packages/parser` (Rust → wasm-bindgen). Its
generated artifacts are still committed into each app's tree; see each app's
README.
