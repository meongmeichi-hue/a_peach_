import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clientIp, cookieFlags, isAdmin, kv, makeToken, safeEqual } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET') return res.json({ admin: isAdmin(req) });
    if (req.method === 'DELETE') {
      res.setHeader('Set-Cookie', `sid=; ${cookieFlags}; Max-Age=0`);
      return res.json({ admin: false });
    }
    if (req.method === 'POST') {
      const store = await kv();
      const k = `rl:${clientIp(req)}`;
      const n = await store.incr(k);
      if (n === 1) await store.expire(k, 600);
      if (n > 10) return res.status(429).json({ error: '시도 횟수 초과. 잠시 후 다시 시도하세요' });
      const pw = typeof req.body?.password === 'string' ? req.body.password : '';
      const real = process.env.ADMIN_PASSWORD;
      if (!real) throw new Error('ADMIN_PASSWORD 미설정');
      if (!safeEqual(pw, real)) return res.status(401).json({ error: '비밀번호가 올바르지 않습니다' });
      res.setHeader('Set-Cookie', `sid=${makeToken()}; ${cookieFlags}; Max-Age=604800`);
      return res.json({ admin: true });
    }
    res.status(405).json({ error: 'Method Not Allowed' });
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
}
