# @clutch/demo-parser-wasm

CS2 demo (`.dem`) parser in **WebAssembly**. Reads the bytes of a demo
(CS2 / Source 2) and emits the `Replay` in the `apps/app/src/replay/schema.ts`
format, along with the players' voice (comms). Runs in the browser, inside a Web
Worker; no byte of the demo ever leaves the machine.

Uses `source2-demo` (a streaming, event-driven parser), so memory usage stays
well below the wasm32 ceiling even on long demos.

## Important: this package is "out of band"

This is a **Rust crate**, not a pnpm package (it has no `package.json`, and is
not part of the workspace nor `turbo`). It is compiled to WASM **by hand**, via
`build.sh`. Consequences:

- `pnpm dev` / `pnpm build` **do not recompile the WASM**. They only consume the
  artifact already committed under `apps/app/src/viewer/parser/`.
- Anyone who just runs the app (or clones the repo) **does not need Rust or the
  toolchain**: the versioned `.wasm` is enough.
- Only someone **working on the parser** needs the toolchain below.

## How the app consumes it

The build emits the artifacts straight into `apps/app/src/viewer/parser/` (all
committed; they are the source of truth the app imports):

- `clutch_demo_parser.js` (wasm-bindgen glue)
- `clutch_demo_parser.d.ts` (types)
- `clutch_demo_parser_bg.wasm` (the lean binary)
- `clutch_demo_parser_bg.wasm.d.ts`
- `package.json`

The worker (`apps/app/src/workers/demoParser.worker.ts`) imports the glue and
calls `init()` + `parse_demo()`. `init()` resolves the binary via
`new URL('clutch_demo_parser_bg.wasm', import.meta.url)`, a pattern **Vite**
recognizes and treats as an asset (served in dev, emitted with a hash in the
build). That is why there is no special plugin: the folder is just "code + asset"
imported by relative path.

## Prerequisites (once per machine)

- `rustup target add wasm32-unknown-unknown`
- `cargo install wasm-bindgen-cli --version 0.2.125`: the version **must match**
  the `wasm-bindgen` dep in `Cargo.toml`, otherwise you get a mismatch between
  glue and binary (the #1 cause of "the parser stopped loading").
- A C linker for the host's build scripts/proc-macros. If the machine has no
  gcc/clang, use **zig as the driver**: create a `cc` -> `zig cc` wrapper on the
  PATH and export `CC=cc` (zig ships the libc; without it cargo fails with
  "linker `cc` not found").

## Workflow

```
edit lib.rs  ->  ./build.sh  ->  artifacts in apps/app/src/viewer/parser/  ->  Vite reloads
```

1. Edit `src/lib.rs`.
2. (optional, recommended) Validate quickly **without WASM** using the native
   iteration binary, which is much faster to compile than the wasm:
   ```bash
   cargo run --no-default-features --bin native -- <input.dem> out.json
   ```
   (`--no-default-features` turns off the `wasm` feature and produces a normal binary.)
3. Build the WASM, from the package folder:
   ```bash
   cd packages/parser && ./build.sh
   ```
   `build.sh` runs `cargo build --release --target wasm32-unknown-unknown`
   (producing the raw `.wasm` in `target/`, which is in `.gitignore`) and then
   `wasm-bindgen --target web` (producing the glue + types + the lean `_bg.wasm`
   **straight into** `apps/app/src/viewer/parser/`).
4. The app picks it up on its own: with `pnpm dev` running, Vite sees the files
   change and reloads.
5. **Commit both sides**: the change in `lib.rs` **and** the regenerated
   artifacts in `apps/app/src/viewer/parser/`. There is no CI that recompiles; if
   you forget the artifacts, the app stays on the old version.

## Gotchas

1. **The contract is duplicated.** The `struct`s in `lib.rs` mirror the types in
   `apps/app/src/replay/schema.ts` by hand; nothing enforces that they stay in
   sync. Changed a field in the TS schema? Change `lib.rs` too (and rebuild),
   otherwise the JSON the WASM emits stops matching the type.
2. **wasm-bindgen-cli vs the Cargo dep.** If you update one, update the other.

## Crate features

- `wasm` (default): browser build, with `wasm-bindgen`.
- `--no-default-features`: native build, used by the `native` iteration binary.
