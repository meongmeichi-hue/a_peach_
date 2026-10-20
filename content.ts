import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv, requireAdmin } from './_lib';

const KEY = 'iphone:content';
// 허용 URL: 빈 값 / https 주소(Vercel Blob) / 로컬 업로드 경로(/uploads/파일명)
const url = (v: unknown) =>
  typeof v === 'string' && (v === '' || v.startsWith('https://') || /^\/uploads\/[\w-]+\.[a-z0-9]+$/.test(v));
const arr = (v: unknown): v is any[] => Array.isArray(v);

function valid(c: any): boolean {
  try {
    return url(c.kakao.avatar) && arr(c.kakao.messages) && arr(c.gallery) && c.gallery.every(url)
      && arr(c.naver) && c.naver.every((t: unknown) => typeof t === 'string')
      && url(c.insta.avatar) && arr(c.insta.posts) && c.insta.posts.length === 9 && c.insta.posts.every(url)
      && arr(c.calls) && c.calls.every((x: any) => url(x.avatar))
      && arr(c.threads) && c.threads.every((x: any) => url(x.avatar) && arr(x.messages))
      && url(c.incoming.avatar) && url(c.incoming.audio) && typeof c.incoming.name === 'string';
  } catch { return false; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET') return res.json((await (await kv()).get(KEY)) ?? {});
    if (req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const b = req.body;
      if (!valid(b)) return res.status(400).json({ error: '잘못된 데이터입니다' });
      const clean = { kakao: b.kakao, gallery: b.gallery, naver: b.naver, insta: b.insta, calls: b.calls, threads: b.threads, incoming: b.incoming };
      if (JSON.stringify(clean).length > 400_000) return res.status(413).json({ error: '데이터가 너무 큽니다' });
      await (await kv()).set(KEY, clean);
      return res.json({ ok: true });
    }
    res.status(405).json({ error: 'Method Not Allowed' });
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
}
