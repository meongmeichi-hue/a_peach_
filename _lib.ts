import { createHmac, createHash, timingSafeEqual } from 'crypto';
import fs from 'fs';
import path from 'path';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const DATA_DIR = path.join(process.cwd(), 'data');
const onVercel = !!process.env.VERCEL;
const kvUrl = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const kvToken = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// HTTP(로컬/LAN)에서는 Secure 쿠키가 거부되므로 Vercel(HTTPS)에서만 Secure 를 붙인다.
export const cookieFlags = `Path=/; HttpOnly; SameSite=Strict${onVercel ? '; Secure' : ''}`;

export type KV = {
  get: <T = unknown>(k: string) => Promise<T | null>;
  set: (k: string, v: unknown) => Promise<void>;
  incr: (k: string) => Promise<number>;
  expire: (k: string, s: number) => Promise<void>;
};

// 저장소: Upstash Redis 환경변수가 있으면 Redis, 없으면 data/db.json (로컬 실행용)
let cached: KV | undefined;
export async function kv(): Promise<KV> {
  if (cached) return cached;
  const url = kvUrl(), token = kvToken();
  if (url && token) {
    const { Redis } = await import('@upstash/redis');
    const r = new Redis({ url, token });
    cached = {
      get: <T,>(k: string) => r.get<T>(k),
      set: async (k, v) => { await r.set(k, v); },
      incr: k => r.incr(k),
      expire: async (k, s) => { await r.expire(k, s); },
    };
  } else cached = fileKv();
  return cached;
}

function fileKv(): KV {
  const file = path.join(DATA_DIR, 'db.json');
  let db: Record<string, unknown> = {};
  try { db = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* 최초 실행 */ }
  const counters = new Map<string, { n: number; exp: number }>(); // 속도 제한용(메모리)
  const flush = () => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, file);
  };
  return {
    get: async <T,>(k: string) => (k in db ? (structuredClone(db[k]) as T) : null),
    set: async (k, v) => { db[k] = v; flush(); },
    incr: async k => {
      let e = counters.get(k);
      if (!e || (e.exp && e.exp < Date.now())) e = { n: 0, exp: 0 };
      e.n++; counters.set(k, e); return e.n;
    },
    expire: async (k, s) => { const e = counters.get(k); if (e) e.exp = Date.now() + s * 1000; },
  };
}

// 파일 저장: BLOB 토큰이 있으면 Vercel Blob, 없으면 data/uploads (로컬 실행용)
export async function putFile(name: string, body: Buffer, type: string): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    return (await put(`uploads/${name}`, body, { access: 'public', contentType: type })).url;
  }
  const dir = path.join(DATA_DIR, 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), body);
  return `/uploads/${name}`;
}

export const clientIp = (req: VercelRequest) =>
  onVercel ? String(req.headers['x-forwarded-for'] || 'x').split(',')[0].trim() : req.socket.remoteAddress || 'x';

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET(32자 이상) 미설정');
  return s;
};
const sig = (p: string) => createHmac('sha256', secret()).update(p).digest('base64url');

export const makeToken = () => { const p = String(Date.now() + 7 * 864e5); return `${p}.${sig(p)}`; };

export function isAdmin(req: VercelRequest): boolean {
  const m = /(?:^|; )sid=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return false;
  const [p, s] = m[1].split('.');
  if (!p || !s) return false;
  const a = Buffer.from(s), b = Buffer.from(sig(p));
  return a.length === b.length && timingSafeEqual(a, b) && Number(p) > Date.now();
}

export const safeEqual = (a: string, b: string) => {
  const h = (x: string) => createHash('sha256').update(x).digest();
  return timingSafeEqual(h(a), h(b));
};

export function requireAdmin(req: VercelRequest, res: VercelResponse): boolean {
  if (isAdmin(req)) return true;
  res.status(401).json({ error: '관리자 권한이 필요합니다' });
  return false;
}
