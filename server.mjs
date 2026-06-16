// Minimal dependency-free static server for the built SPA.
// Serves files from ./dist; any unknown route falls back to index.html so
// Vue Router history mode (/about, /:id, ...) works on refresh/deep-link.
import { createServer } from 'node:http'
import { stat, readFile } from 'node:fs/promises'
import { join, normalize, extname, sep } from 'node:path'

const DIST = join(import.meta.dirname, 'dist')
const PORT = Number(process.env.PORT) || 5174
const HOST = process.env.HOST || '0.0.0.0'

// Explicit MIME map: .wasm in particular must be application/wasm so the
// browser can stream-compile the demo parser and the zstd decoder.
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
}

async function statFile(path) {
  try {
    const s = await stat(path)
    return s.isFile() ? s : null
  } catch {
    return null
  }
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end('Method Not Allowed')
    return
  }

  // Decode, drop the query string and block path traversal.
  const reqPath = decodeURIComponent((req.url || '/').split('?')[0])
  const safe = normalize(reqPath).replace(/^(\.\.(\/|\\|$))+/, '')
  let filePath = join(DIST, safe)

  // Serve the file if it exists; otherwise fall back to the SPA entry point.
  let fileStat = await statFile(filePath)
  let isFallback = false
  if (!fileStat) {
    filePath = join(DIST, 'index.html')
    fileStat = await statFile(filePath)
    isFallback = true
    if (!fileStat) {
      res.writeHead(404).end('Not Found')
      return
    }
  }

  const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream'
  const headers = { 'Content-Type': type, 'Content-Length': fileStat.size }

  // Content-hashed assets are immutable; index.html (and any fallback) must
  // stay fresh so clients always pick up the latest asset hashes.
  if (!isFallback && filePath.includes(`${sep}assets${sep}`)) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable'
  } else if (filePath.endsWith(`${sep}index.html`)) {
    headers['Cache-Control'] = 'no-cache'
  }

  if (req.method === 'HEAD') {
    res.writeHead(200, headers).end()
    return
  }

  res.writeHead(200, headers).end(await readFile(filePath))
})

server.listen(PORT, HOST, () => {
  console.log(`Serving ./dist on http://${HOST}:${PORT}`)
})
