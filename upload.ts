import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import { putFile, requireAdmin } from './_lib';

export const config = { api: { bodyParser: false } };

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac',
  'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/ogg': 'ogg',
};
const MAX = 4.4 * 1024 * 1024; // Vercel 함수 요청 본문 한도(4.5MB) 이내

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    if (!requireAdmin(req, res)) return;
    const type = String(req.headers['x-content-type'] || '');
    const ext = EXT[type];
    if (!ext) return res.status(415).json({ error: '지원하지 않는 파일 형식입니다' });
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const ch of req) {
      size += (ch as Buffer).length;
      if (size > MAX) {
        res.setHeader('Connection', 'close'); // 읽지 않은 본문이 남은 소켓 재사용 방지
        return res.status(413).json({ error: '파일은 4.4MB 이하만 가능합니다' });
      }
      chunks.push(ch as Buffer);
    }
    res.json({ url: await putFile(`${randomUUID()}.${ext}`, Buffer.concat(chunks), type) });
  } catch {
    res.status(500).json({ error: '업로드 실패' });
  }
}
