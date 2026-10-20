// 로컬 실행용 서버: 빌드된 화면(dist) + /api + /uploads 를 한 포트에서 제공한다.
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DATA_DIR } from '../api/_lib';
import auth from '../api/auth';
import content from '../api/content';
import upload from '../api/upload';

// .env 읽기 (이미 설정된 환경변수는 덮어쓰지 않음)
try {
  for (const line of fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith('#') && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* .env 없음 */ }

if (!process.env.ADMIN_PASSWORD || (process.env.SESSION_SECRET || '').length < 32) {
  console.error('\n.env 가 없거나 올바르지 않습니다. `npm start` 로 실행하면 자동으로 만들어집니다.\n');
  process.exit(1);
}

const DIST = path.join(process.cwd(), 'dist');
const UPLOADS = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('\ndist 폴더가 없습니다. `npm start` 로 실행하거나 먼저 `npm run build` 를 실행하세요.\n');
  process.exit(1);
}

const API: Record<string, (req: any, res: any) => unknown> = {
  '/api/auth': auth, '/api/content': content, '/api/upload': upload,
};
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
};

// Range 지원 (iOS Safari 는 Range 없이는 오디오를 재생하지 않는다)
function sendFile(req: http.IncomingMessage, res: http.ServerResponse, file: string, cache: string) {
  const st = fs.statSync(file);
  res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', cache);
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (m && (m[1] || m[2])) {
    const start = m[1] ? Number(m[1]) : Math.max(0, st.size - Number(m[2]));
    const end = Math.min(m[1] && m[2] ? Number(m[2]) : st.size - 1, st.size - 1);
    if (start > end || start >= st.size) {
      res.statusCode = 416; res.setHeader('Content-Range', `bytes */${st.size}`); return res.end();
    }
    res.statusCode = 206;
    res.setHeader('Content-Range', `bytes ${start}-${end}/${st.size}`);
    res.setHeader('Content-Length', end - start + 1);
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.setHeader('Content-Length', st.size);
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

http.createServer(async (req, res) => {
  const r = res as any;
  r.status = (c: number) => { res.statusCode = c; return res; };
  r.json = (o: unknown) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); return res; };
  try {
    const u = new URL(req.url || '/', 'http://localhost');

    const handler = API[u.pathname];
    if (handler) {
      if (u.pathname !== '/api/upload') {
        const chunks: Buffer[] = [];
        let n = 0;
        for await (const c of req) {
          n += (c as Buffer).length;
          if (n > 1_000_000) { res.setHeader('Connection', 'close'); return r.status(413).json({ error: '요청이 너무 큽니다' }); }
          chunks.push(c as Buffer);
        }
        const raw = Buffer.concat(chunks).toString('utf8');
        try {
          (req as any).body = (req.headers['content-type'] || '').includes('json') && raw ? JSON.parse(raw) : raw;
        } catch { return r.status(400).json({ error: '잘못된 요청입니다' }); }
      }
      return await handler(req, res);
    }

    if (u.pathname.startsWith('/uploads/')) {
      const name = decodeURIComponent(u.pathname.slice('/uploads/'.length));
      if (!/^[\w.-]+$/.test(name) || name.startsWith('.')) return r.status(400).end();
      const f = path.join(UPLOADS, name);
      if (!fs.existsSync(f)) return r.status(404).end();
      return sendFile(req, res, f, 'public, max-age=31536000, immutable');
    }

    let f = path.join(DIST, path.normalize(u.pathname === '/' ? '/index.html' : u.pathname));
    if (!f.startsWith(DIST + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
    return sendFile(req, res, f, f.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600');
  } catch {
    if (!res.headersSent) r.status(500).json({ error: '서버 오류' }); else res.end();
  }
}).listen(Number(process.env.PORT) || 3000, '0.0.0.0', () => {
  const port = Number(process.env.PORT) || 3000;
  console.log('\n실행 중입니다. 브라우저에서 열어 보세요.');
  console.log(`  이 컴퓨터:        http://localhost:${port}`);
  for (const list of Object.values(os.networkInterfaces()))
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) console.log(`  같은 Wi-Fi 폰:    http://${i.address}:${port}`);
  console.log(`  관리자 편집:      주소 뒤에 /?admin  (예: http://localhost:${port}/?admin)\n`);
});
