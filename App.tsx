import { useEffect, useRef, useState } from 'react';
import { emptyContent, type Content } from './types';
import { getContent, me } from './api';
import { Av, Gallery, Insta, Kakao, Messages, Naver, Phone } from './apps';
import { Admin, Gate } from './Admin';

type AppId = 'kakao' | 'gallery' | 'naver' | 'insta' | 'phone' | 'messages' | 'camera' | 'store';
type Ic = { id: AppId; label: string; cls: string; g: string; live: boolean };
const HOME: Ic[] = [
  { id: 'kakao', label: '카카오톡', cls: 'i-kakao', g: 'TALK', live: true },
  { id: 'gallery', label: '갤러리', cls: 'i-gal', g: '🌼', live: true },
  { id: 'naver', label: '네이버', cls: 'i-naver', g: 'N', live: true },
  { id: 'insta', label: '인스타그램', cls: 'i-insta', g: '◎', live: true },
];
const DOCK: Ic[] = [
  { id: 'phone', label: '전화', cls: 'i-phone', g: '📞', live: true },
  { id: 'messages', label: '메시지', cls: 'i-msg', g: '💬', live: true },
  { id: 'camera', label: '카메라', cls: 'i-cam', g: '📷', live: false },
  { id: 'store', label: 'App Store', cls: 'i-store', g: 'A', live: false },
];

const useNow = () => {
  const [n, setN] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setN(new Date()), 1000); return () => clearInterval(i); }, []);
  return n;
};

function Lock({ onOk, now }: { onOk: () => void; now: Date }) {
  const [pin, setPin] = useState('');
  const [bad, setBad] = useState(false);
  const press = (n: string) => {
    if (pin.length >= 4 || bad) return;
    const p = pin + n;
    setPin(p);
    if (p.length < 4) return;
    if (p === '0912') setTimeout(onOk, 150);
    else { setBad(true); setTimeout(() => { setBad(false); setPin(''); }, 500); }
  };
  const L = ['', 'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQRS', 'TUV', 'WXYZ'];
  return (
    <div className="lock bg">
      <div className="d">{now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</div>
      <div className="t">{now.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: false })}</div>
      <div className="h">암호 입력</div>
      <div className={`dots ${bad ? 'shake' : ''}`}>{[0, 1, 2, 3].map(i => <i key={i} className={i < pin.length ? 'on' : ''} />)}</div>
      <div className="pad">
        {L.map((l, i) => <button key={i} onClick={() => press(String(i + 1))}>{i + 1}<small>{l}</small></button>)}
        <span />
        <button onClick={() => press('0')}>0<small /></button>
        <button className="z" onClick={() => setPin(p => p.slice(0, -1))}>{pin ? '삭제' : ''}</button>
      </div>
    </div>
  );
}

function IncomingCall({ d, onDone }: { d: Content['incoming']; onDone: () => void }) {
  const [on, setOn] = useState(false);
  const [sec, setSec] = useState(0);
  const au = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (!on) { navigator.vibrate?.([500, 300, 500]); return; }
    const i = setInterval(() => setSec(s => s + 1), 1000);
    return () => clearInterval(i);
  }, [on]);
  const answer = () => {
    setOn(true);
    if (au.current && d.audio) au.current.play().catch(onDone);
    else setTimeout(onDone, 2000);
  };
  const hang = () => { au.current?.pause(); onDone(); };
  return (
    <div className="call">
      <Av src={d.avatar} s={110} />
      <div className="n">{d.name || '이름 없음'}</div>
      <div className="s">{on ? `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}` : '휴대전화'}</div>
      <audio ref={au} src={d.audio || undefined} preload="auto" onEnded={onDone} onError={onDone} />
      <div className="bt">
        <div><button className="r" onClick={hang} aria-label={on ? '종료' : '거절'}>✕</button><small>{on ? '종료' : '거절'}</small></div>
        {!on && <div><button onClick={answer} aria-label="받기">📞</button><small>받기</small></div>}
      </div>
    </div>
  );
}

export default function App() {
  const [c, setC] = useState<Content>(emptyContent);
  const [admin, setAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [app, setApp] = useState<AppId | null>(null);
  const [ring, setRing] = useState(false);
  const fired = useRef(false);
  const now = useNow();
  const showAdmin = new URLSearchParams(location.search).has('admin');

  useEffect(() => {
    getContent().then(d => setC({ ...emptyContent, ...d })).catch(() => {});
    me().then(r => setAdmin(r.admin)).catch(() => {});
  }, []);

  // 최초 접속 180초 후 수신 전화 (App 최상위에서 관리 → 앱 이동과 무관, 세션당 1회)
  useEffect(() => {
    try { if (sessionStorage.getItem('callDone')) return; } catch { /* ignore */ }
    let t0 = Date.now();
    try {
      t0 = Number(sessionStorage.getItem('t0')) || t0;
      sessionStorage.setItem('t0', String(t0));
    } catch { /* ignore */ }
    const id = setTimeout(() => {
      if (fired.current) return;
      fired.current = true;
      try { sessionStorage.setItem('callDone', '1'); } catch { /* ignore */ }
      setRing(true);
    }, Math.max(0, t0 + 180_000 - Date.now()));
    return () => clearTimeout(id);
  }, []);

  const back = () => setApp(null);
  const Icon = (a: Ic) => (
    <button key={a.id} className="ic" onClick={a.live ? () => setApp(a.id) : undefined}>
      <span className={`g ${a.cls}`}>{a.g}</span><span>{a.label}</span>
    </button>
  );

  return (
    <div className="phone" data-light={unlocked && !!app}>
      <div className="sb"><span>{now.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: false })}</span><span>5G ▂▄▆█ ▭</span></div>
      {!unlocked ? <Lock now={now} onOk={() => setUnlocked(true)} /> : (
        <>
          <div className="home bg">
            <div className="ig4">{HOME.map(Icon)}</div>
            <div className="dock">{DOCK.map(Icon)}</div>
          </div>
          {app && (
            <div className="app-layer">
              {app === 'kakao' && <Kakao c={c} back={back} />}
              {app === 'gallery' && <Gallery c={c} back={back} />}
              {app === 'naver' && <Naver c={c} back={back} />}
              {app === 'insta' && <Insta c={c} back={back} />}
              {app === 'phone' && <Phone c={c} back={back} />}
              {app === 'messages' && <Messages c={c} back={back} />}
            </div>
          )}
        </>
      )}
      <button className="hb" disabled={!unlocked || !app} onClick={back} aria-label="홈"><i /></button>
      {showAdmin && <button className="adm-btn" onClick={() => setOpen(true)}>관리자</button>}
      {open && (admin
        ? <Admin c={c} onSaved={setC} onClose={() => setOpen(false)}
            onLogout={() => { setAdmin(false); setOpen(false); }}
            onPreview={() => { setOpen(false); setRing(true); }} />
        : <Gate onOk={() => setAdmin(true)} onClose={() => setOpen(false)} />)}
      {ring && <IncomingCall d={c.incoming} onDone={() => setRing(false)} />}
    </div>
  );
}
