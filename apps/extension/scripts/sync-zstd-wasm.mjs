// Copies the libzstd `.wasm` from `@bokuweb/zstd-wasm` into `public/` so it is
// served from a stable extension URL (`chrome.runtime.getURL('zstd.wasm')`) with
// the right MIME type. The offscreen document loads it via that explicit path to
// decompress Faceit's `.dem.zst` demos. Mirrors apps/app's sync script; runs on
// predev/prebuild so it never goes stale.
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const extRoot = resolve(here, '..')

// The package's `exports` map blocks deep subpath resolution, so resolve the
// main entry and walk to the sibling wasm in `dist/web/`.
const mainUrl = import.meta.resolve('@bokuweb/zstd-wasm')
const pkgDist = dirname(dirname(fileURLToPath(mainUrl))) // .../dist
const src = resolve(pkgDist, 'web', 'zstd.wasm')
const dest = resolve(extRoot, 'public', 'zstd.wasm')

mkdirSync(dirname(dest), { recursive: true })
copyFileSync(src, dest)
console.log(`[sync-zstd-wasm] ${src} -> ${dest}`)
