'use client';
import React, { useEffect, useRef, useState } from 'react';
import {
  Icon, GoogleG, Wordmark, Pill, Button, Avatar, SelfieBubble, DigitRoll, ParticleBurst,
  Shell, useLiveState, useCountdownTo, capturePhoto, useCamera,
} from '@/components/ui';
import { Snapshot, RoundView, livePhase } from '@/lib/client-types';

async function post(url: string, body?: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
  return { ok: res.ok, json: await res.json().catch(() => ({})) };
}

export default function PlayerApp() {
  const { data, offset, refetch } = useLiveState<Snapshot>('/api/state');
  const [stage, setStage] = useState<'loading' | 'splash' | 'profile' | 'app'>('loading');
  const [showStandings, setShowStandings] = useState(false);

  // Decide initial stage once we know whether we're signed in.
  useEffect(() => {
    if (!data) return;
    setStage((s) => {
      if (s === 'loading') {
        if (!data.me) return 'splash';
        // New Google users land with ?setup=1 → send them through profile once.
        const setup = new URLSearchParams(window.location.search).get('setup');
        return setup === '1' ? 'profile' : 'app';
      }
      if (s === 'splash' && data.me) return 'profile'; // just joined
      return s;
    });
  }, [data]);

  if (!data || stage === 'loading') return <Shell><Center>Loading…</Center></Shell>;
  if (stage === 'splash' || !data.me) return <Shell><Splash /></Shell>;
  if (stage === 'profile') return <Shell><Profile me={data.me} onDone={() => { refetch(); setStage('app'); }} /></Shell>;

  // ---- state-aware app ----
  const ev = data.event;
  const phase = livePhase(data.round, offset);
  let screen: React.ReactNode;
  if (showStandings) screen = <Standings data={data} onClose={() => setShowStandings(false)} />;
  else if (ev.status === 'lobby') screen = <Lobby data={data} />;
  else if (ev.status === 'finished') screen = <Standings data={data} final />;
  else if (data.round) {
    if (phase === 'reveal') screen = <TargetReveal data={data} offset={offset} />;
    else if (phase === 'hunt') screen = data.round.iAmTarget ? <YouAreTarget data={data} offset={offset} /> : <HunterMode data={data} offset={offset} onChange={refetch} />;
    else if (phase === 'verify') screen = <Verifying data={data} />;
    else if (phase === 'result') screen = <RoundResult data={data} onStandings={() => setShowStandings(true)} />;
    else screen = <Lobby data={data} />;
  } else screen = <Lobby data={data} />;

  return (
    <Shell>
      {screen}
      {/* floating standings peek (hidden on result/standings) */}
      {!showStandings && ev.status !== 'finished' && phase !== 'result' && (
        <button onClick={() => setShowStandings(true)}
          className="fh-press absolute top-3 right-3 z-30 h-9 px-3 rounded-full bg-surface/80 backdrop-blur border border-line text-[11px] font-semibold text-muted hover:text-ink inline-flex items-center gap-1.5">
          <Icon.Trophy size={13} /> Standings
        </button>
      )}
    </Shell>
  );
}

const Center = ({ children }: { children: React.ReactNode }) => (
  <div className="h-full flex items-center justify-center text-muted fh-mono text-sm">{children}</div>
);

/* ───────────────────────── 1. Splash / Join ───────────────────────── */
const AUTH_ERRORS: Record<string, string> = {
  google_unavailable: "Google sign-in isn't set up yet — use a nickname + code.",
  domain: 'Please use your company Google account.',
  oauth_state: 'Google sign-in expired — try again.',
  oauth_exchange: 'Google sign-in failed — try again.',
  oauth_token: 'Google sign-in failed — try again.',
  oauth_email: 'That Google account has no verified email.',
};

