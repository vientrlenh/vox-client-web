// Static server cho bản build production trong dist/.
// Thay cho `vite preview` (chỉ dành để test, không dùng để chạy thật).
//
// Các biến VITE_* đã được bake vào bundle lúc `vite build`, nên server này
// không đọc chúng -- nó chỉ cần PORT/HOST (nạp từ .env qua --env-file-if-exists).
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const distRoot = fileURLToPath(new URL('../dist', import.meta.url))
const assetsRoot = join(distRoot, 'assets')
const indexPath = join(distRoot, 'index.html')

const host = process.env.HOST ?? '0.0.0.0'
const port = Number(process.env.PORT ?? 4173)

const MIME_TYPES = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webm': 'video/webm',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

async function statFile(filePath) {
  try {
    const stats = await stat(filePath)
    return stats.isFile() ? stats : null
  } catch {
    return null
  }
}

// Map pathname -> file trong dist/, chặn path traversal (../).
function toDistPath(pathname) {
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }
  if (decoded.includes('\0')) return null

  const candidate = resolve(distRoot, `.${decoded}`)
  const insideDist = candidate === distRoot || candidate.startsWith(distRoot + sep)
  return insideDist ? candidate : null
}

// Vite băm tên file trong assets/ nên nội dung bất biến; index.html thì không.
function cacheControlFor(filePath) {
  if (filePath === indexPath) return 'no-cache'
  if (filePath.startsWith(assetsRoot + sep)) return 'public, max-age=31536000, immutable'
  return 'public, max-age=3600'
}

function sendFile(req, res, filePath, stats) {
  const etag = `W/"${stats.size.toString(16)}-${stats.mtimeMs.toString(16)}"`
  const headers = {
    'Cache-Control': cacheControlFor(filePath),
    'Content-Type': MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    ETag: etag,
    'Last-Modified': stats.mtime.toUTCString(),
  }

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers)
    res.end()
    return
  }

  res.writeHead(200, { ...headers, 'Content-Length': stats.size })
  if (req.method === 'HEAD') {
    res.end()
    return
  }

  const stream = createReadStream(filePath)
  stream.on('error', () => res.destroy())
  stream.pipe(res)
}

function sendText(res, status, body) {
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
  })
  res.end(body)
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Method Not Allowed')
    return
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)
  const filePath = toDistPath(pathname)

  if (filePath) {
    const stats = await statFile(filePath)
    if (stats) {
      sendFile(req, res, filePath, stats)
      return
    }
  }

  // SPA fallback cho BrowserRouter: route con phải trả index.html, không phải 404.
  // Chỉ áp cho request điều hướng -- asset thiếu (Accept: */*) vẫn phải 404 thật,
  // nếu không thì <script> hỏng sẽ nhận về HTML và lỗi trở nên khó đọc.
  if (!(req.headers.accept ?? '').includes('text/html')) {
    sendText(res, 404, 'Not Found')
    return
  }

  const indexStats = await statFile(indexPath)
  if (!indexStats) {
    sendText(res, 500, 'dist/index.html không tồn tại -- chạy `pnpm build` trước.')
    return
  }
  sendFile(req, res, indexPath, indexStats)
})

if (!(await statFile(indexPath))) {
  console.error('[serve] Không tìm thấy dist/index.html. Chạy `pnpm build` trước, hoặc dùng `pnpm start`.')
  process.exit(1)
}

server.listen(port, host, () => {
  const shown = host === '0.0.0.0' || host === '::' ? 'localhost' : host
  console.log(`[serve] dist/ đang chạy tại http://${shown}:${port}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
