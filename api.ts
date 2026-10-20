import type { Content } from './types';

const j = async (r: Response) => {
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || '요청 실패');
  return r.json();
};
const json = (method: string, body: unknown) =>
  ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

export const getContent = (): Promise<Partial<Content>> => fetch('/api/content').then(j);
export const saveContent = (c: Content) => fetch('/api/content', json('PUT', c)).then(j);
export const me = (): Promise<{ admin: boolean }> => fetch('/api/auth').then(j);
export const login = (password: string) => fetch('/api/auth', json('POST', { password })).then(j);
export const logout = () => fetch('/api/auth', { method: 'DELETE' }).then(j);

async function shrink(f: File): Promise<Blob> {
  const bmp = await createImageBitmap(f);
  const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('이미지 변환 실패'))), 'image/jpeg', 0.85));
}

export async function upload(f: File): Promise<string> {
  const img = f.type.startsWith('image/');
  const body = img ? await shrink(f) : f;
  const r = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'x-content-type': img ? 'image/jpeg' : f.type, 'content-type': 'application/octet-stream' },
    body,
  });
  return (await j(r)).url as string;
}