function Splash() {
  const [err, setErr] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [allowedHd, setAllowedHd] = useState<string | null>(null);

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('error');
    fetch('/api/config').then((r) => r.json()).then((c) => {
      setGoogleEnabled(!!c.googleEnabled);
      setAllowedHd(c.allowedHd || null);
      if (e) {
        const msg = e === 'domain' && c.allowedHd
          ? `Please sign in with your @${c.allowedHd} Google account.`
          : (AUTH_ERRORS[e] || 'Sign-in failed — try again.');
        setErr(msg);
      }
    }).catch(() => { if (e) setErr(AUTH_ERRORS[e] || 'Sign-in failed — try again.'); });
  }, []);
  return (
    <div className="h-full w-full relative flex flex-col">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(60% 50% at 50% 30%, rgba(255,0,110,0.18), transparent 70%), radial-gradient(70% 60% at 50% 90%, rgba(124,58,237,0.28), transparent 70%)' }} />
      <div className="relative flex-1 flex flex-col items-center justify-center px-7 pt-10">
        <div className="relative h-40 w-40 flex items-center justify-center mb-6">
          {[0, 1, 2].map((i) => <span key={i} className="absolute inset-0 rounded-full fh-halo-ring" style={{ border: '1px solid rgba(255,0,110,0.55)', animationDelay: `${i * 0.9}s` }} />)}
          <div className="absolute inset-3 rounded-full fh-halo" style={{ background: 'radial-gradient(closest-side, rgba(255,0,110,0.45), rgba(255,0,110,0) 70%)', filter: 'blur(6px)' }} />
          <div className="relative h-24 w-24 rounded-full grid place-items-center" style={{ background: 'conic-gradient(from 220deg, #00F0FF 0%, #7C3AED 35%, #FF006E 65%, #00F0FF 100%)', padding: 2 }}>
            <div className="h-full w-full rounded-full bg-void grid place-items-center"><Icon.Target size={38} sw={1.4} /></div>
          </div>
        </div>
        <Wordmark size={44} />
        <div className="mt-3 text-[15px] font-semibold text-ink text-center">The hunt is on.</div>
        <div className="mt-1 text-[12.5px] text-cyan/80 fh-mono whitespace-nowrap">ล่าเป้า · หลบหนี · เอาตัวรอด</div>
      </div>

      <div className="relative px-6 pb-8 space-y-3">
        {err && <div className="text-center text-[12px] text-magenta">{err}</div>}
        {googleEnabled ? (
          <a href="/api/auth/google"
            className="fh-press relative w-full h-14 rounded-2xl bg-white text-[#111] font-bold text-[15px] inline-flex items-center justify-center gap-2.5 fh-sweep overflow-hidden">
            <GoogleG /> Sign in with Google
          </a>
        ) : (
          <button disabled title="Google sign-in: add OAuth keys to enable"
            className="relative w-full h-14 rounded-2xl bg-white/90 text-[#111] font-bold text-[15px] inline-flex items-center justify-center gap-2.5 opacity-50 cursor-not-allowed">
            <GoogleG /> Sign in with Google
          </button>
        )}
        {allowedHd && (
          <div className="text-center text-[11px] text-muted">Only <span className="text-cyan font-semibold">@{allowedHd}</span> accounts can join</div>
        )}
        <div className="text-center text-[10.5px] text-dim mt-4">2C2P Year-End · Anantara Riverside · Hunt opens 21:30</div>
      </div>
    </div>
  );
}

