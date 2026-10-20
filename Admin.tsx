import { useState } from 'react';
import { CALL_LABEL, uid, type Call, type Content, type Msg } from './types';
import { login, logout, saveContent, upload } from './api';

type Up = (f: (x: Content) => void) => void;
const mv = <T,>(a: T[], i: number, k: number) => {
  const j = i + k;
  if (j >= 0 && j < a.length) { [a[i], a[j]] = [a[j], a[i]]; }
};
const Ctl = ({ i, n, m, del }: { i: number; n: number; m: (k: number) => void; del?: () => void }) => (
  <span className="ctl">
    <button disabled={i === 0} onClick={() => m(-1)}>▲</button>
    <button disabled={i === n - 1} onClick={() => m(1)}>▼</button>
    {del && <button onClick={del}>🗑</button>}
  </span>
);

function File1({ v, set, kind = 'image' }: { v: string; set: (u: string) => void; kind?: 'image' | 'audio' }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true); setErr('');
    try { set(await upload(f)); } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  return (
    <div className="ff">
      {v && (kind === 'image' ? <img src={v} alt="" /> : <audio src={v} controls />)}
      <label className="btn">{busy ? '업로드 중…' : v ? '교체' : '업로드'}
        <input hidden type="file" accept={kind === 'image' ? 'image/*' : 'audio/*'}
          onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      </label>
      {v && <button onClick={() => set('')}>삭제</button>}
      {err && <small className="err">{err}</small>}
    </div>
  );
}

function MsgEditor({ get, d, up }: { get: (x: Content) => Msg[]; d: Content; up: Up }) {
  const list = get(d);
  return (
    <div>
      {list.map((m, i) => (
        <div className="ar" key={m.id}>
          <select value={m.from} onChange={e => up(x => { get(x)[i].from = e.target.value as Msg['from']; })}>
            <option value="them">상대</option><option value="me">나</option>
          </select>
          <input placeholder="시간 (예: 오후 3:20)" value={m.time} onChange={e => up(x => { get(x)[i].time = e.target.value; })} />
          <textarea rows={2} placeholder="내용" value={m.text} onChange={e => up(x => { get(x)[i].text = e.target.value; })} />
          <Ctl i={i} n={list.length} m={k => up(x => mv(get(x), i, k))} del={() => up(x => { get(x).splice(i, 1); })} />
        </div>
      ))}
      <button className="btn" onClick={() => up(x => { get(x).push({ id: uid(), from: 'them', text: '', time: '' }); })}>+ 말풍선 추가</button>
    </div>
  );
}

export function Gate({ onOk, onClose }: { onOk: () => void; onClose: () => void }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const go = async () => { try { await login(pw); onOk(); } catch (e) { setErr((e as Error).message); } };
  return (
    <div className="panel">
      <div className="pbody">
        <h3>관리자 로그인</h3>
        <input type="password" autoFocus value={pw} placeholder="관리자 비밀번호"
          onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} />
        {err && <p className="err">{err}</p>}
      </div>
      <div className="savebar"><button onClick={onClose}>닫기</button><button className="pri" onClick={go}>로그인</button></div>
    </div>
  );
}

const TABS = [['kakao', '카카오톡'], ['gallery', '갤러리'], ['naver', '네이버'], ['insta', '인스타'],
  ['calls', '전화'], ['threads', '메시지'], ['incoming', '수신전화']] as const;

