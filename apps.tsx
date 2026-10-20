import { useEffect, useRef, useState } from 'react';
import { CALL_LABEL, type Content } from './types';

export const Av = ({ src, s = 40 }: { src: string; s?: number }) =>
  src ? <img className="av" style={{ width: s, height: s }} src={src} alt="" />
      : <div className="av ph" style={{ width: s, height: s }}>👤</div>;
const Pic = ({ src }: { src: string }) => (src ? <img src={src} alt="" /> : <div className="ph">사진 없음</div>);
type P = { c: Content; back: () => void };
const Head = ({ title, back }: { title: string; back: () => void }) =>
  <div className="hd"><button onClick={back} aria-label="뒤로">‹</button><b>{title}</b><span /></div>;

export function Kakao({ c, back }: P) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView(); }, [c]);
  return (
    <div className="app kk">
      <Head title="💙" back={back} />
      <div className="kb">
        {!c.kakao.messages.length && <p className="empty">대화 내용이 없습니다</p>}
        {c.kakao.messages.map(m => (
          <div key={m.id} className={`kr ${m.from}`}>
            {m.from === 'them' && <Av src={c.kakao.avatar} />}
            <span className="bb">{m.text}</span><time>{m.time}</time>
          </div>
        ))}
        <div ref={end} />
      </div>
    </div>
  );
}

export function Gallery({ c, back }: P) {
  const [i, setI] = useState<number | null>(null);
  const g = c.gallery;
  return (
    <div className="app">
      <Head title="사진" back={back} />
      <div className="grid3 scroll">
        {!g.length && <p className="empty">사진이 없습니다</p>}
        {g.map((s, k) => <button key={s + k} onClick={() => setI(k)}><img src={s} alt="" /></button>)}
      </div>
      {i !== null && g[i] && (
        <div className="view">
          <img src={g[i]} alt="" />
          <button className="x" onClick={() => setI(null)} aria-label="닫기">✕</button>
          <button className="pv" disabled={i === 0} onClick={() => setI(i - 1)}>‹</button>
          <button className="nx" disabled={i === g.length - 1} onClick={() => setI(i + 1)}>›</button>
        </div>
      )}
    </div>
  );
}

export function Naver({ c, back }: P) {
  return (
    <div className="app nv">
      <Head title="NAVER" back={back} />
      <div className="sbox">🔍 검색어를 입력하세요</div>
      <h4>최근 검색어</h4>
      <ul>{c.naver.map((t, i) => <li key={i}>🕘 {t}</li>)}</ul>
      {!c.naver.length && <p className="empty">최근 검색어가 없습니다</p>}
    </div>
  );
}

export function Insta({ c, back }: P) {
  const [o, setO] = useState<number | null>(null);
  const u = 'a_peach_cbg';
  if (o !== null)
    return (
      <div className="app">
        <Head title="게시물" back={() => setO(null)} />
        <div className="scroll">
          <div className="ph-h"><Av src={c.insta.avatar} s={32} /><b>{u}</b></div>
          <div className="sq"><Pic src={c.insta.posts[o]} /></div>
        </div>
      </div>
    );
  const stats = [['게시물', 9], ['팔로워', 715], ['팔로잉', 1]] as const;
  return (
    <div className="app">
      <Head title={u} back={back} />
      <div className="scroll">
        <div className="pf">
          <Av src={c.insta.avatar} s={84} />
          <div className="st">{stats.map(([l, n]) => <div key={l}><b>{n}</b><span>{l}</span></div>)}</div>
        </div>
        <b className="un">{u}</b>
        <div className="grid3">
          {c.insta.posts.map((s, k) =>
            s ? <button key={k} onClick={() => setO(k)}><img src={s} alt="" /></button>
              : <div key={k} className="ph">비어 있음</div>)}
        </div>
      </div>
    </div>
  );
}

export function Phone({ c, back }: P) {
  return (
    <div className="app">
      <Head title="최근 통화" back={back} />
      <div className="scroll">
        {!c.calls.length && <p className="empty">통화 기록이 없습니다</p>}
        {c.calls.map(x => (
          <div key={x.id} className="row">
            <Av src={x.avatar} />
            <div className="rt">
              <b className={x.type === 'missed' ? 'red' : ''}>{x.name || '이름 없음'}</b>
              <small>{CALL_LABEL[x.type]}{x.duration && ` · ${x.duration}`}</small>
            </div>
            <time>{x.time}</time>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Messages({ c, back }: P) {
  const [id, setId] = useState<string | null>(null);
  const t = c.threads.find(x => x.id === id);
  if (t)
    return (
      <div className="app">
        <Head title={t.name || '이름 없음'} back={() => setId(null)} />
        <div className="scroll ms">
          {!t.messages.length && <p className="empty">메시지가 없습니다</p>}
          {t.messages.map(m => <div key={m.id} className={`mr ${m.from}`}><span className="bb">{m.text}</span></div>)}
        </div>
      </div>
    );
  return (
    <div className="app">
      <Head title="메시지" back={back} />
      <div className="scroll">
        {!c.threads.length && <p className="empty">메시지가 없습니다</p>}
        {c.threads.map(x => {
          const l = x.messages[x.messages.length - 1];
          return (
            <button key={x.id} className="row full" onClick={() => setId(x.id)}>
              <Av src={x.avatar} />
              <div className="rt"><b>{x.name || '이름 없음'}</b><small>{l?.text || ''}</small></div>
              <time>{l?.time}</time>
            </button>
          );
        })}
      </div>
    </div>
  );
}