/* ───────────────────────── 2. Profile ───────────────────────── */
function Profile({ me, onDone }: { me: Snapshot['me']; onDone: () => void }) {
  const nick = me?.nickname || '';
  const [selfie, setSelfie] = useState<string | null>(me?.selfie || null);
  const [busy, setBusy] = useState(false);
  const takeSelfie = async () => { const img = await capturePhoto(); setSelfie(img); };
  const save = async (withSelfie: boolean) => {
    setBusy(true);
    await post('/api/profile', { selfie: withSelfie && selfie && selfie.startsWith('data:') ? selfie : undefined });
    setBusy(false); onDone();
  };
  return (
    <div className="h-full flex flex-col">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div><Pill tone="purple">Setup</Pill><div className="mt-2 text-[20px] font-extrabold tracking-tight">Set up your hunt profile</div></div>
        <div className="flex items-center gap-1.5">{[1, 2, 3].map((i) => <span key={i} className="h-1 rounded-full" style={{ width: i === 2 ? 22 : 10, background: i <= 2 ? 'var(--fh-cyan)' : 'var(--fh-line)' }} />)}</div>
      </div>
      <div className="flex-1 fh-scroll px-5 pb-3">
        <div className="mt-3 flex flex-col items-center">
          <button onClick={takeSelfie} className="fh-press relative grid place-items-center">
            <div className={selfie ? '' : 'fh-pulse-cyan'} style={{ borderRadius: '50%' }}>
              {selfie ? <SelfieBubble name={nick} size={180} frame="cyan" selfie={selfie.startsWith('data:') ? selfie : selfie} /> : (
                <div className="relative" style={{ width: 180, height: 180 }}>
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan/60" />
                  <div className="absolute inset-3 rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(0,240,255,0.18), transparent 70%)' }} />
                  <div className="absolute inset-0 grid place-items-center text-cyan"><div className="flex flex-col items-center gap-1.5"><Icon.Camera size={32} sw={1.4} /><span className="text-[12px] font-semibold text-ink">Tap to take selfie</span></div></div>
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full bg-cyan grid place-items-center text-void fh-ring-cyan"><Icon.Camera size={18} sw={2} /></div>
          </button>
          <div className="mt-3 text-[11px] text-muted text-center max-w-[260px]">
            {selfie ? <span className="text-success">Looking sharp. <button onClick={takeSelfie} className="text-cyan underline">retake</button></span> : <span>Hunters need to recognize you when you&apos;re the target.</span>}
          </div>
        </div>
        <div className="mt-6">
          <div className="text-[10.5px] uppercase tracking-[0.18em] text-muted fh-mono mb-1.5">Your nickname</div>
          <div className="rounded-xl bg-surface border border-line h-12 px-3.5 flex items-center">
            <span className="flex-1 text-[15px] font-semibold text-ink truncate">{nick}</span>
            <span className="text-[10.5px] fh-mono text-dim uppercase tracking-wider">locked</span>
          </div>
          <div className="text-[10.5px] text-dim mt-1.5">Set at sign-in — ask the host to reset the event if you need to change it.</div>
        </div>
      </div>
      <div className="px-5 pb-7 pt-2 grid grid-cols-2 gap-2.5">
        <Button kind="ghost" className="!border !border-line" onClick={() => save(false)}>Skip selfie</Button>
        <Button kind="primary" disabled={busy} onClick={() => save(true)} trailing={<Icon.ChevronRight size={16} />}>Continue</Button>
      </div>
    </div>
  );
}

/* ───────────────────────── 3. Lobby ───────────────────────── */
function Lobby({ data }: { data: Snapshot }) {
  const { lobby, event } = data;
  return (
    <div className="h-full flex flex-col">
      <div className="px-5 pt-5 pb-2 flex items-center gap-2">
        <Pill tone="purple"><span className="fh-live h-1.5 w-1.5 rounded-full bg-[#c5a8ff] inline-block mr-1" />Lobby</Pill>
        <Pill tone="cyan"><Icon.Dot size={9} /> Live</Pill>
      </div>
      <div className="px-5">
        <div className="text-[22px] font-extrabold tracking-tight">Waiting room</div>
        <div className="text-[12.5px] text-muted">Host kicks off the hunt when everyone&apos;s in.</div>
        <div className="text-[12.5px] text-cyan/80 fh-mono mt-1">พร้อมล่าเป้าหรือยัง?</div>
      </div>
      <div className="px-5 mt-4">
        <div className="rounded-2xl bg-purple/[0.08] border border-purple/30 p-4 relative overflow-hidden">
          <div className="absolute -top-12 -right-10 h-40 w-40 rounded-full pointer-events-none" style={{ background: 'radial-gradient(closest-side, rgba(124,58,237,0.45), transparent 70%)' }} />
          <div className="relative">
            <div className="text-[12px] text-muted">Multi-round manhunt — points per round, top 1-5 score.</div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <Stat label="Rounds" value={String(event.roundsPlanned)} tone="cyan" />
              <Stat label="Per round" value={`${event.roundSeconds}s`} tone="magenta" />
              <Stat label="Score" value="1-5" tone="gold" />
            </div>
          </div>
        </div>
      </div>
      <div className="px-5 mt-4">
        <div className="text-[10.5px] uppercase tracking-[0.18em] text-cyan fh-mono">Hunters joined</div>
        <div className="text-[26px] font-extrabold leading-none mt-1"><DigitRoll value={lobby.count} pad={2} /></div>
      </div>
      <div className="px-5 mt-4 flex-1 fh-scroll">
        <div className="grid grid-cols-6 gap-2.5 pb-3">
          {lobby.players.map((p, i) => (
            <div key={i} className="fh-up flex flex-col items-center gap-1" style={{ animationDelay: `${i * 25}ms` }}>
              <Avatar name={p.nickname} hue={p.hue} selfie={p.selfie} size={44} ring={p.isMe} />
              <div className={`text-[10.5px] truncate max-w-[48px] text-center ${p.isMe ? 'text-cyan font-semibold' : 'text-muted'}`}>{p.nickname}</div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-warn/5 border border-warn/30 p-3.5">
          <div className="flex items-start gap-2.5">
            <div className="h-7 w-7 shrink-0 rounded-lg bg-warn/15 border border-warn/30 grid place-items-center"><Icon.Target size={14} className="text-warn" /></div>
            <div className="text-[12px] text-ink/90 leading-relaxed">When the hunt starts, a random hunter becomes the <span className="text-warn font-bold">TARGET</span>. Everyone else races to photograph their face. First 5 verified win points.</div>
          </div>
        </div>
      </div>
      <div className="px-5 pt-3 pb-7">
        <div className="rounded-2xl border border-line bg-[#0e0e18] h-12 flex items-center px-4 gap-3 overflow-hidden relative">
          <div className="h-2 w-2 rounded-full bg-cyan fh-live" />
          <div className="text-[13px] font-medium">Waiting for host to start round 1</div>
          <div className="absolute inset-x-0 bottom-0 h-px fh-shimmer" />
        </div>
      </div>
    </div>
  );
}
const Stat = ({ label, value, tone }: { label: string; value: string; tone: 'cyan' | 'magenta' | 'gold' }) => {
  const c = { cyan: 'text-cyan', magenta: 'text-magenta', gold: 'text-gold' }[tone];
  return <div className="rounded-xl bg-void/60 border border-line p-2.5"><div className="text-[9.5px] uppercase fh-mono tracking-[0.16em] text-muted">{label}</div><div className={`fh-mono text-[20px] font-extrabold leading-none mt-0.5 ${c}`}>{value}</div></div>;
};

/* ───────────────────────── 4. Target Reveal ───────────────────────── */
function TargetReveal({ data, offset }: { data: Snapshot; offset: number }) {
  const r = data.round!;
  const t = r.target;
  const REWARDS = [{ r: 1, p: 10, c: 'gold' }, { r: 2, p: 6, c: 'silver' }, { r: 3, p: 4, c: 'bronze' }, { r: 4, p: 2, c: 'muted' }, { r: 5, p: 1, c: 'muted' }] as const;
  const { sec } = useCountdownTo(r.revealUntil, offset);
  return (
    <div className="h-full flex flex-col relative">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(70% 50% at 50% 25%, rgba(255,0,110,0.35), transparent 70%), radial-gradient(60% 50% at 50% 90%, rgba(124,58,237,0.25), transparent 70%)' }} />
      <div className="relative h-px" style={{ boxShadow: '0 0 14px 2px rgba(255,0,110,0.7)', background: 'linear-gradient(90deg, transparent, #FF006E, transparent)' }} />
      <div className="relative px-5 pt-6 text-center"><div className="text-[10.5px] uppercase tracking-[0.32em] fh-mono text-magenta">Tonight&apos;s target · starts in {sec}s</div></div>
      <div className="relative mt-6 flex flex-col items-center">
        <div className="absolute -top-2 z-10"><Pill tone="solidMagenta" size="lg" className="!gap-1.5"><Icon.Target size={11} /> TARGET</Pill></div>
        <SelfieBubble name={t?.nickname || '?'} hue={t?.hue} selfie={t?.selfie} size={220} frame="magenta" pulse />
      </div>
      <div className="relative mt-5 px-5 text-center">
        <div className="text-[40px] font-black tracking-tight leading-none" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FF006E 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', textShadow: '0 0 36px rgba(255,0,110,0.35)' }}>{t?.nickname}</div>
        <div className="text-[13px] text-ink/90 mt-3 leading-relaxed">Find them. Photograph their face. <span className="text-magenta font-semibold">First 5 verified</span> submissions score.</div>
      </div>
      <div className="relative mt-auto px-5">
        <div className="text-[10.5px] uppercase fh-mono tracking-[0.18em] text-muted text-center mb-2">Rank rewards</div>
        <div className="grid grid-cols-5 gap-1.5">
          {REWARDS.map((x) => {
            const col = { gold: '#FFD24A', silver: '#C9D2DA', bronze: '#E0934A', muted: '#FFFFFF' }[x.c];
            return <div key={x.r} className="rounded-xl bg-surface border p-2 text-center" style={{ borderColor: `${col}88` }}><div className="fh-mono text-[10px] font-bold" style={{ color: col }}>#{x.r}</div><div className="fh-mono text-[18px] font-extrabold leading-none mt-0.5" style={{ color: col }}>+{x.p}</div><div className="text-[9px] uppercase tracking-wider text-muted mt-1">pts</div></div>;
          })}
        </div>
      </div>
      <div className="relative px-5 pt-4 pb-7"><div className="text-center text-[12px] text-muted fh-mono">{r.iAmTarget ? "You're the target — hide!" : 'Get ready to hunt…'}</div></div>
    </div>
  );
}

/* ───────────────────────── 5. Hunter Mode ───────────────────────── */
function HunterMode({ data, offset, onChange }: { data: Snapshot; offset: number; onChange: () => void }) {
  const r = data.round!;
  const t = r.target;
  const { sec, mm, ss } = useCountdownTo(r.huntEndsAt, offset);
  const danger = sec <= 15;
  const cam = useCamera('environment');
  const [shot, setShot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [flash, setFlash] = useState(0);
  const [burst, setBurst] = useState(0);

  const takeShot = () => { setShot(cam.capture()); setFlash((k) => k + 1); setBurst((k) => k + 1); setErr(''); };
  const send = async () => {
    if (!shot || busy) return;
    setBusy(true); setErr('');
    const { ok, json } = await post('/api/submissions', { image: shot });
    setBusy(false);
    if (!ok) { setErr(json.error || 'rejected'); return; }
    setShot(null); onChange();
  };
  const my = r.mySubmission;
  const locked = !!my; // one submission per round

  return (
    <div className="h-full flex flex-col relative">
      <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 rounded-2xl bg-magenta/[0.08] border border-magenta/40 p-1.5 pr-3 fh-ring-magenta">
          <SelfieBubble name={t?.nickname || '?'} hue={t?.hue} selfie={t?.selfie} size={42} frame="magenta" />
          <div className="leading-tight"><div className="text-[9px] uppercase fh-mono tracking-[0.18em] text-magenta">TARGET</div><div className="text-[13px] font-bold">{t?.nickname}</div></div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase fh-mono tracking-[0.18em] text-muted">Round {r.idx}</div>
          <div className={`fh-mono font-bold text-[26px] leading-none mt-0.5 ${danger ? 'text-magenta' : 'text-cyan'}`} style={{ textShadow: danger ? '0 0 18px rgba(255,0,110,0.55)' : '0 0 18px rgba(0,240,255,0.55)' }}><DigitRoll value={parseInt(mm)} pad={2} />:<DigitRoll value={parseInt(ss)} pad={2} /></div>
        </div>
      </div>

      {/* Viewfinder — live camera, or the captured still under review */}
      <div className="flex-1 mx-4 mb-2 rounded-3xl border border-line relative overflow-hidden bg-black">
        {/* Live camera is ALWAYS mounted so the stream can attach to the ref;
            we just hide it when reviewing a shot, locked, or camera isn't ready. */}
        <video
          ref={cam.videoRef}
          autoPlay playsInline muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: !shot && !locked && cam.status === 'on' ? 'block' : 'none' }}
        />

        {/* captured still under review */}
        {shot && !locked && <img src={shot} alt="your shot" className="absolute inset-0 w-full h-full object-cover" />}

        {/* submitted confirmation */}
        {locked && (
          <div className="absolute inset-0 grid place-items-center text-center px-6" style={{ background: 'radial-gradient(70% 60% at 50% 40%, rgba(0,245,160,0.12), #0b0b12 75%)' }}>
            <div>
              <div className="h-16 w-16 rounded-full bg-success/15 border border-success/40 grid place-items-center mx-auto text-success"><Icon.Check size={30} /></div>
              <div className="text-[18px] font-extrabold mt-3">Photo submitted</div>
              <div className="text-[12.5px] text-muted mt-1">One shot per round — yours is in the queue.</div>
            </div>
          </div>
        )}

        {/* camera starting / blocked */}
        {!shot && !locked && cam.status !== 'on' && (
          <div className="absolute inset-0 grid place-items-center text-center px-6" style={{ background: `radial-gradient(70% 60% at 50% 40%, hsl(${t?.hue ?? 320} 50% 22%), #0b0b12 75%)` }}>
            <div>
              <Icon.Camera size={40} className="text-cyan/60 mx-auto" />
              <div className="text-[12px] text-muted mt-2">{cam.status === 'error' ? 'Camera blocked — allow access in your browser, or tap the shutter to send a placeholder.' : 'Starting camera…'}</div>
            </div>
          </div>
        )}

        {/* corner brackets */}
        {[{ p: 'left-3 top-3', r: 'border-l-2 border-t-2' }, { p: 'right-3 top-3', r: 'border-r-2 border-t-2' }, { p: 'left-3 bottom-3', r: 'border-l-2 border-b-2' }, { p: 'right-3 bottom-3', r: 'border-r-2 border-b-2' }].map((c, i) => <div key={i} className={`absolute ${c.p} h-6 w-6 ${c.r} border-cyan rounded-md`} />)}
        {!shot && !locked && <div className="absolute inset-x-0 top-0 h-full overflow-hidden pointer-events-none"><div className="fh-scan h-12 w-full" style={{ background: 'linear-gradient(180deg, transparent, rgba(0,240,255,0.25), transparent)' }} /></div>}
        <div className="absolute left-3 top-3">{locked ? <Pill tone={my?.status === 'approved' ? 'success' : my?.status === 'rejected' ? 'magenta' : 'warn'}>{my?.status === 'approved' ? `approved · +${my?.points}` : my?.status === 'rejected' ? 'rejected' : 'waiting for host'}</Pill> : shot ? <Pill tone="warn"><Icon.Eye size={11} /> review</Pill> : <Pill tone="cyan"><Icon.Camera size={11} /> aim at {t?.nickname}</Pill>}</div>
        {!shot && !locked && <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full border border-cyan/40"><div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-cyan" /></div>}
        {shot && <div className="absolute inset-6 rounded-xl border-[1.5px] border-cyan/70 pointer-events-none" style={{ boxShadow: '0 0 16px rgba(0,240,255,0.4)' }} />}
        {burst > 0 && <ParticleBurst run={burst} color="#00F0FF" />}
        {flash > 0 && <div key={flash} className="absolute inset-0 fh-flash" style={{ background: 'rgba(255,255,255,0.85)' }} />}
      </div>

      {/* live submissions ticker */}
      <div className="px-4 mb-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10.5px] uppercase fh-mono tracking-[0.18em] text-muted">Live submissions</div>
          <div className="text-[10.5px] fh-mono text-cyan flex items-center gap-1"><Icon.Dot size={8} /> {r.approvedScored} / 5</div>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {r.ticker.length === 0 && <div className="text-[11px] text-dim fh-mono">no submissions yet</div>}
          {r.ticker.map((s, i) => {
            const cfg = s.status === 'approved' ? { tone: 'success' as const, label: `#${s.rank} · +${s.points}` } : s.status === 'rejected' ? { tone: 'magenta' as const, label: 'Rejected' } : { tone: 'warn' as const, label: 'Verifying' };
            return <div key={i} className="shrink-0 inline-flex items-center gap-2 rounded-full bg-surface border border-line h-9 pl-1 pr-3"><Avatar name={s.nickname} hue={s.hue} size={26} /><span className="text-[12px] font-semibold">{s.nickname}</span><Pill tone={cfg.tone} size="sm">{cfg.label}</Pill></div>;
          })}
        </div>
      </div>

      {err && <div className="px-5 text-[12px] text-magenta mb-1">{err}</div>}
      <div className="px-5 pt-2 pb-7">
        {locked ? (
          <Button kind="success" className="w-full !h-14" disabled leading={<Icon.Check size={16} />}>Submitted · one shot per round</Button>
        ) : (
          <div className="flex items-center gap-3">
            {shot ? (
              <button onClick={() => setShot(null)} title="Retake" className="fh-press !h-14 !w-14 shrink-0 rounded-2xl border border-line grid place-items-center text-muted hover:text-ink"><Icon.Refresh size={20} /></button>
            ) : (
              <div className="!h-14 !w-14 shrink-0 rounded-2xl border border-line grid place-items-center text-muted"><Icon.Camera size={20} /></div>
            )}
            <button onClick={takeShot} title="Capture" className="fh-press relative h-[72px] w-[72px] mx-auto rounded-full grid place-items-center" style={{ background: 'radial-gradient(closest-side, #fff 0%, #fff 64%, transparent 70%)', boxShadow: '0 0 0 4px rgba(0,240,255,0.85), 0 0 0 7px rgba(0,240,255,0.25), 0 0 40px rgba(0,240,255,0.45)' }}><div className="h-12 w-12 rounded-full bg-white" /></button>
            <Button kind="success" className="!h-14 flex-1" trailing={<Icon.Send size={16} />} onClick={send} disabled={!shot || busy}>{busy ? 'Sending…' : shot ? 'Send' : 'Take a shot'}</Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── 6. You Are The Target ───────────────────────── */
function YouAreTarget({ data, offset }: { data: Snapshot; offset: number }) {
  const r = data.round!;
  const { mm, ss } = useCountdownTo(r.huntEndsAt, offset);
  const me = data.me!;
  return (
    <div className="h-full flex flex-col relative">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(70% 50% at 50% 20%, rgba(255,0,110,0.35), transparent 70%), radial-gradient(60% 50% at 50% 100%, rgba(124,58,237,0.25), transparent 70%)' }} />
      <div className="relative px-5 pt-5 flex items-center justify-between">
        <Pill tone="solidMagenta" className="!h-7 !px-3 !text-[11px]"><span className="fh-live h-1.5 w-1.5 rounded-full bg-white inline-block mr-1" /><Icon.Target size={11} /> You are the target</Pill>
        <Pill tone="muted"><Icon.Users size={10} /> Round {r.idx}</Pill>
      </div>
      <div className="relative px-5 mt-3">
        <div className="text-[10.5px] uppercase tracking-[0.18em] fh-mono text-magenta">Status</div>
        <div className="text-[34px] font-black leading-none mt-1" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FF006E 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', textShadow: '0 0 28px rgba(255,0,110,0.35)' }}>You&apos;re being hunted</div>
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-magenta/[0.08] border border-magenta/40 p-2.5 pr-4">
          <SelfieBubble name={me.nickname} hue={me.hue} selfie={me.selfie} size={48} frame="magenta" />
          <div><div className="text-[14px] font-bold">{me.nickname}</div><div className="text-[11px] text-muted">That&apos;s you on every hunter&apos;s screen.</div></div>
        </div>
      </div>
      <div className="relative px-5 mt-4">
        <div className="rounded-2xl bg-magenta/5 border border-magenta/30 p-4 relative overflow-hidden">
          <div className="absolute -top-12 -right-10 h-40 w-40 rounded-full pointer-events-none" style={{ background: 'radial-gradient(closest-side, rgba(255,0,110,0.35), transparent 70%)' }} />
          <div className="relative">
            <div className="text-[10.5px] uppercase tracking-[0.18em] fh-mono text-magenta">Survive for</div>
            <div className="fh-mono font-extrabold text-[68px] leading-none mt-0.5 text-ink" style={{ textShadow: '0 0 28px rgba(255,0,110,0.55)' }}><DigitRoll value={parseInt(mm)} pad={2} />:<DigitRoll value={parseInt(ss)} pad={2} /></div>
            <div className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-success"><Icon.Award size={14} /> <span className="font-semibold">+5 pts if you survive</span></div>
          </div>
        </div>
      </div>
      <div className="relative px-5 mt-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-surface border border-line p-3"><div className="text-[9.5px] uppercase fh-mono tracking-[0.16em] text-muted">Hunting you</div><div className="flex items-baseline gap-1 mt-0.5"><span className="fh-mono text-[28px] font-extrabold text-cyan leading-none"><DigitRoll value={r.hunterCount} /></span><span className="text-[11px] text-muted">hunters</span></div></div>
        <div className="rounded-2xl bg-surface border border-line p-3"><div className="text-[9.5px] uppercase fh-mono tracking-[0.16em] text-muted">Submissions</div><div className="flex items-baseline gap-1 mt-0.5"><span className="fh-mono text-[28px] font-extrabold text-magenta leading-none"><DigitRoll value={r.submissionCount} /></span><span className="text-[11px] text-muted">of you</span></div></div>
      </div>
      <div className="relative px-5 mt-3 flex-1 fh-scroll pb-6">
        <div className="rounded-2xl bg-warn/5 border border-warn/30 p-3.5 backdrop-blur">
          <div className="text-[10.5px] uppercase fh-mono tracking-[0.18em] text-warn mb-2">Survival rules</div>
          <div className="space-y-2">
            <Rule ok>Hide. Blend. Move to dim corners.</Rule>
            <Rule ok>Turn your back. Tilt your phone in front.</Rule>
            <Rule>No masks, hands, or cloth over face.</Rule>
            <Rule>Don&apos;t leave the venue.</Rule>
          </div>
        </div>
      </div>
    </div>
  );
}
const Rule = ({ ok = false, children }: { ok?: boolean; children: React.ReactNode }) => (
  <div className="flex items-start gap-2.5"><div className={`h-5 w-5 shrink-0 rounded-md grid place-items-center mt-0.5 ${ok ? 'bg-success/15 text-success border border-success/30' : 'bg-magenta/15 text-magenta border border-magenta/30'}`}>{ok ? <Icon.Check size={12} /> : <Icon.X size={12} />}</div><div className="text-[12.5px] text-ink/90 leading-snug">{children}</div></div>
);

/* ───────────────────────── Verifying interstitial ───────────────────────── */
function Verifying({ data }: { data: Snapshot }) {
  const r = data.round!;
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 text-center relative">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(60% 50% at 50% 40%, rgba(255,176,32,0.15), transparent 70%)' }} />
      <div className="relative">
        <div className="h-20 w-20 rounded-full border-2 border-warn/40 border-t-warn animate-spin mx-auto" />
        <div className="mt-6 text-[20px] font-extrabold">Host is verifying…</div>
        <div className="mt-1 text-[13px] text-muted">Round {r.idx} hunt is over. The host is confirming who caught <span className="text-magenta font-semibold">{r.target?.nickname}</span>.</div>
        <div className="mt-5 inline-flex"><Pill tone="warn"><Icon.Clock size={11} /> {r.approvedScored} / 5 confirmed</Pill></div>
      </div>
    </div>
  );
}

/* ───────────────────────── 7. Round Result ───────────────────────── */
function RoundResult({ data, onStandings }: { data: Snapshot; onStandings: () => void }) {
  const r = data.round!;
  const res = r.result;
  const ordered = res ? [res.podium[1], res.podium[0], res.podium[2]] : [];
  const heights = [110, 140, 88];
  return (
    <div className="h-full flex flex-col relative">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(60% 40% at 50% 0%, rgba(255,210,74,0.18), transparent 70%)' }} />
      <div className="relative px-5 pt-5 flex items-center justify-between">
        <Pill tone="gold"><Icon.Trophy size={11} /> Round {r.idx} · Results</Pill>
        <Pill tone="muted">{data.event.currentIdx} of {data.event.roundsPlanned} rounds</Pill>
      </div>
      <div className="relative px-5 mt-3">
        <div className="text-[10.5px] uppercase tracking-[0.18em] fh-mono text-muted">{r.target?.nickname} was</div>
        <div className="text-[20px] font-extrabold tracking-tight mt-1 leading-tight">
          {res?.targetSurvived ? `not caught — survived (+5)` : `caught by ${res?.caughtCount} hunter${res?.caughtCount === 1 ? '' : 's'}${res?.caughtAt ? ` in ${res.caughtAt}` : ''}`}
        </div>
      </div>
      <div className="relative px-5 mt-3">
        <div className="flex items-center gap-3 rounded-2xl bg-surface border border-line p-2.5 pr-3">
          <SelfieBubble name={r.target?.nickname || '?'} hue={r.target?.hue} selfie={r.target?.selfie} size={44} frame="magenta" />
          <div className="flex-1 min-w-0"><div className="text-[12.5px] font-bold flex items-center gap-2">{r.target?.nickname} <Pill tone="magenta" size="sm">target</Pill></div><div className="text-[11px] text-muted fh-mono">{res?.targetSurvived ? 'survived the round' : `caught at ${res?.caughtAt ?? '—'}`}</div></div>
          <Pill tone={res?.targetSurvived ? 'success' : 'muted'}>{res?.targetSurvived ? '+5 pts' : '+0 pts'}</Pill>
        </div>
      </div>
      <div className="relative px-5 mt-5 flex-1 fh-scroll">
        {res && res.podium.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 items-end mb-4">
            {ordered.map((p, i) => {
              if (!p) return <div key={`empty-${i}`} />;
              const medal = (['silver', 'gold', 'bronze'] as const)[i];
              const col = { gold: '#FFD24A', silver: '#C9D2DA', bronze: '#E0934A' }[medal];
              return (
                <div key={p.rank} className="flex flex-col items-center fh-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="relative"><SelfieBubble name={p.nickname} hue={p.hue} selfie={p.selfie} size={p.rank === 1 ? 72 : 56} frame={medal} /><div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full grid place-items-center fh-mono text-[10px] font-bold text-void" style={{ background: col, boxShadow: `0 0 12px ${col}80` }}>{p.rank}</div></div>
                  <div className="mt-2 text-[12.5px] font-bold text-center">{p.nickname}</div>
                  <div className="text-[10px] text-muted fh-mono mt-0.5">{p.time}</div>
                  <div className="mt-2 w-full rounded-t-xl border-t border-x relative overflow-hidden" style={{ height: heights[i], background: `linear-gradient(180deg, ${col}33 0%, ${col}08 100%)`, borderColor: `${col}55` }}>
                    <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: col, boxShadow: `0 0 12px ${col}` }} />
                    <div className="absolute inset-x-0 bottom-2 text-center"><div className="fh-mono text-[22px] font-extrabold" style={{ color: col, textShadow: `0 0 18px ${col}88` }}>+{p.points}</div><div className="text-[9px] uppercase tracking-wider text-muted">pts</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <div className="text-center text-[13px] text-muted py-8">No one caught {r.target?.nickname}. They survived! 🏃</div>}
        {res && res.rest.length > 0 && (
          <div className="space-y-1.5 mt-1">
            {res.rest.map((p) => (
              <div key={p.rank} className={`flex items-center gap-3 rounded-xl px-3 h-12 ${p.mine ? 'bg-cyan/[0.06] border border-cyan/40 fh-ring-cyan' : 'bg-surface border border-line'}`}>
                <div className="fh-mono text-[12px] font-bold text-muted w-5 text-right">{String(p.rank).padStart(2, '0')}</div>
                <Avatar name={p.nickname} hue={p.hue} selfie={p.selfie} size={28} />
                <div className="flex-1 min-w-0 flex items-center gap-1.5"><span className="text-[13px] font-semibold">{p.nickname}</span>{p.mine && <Pill tone="cyan" size="sm">You</Pill>}</div>
                <span className="text-[10.5px] text-muted fh-mono">{p.time}</span>
                <span className="text-[14px] font-extrabold fh-mono text-ink">+{p.points}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="relative px-5 pt-3 pb-7 border-t border-line">
        <Button kind="outline" className="w-full" leading={<Icon.Trophy size={16} />} onClick={onStandings}>View standings</Button>
        <div className="text-center text-[11px] text-muted fh-mono mt-2">waiting for host to start next round…</div>
      </div>
    </div>
  );
}

/* ───────────────────────── 8. Standings ───────────────────────── */
function Standings({ data, final = false, onClose }: { data: Snapshot; final?: boolean; onClose?: () => void }) {
  const rows = data.leaderboard;
  const me = rows.find((r) => r.isMe);
  const top = rows[0];
  return (
    <div className="h-full flex flex-col">
      <div className="px-5 pt-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill tone="cyan"><Icon.Trophy size={11} /> Standings</Pill>
          {final ? <Pill tone="gold">Final</Pill> : <Pill tone="magenta"><Icon.Dot size={9} /> Round {data.event.currentIdx} of {data.event.roundsPlanned}</Pill>}
        </div>
        {onClose && <button onClick={onClose} className="fh-press h-8 w-8 grid place-items-center rounded-full bg-surface border border-line text-muted"><Icon.X size={16} /></button>}
      </div>
      <div className="px-5 mt-2"><div className="text-[22px] font-extrabold tracking-tight">{final ? 'Final leaderboard' : 'Overall leaderboard'}</div><div className="text-[12px] text-muted">Points accumulate across rounds.</div></div>
      {me && (
        <div className="px-5 mt-3 grid grid-cols-3 gap-2">
          <Mini label="You" value={`#${me.rank}`} tone="cyan" />
          <Mini label="Your pts" value={String(me.pts)} tone="ink" />
          <Mini label="Lead gap" value={top ? `−${top.pts - me.pts}` : '—'} tone="magenta" />
        </div>
      )}
      <div className="px-5 mt-4 flex-1 fh-scroll">
        <div className="space-y-1.5 pb-6">
          {rows.map((r, i) => {
            const emoji = ['🥇', '🥈', '🥉'][i];
            return (
              <div key={r.id} className={`fh-up flex items-center gap-3 rounded-xl px-3 h-14 ${r.isMe ? 'bg-cyan/[0.06] border border-cyan/40 fh-ring-cyan' : 'bg-surface border border-line'}`} style={{ animationDelay: `${i * 40}ms` }}>
                <div className="w-7 text-center">{r.medal ? <span className="text-[18px]">{emoji}</span> : <span className="fh-mono text-[13px] font-bold text-muted">{String(r.rank).padStart(2, '0')}</span>}</div>
                <Avatar name={r.nickname} hue={r.hue} selfie={r.selfie} size={36} medal={r.medal} />
                <div className="flex-1 min-w-0"><div className="text-[13px] font-semibold truncate flex items-center gap-1.5">{r.nickname}{r.isMe && <Pill tone="cyan" size="sm">You</Pill>}</div><div className="text-[10.5px] text-muted">{r.wins} round win{r.wins === 1 ? '' : 's'}</div></div>
                <div className="fh-mono text-[20px] font-extrabold text-ink"><DigitRoll value={r.pts} /></div>
              </div>
            );
          })}
          {rows.length === 0 && <div className="text-center text-muted text-[13px] py-8">No scores yet.</div>}
        </div>
      </div>
    </div>
  );
}
const Mini = ({ label, value, tone }: { label: string; value: string; tone: 'ink' | 'cyan' | 'magenta' }) => {
  const c = { ink: 'text-ink', cyan: 'text-cyan', magenta: 'text-magenta' }[tone];
  return <div className="rounded-xl bg-surface border border-line p-2.5"><div className="text-[9.5px] uppercase fh-mono tracking-[0.16em] text-muted">{label}</div><div className={`fh-mono text-[20px] font-extrabold leading-none mt-0.5 ${c}`}>{value}</div></div>;
};