export function Admin({ c, onSaved, onClose, onLogout, onPreview }: {
  c: Content; onSaved: (c: Content) => void; onClose: () => void; onLogout: () => void; onPreview: () => void;
}) {
  const [d, setD] = useState<Content>(() => structuredClone(c));
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('kakao');
  const [msg, setMsg] = useState('');
  const up: Up = f => setD(p => { const n = structuredClone(p); f(n); return n; });
  const save = async () => {
    setMsg('저장 중…');
    try { await saveContent(d); onSaved(d); setMsg('저장되었습니다'); }
    catch (e) { setMsg(`저장 실패: ${(e as Error).message}`); }
  };

  return (
    <div className="panel">
      <div className="pbody">
        <div className="tabs">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

        {tab === 'kakao' && <>
          <h3>💙 채팅방 · 상대 프로필 사진</h3>
          <File1 v={d.kakao.avatar} set={u => up(x => { x.kakao.avatar = u; })} />
          <h3>대화 내용</h3>
          <MsgEditor get={x => x.kakao.messages} d={d} up={up} />
        </>}

        {tab === 'gallery' && <>
          <h3>갤러리 사진</h3>
          {d.gallery.map((s, i) => (
            <div className="card" key={s + i}><File1 v={s} set={u => up(x => { if (u) x.gallery[i] = u; else x.gallery.splice(i, 1); })} />
              <Ctl i={i} n={d.gallery.length} m={k => up(x => mv(x.gallery, i, k))} del={() => up(x => { x.gallery.splice(i, 1); })} /></div>
          ))}
          <label className="btn">+ 사진 추가 (여러 장)
            <input hidden multiple type="file" accept="image/*" onChange={async e => {
              const fs = [...(e.target.files || [])]; e.target.value = '';
              for (const f of fs) {
                try { const u = await upload(f); up(x => { x.gallery.push(u); }); } catch (er) { setMsg((er as Error).message); }
              }
            }} />
          </label>
        </>}

        {tab === 'naver' && <>
          <h3>최근 검색어 (표시 순서)</h3>
          {d.naver.map((t, i) => (
            <div className="card" key={i}>
              <input value={t} onChange={e => up(x => { x.naver[i] = e.target.value; })} />
              <Ctl i={i} n={d.naver.length} m={k => up(x => mv(x.naver, i, k))} del={() => up(x => { x.naver.splice(i, 1); })} />
            </div>
          ))}
          <button className="btn" onClick={() => up(x => { x.naver.push(''); })}>+ 검색어 추가</button>
        </>}

        {tab === 'insta' && <>
          <h3>프로필 사진</h3>
          <File1 v={d.insta.avatar} set={u => up(x => { x.insta.avatar = u; })} />
          <h3>게시물 9칸 (▲▼로 순서 변경)</h3>
          {d.insta.posts.map((s, i) => (
            <div className="card" key={i}><b>{i + 1}번</b>
              <File1 v={s} set={u => up(x => { x.insta.posts[i] = u; })} />
              <Ctl i={i} n={9} m={k => up(x => mv(x.insta.posts, i, k))} /></div>
          ))}
        </>}

        {tab === 'calls' && <>
          <h3>통화 목록</h3>
          {d.calls.map((x, i) => (
            <div className="card" key={x.id}>
              <File1 v={x.avatar} set={u => up(n => { n.calls[i].avatar = u; })} />
              <input placeholder="발신자 이름" value={x.name} onChange={e => up(n => { n.calls[i].name = e.target.value; })} />
              <select value={x.type} onChange={e => up(n => { n.calls[i].type = e.target.value as Call['type']; })}>
                {(['incoming', 'outgoing', 'missed'] as const).map(t => <option key={t} value={t}>{CALL_LABEL[t]}</option>)}
              </select>
              <input placeholder="시간 (예: 오후 3:20)" value={x.time} onChange={e => up(n => { n.calls[i].time = e.target.value; })} />
              <input placeholder="통화 시간 (예: 12분 3초)" value={x.duration} onChange={e => up(n => { n.calls[i].duration = e.target.value; })} />
              <Ctl i={i} n={d.calls.length} m={k => up(n => mv(n.calls, i, k))} del={() => up(n => { n.calls.splice(i, 1); })} />
            </div>
          ))}
          <button className="btn" onClick={() => up(x => { x.calls.push({ id: uid(), name: '', avatar: '', type: 'incoming', time: '', duration: '' }); })}>+ 통화 추가</button>
        </>}

        {tab === 'threads' && <>
          <h3>메시지 목록</h3>
          {d.threads.map((t, ti) => (
            <div className="card" key={t.id}>
              <input placeholder="상대 이름" value={t.name} onChange={e => up(x => { x.threads[ti].name = e.target.value; })} />
              <File1 v={t.avatar} set={u => up(x => { x.threads[ti].avatar = u; })} />
              <MsgEditor get={x => x.threads[ti].messages} d={d} up={up} />
              <Ctl i={ti} n={d.threads.length} m={k => up(x => mv(x.threads, ti, k))} del={() => up(x => { x.threads.splice(ti, 1); })} />
            </div>
          ))}
          <button className="btn" onClick={() => up(x => { x.threads.push({ id: uid(), name: '', avatar: '', messages: [] }); })}>+ 대화 추가</button>
        </>}

        {tab === 'incoming' && <>
          <h3>수신 전화 (접속 180초 후)</h3>
          <input placeholder="발신자 이름" value={d.incoming.name} onChange={e => up(x => { x.incoming.name = e.target.value; })} />
          <p>사진</p><File1 v={d.incoming.avatar} set={u => up(x => { x.incoming.avatar = u; })} />
          <p>음성 파일 (mp3/m4a/wav/ogg, 4.4MB 이하)</p><File1 kind="audio" v={d.incoming.audio} set={u => up(x => { x.incoming.audio = u; })} />
          <button className="btn" onClick={onPreview}>저장된 설정으로 미리보기</button>
        </>}
      </div>
      <div className="savebar">
        <button onClick={onClose}>닫기</button>
        <button onClick={() => logout().then(onLogout)}>로그아웃</button>
        <button className="pri" onClick={save}>저장</button>
      </div>
      {msg && <div className="toast">{msg}</div>}
    </div>
  );
}
