'use client';
import React, { useEffect, useState } from 'react';
import { Icon, Wordmark, Pill, Avatar, SelfieBubble, DigitRoll, useLiveState, useCountdownTo } from '@/components/ui';
import { Snapshot, livePhase } from '@/lib/client-types';

// Venue / big-screen display. Read-only, no auth — follows the host live over SSE.
export default function Projector() {
  const { data, offset } = useLiveState<Snapshot>('/api/state');
  const [host, setHost] = useState('');
  useEffect(() => { setHost(window.location.host); }, []);

  if (!data) return <Stage><div className="text-muted fh-mono text-2xl">Connecting…</div></Stage>;

  const ev = data.event;
  const phase = livePhase(data.round, offset);

  return (
    <Stage>
      <Header data={data} phase={phase} />
      <div className="flex-1 min-h-0 flex items-stretch">
        {ev.status === 'lobby' && <LobbyView data={data} host={host} />}
        {ev.status === 'finished' && <FinalView data={data} />}
        {ev.status === 'running' && data.round && (
          phase === 'reveal' ? <RevealView data={data} offset={offset} />
            : phase === 'result' ? <ResultView data={data} />
            : phase === 'verify' ? <VerifyView data={data} />
            : <HuntView data={data} offset={offset} />
        )}
      </div>
    </Stage>
  );
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative z-10 w-screen h-[100dvh] overflow-hidden flex flex-col fh-grain p-[2vmin]">
      {children}
    </main>
  );
}

function Header({ data, phase }: { data: Snapshot; phase: string }) {
  const ev = data.event;
  return (
    <div className="flex items-center justify-between px-[2vmin] pb-[1.5vmin]">
      <div className="flex items-center gap-[1.5vmin]">
        <div className="h-[5vmin] w-[5vmin] rounded-xl grid place-items-center" style={{ background: 'conic-gradient(from 220deg, #00F0FF 0%, #7C3AED 50%, #FF006E 100%)' }}>
          <div className="h-[4vmin] w-[4vmin] rounded-lg bg-void grid place-items-center"><Icon.Target size={20} /></div>
        </div>
        <Wordmark size={36} />
        <span className="text-[1.6vmin] uppercase tracking-[0.3em] fh-mono text-muted ml-2">{ev.name}</span>
      </div>
      <div className="flex items-center gap-[1.2vmin]">
        {ev.status === 'running' && data.round && <Pill tone="magenta" size="lg">Round {data.round.idx} / {ev.roundsPlanned} · {phase}</Pill>}
        {ev.status === 'lobby' && <Pill tone="purple" size="lg">Lobby</Pill>}
        {ev.status === 'finished' && <Pill tone="gold" size="lg">Final</Pill>}
        <Pill tone="cyan" size="lg"><span className="fh-live h-2 w-2 rounded-full bg-cyan inline-block mr-1" /> Live</Pill>
      </div>
    </div>
  );
}

/* ───────── Lobby ───────── */
function LobbyView({ data, host }: { data: Snapshot; host: string }) {
  return (
    <div className="flex-1 grid grid-cols-[1.1fr_1fr] gap-[2vmin] px-[2vmin]">
      <div className="flex flex-col justify-center">
        <div className="text-[2vmin] uppercase tracking-[0.3em] fh-mono text-cyan">Waiting room</div>
        <div className="text-[7vmin] font-black leading-none mt-2">The hunt is on.</div>
        <div className="text-[2.2vmin] text-muted mt-3 fh-mono">ล่าเป้า · หลบหนี · เอาตัวรอด</div>
        <div className="mt-[3vmin] flex items-end gap-3">
          <span className="fh-mono text-[12vmin] font-black leading-none text-cyan tabular-nums" style={{ textShadow: '0 0 40px rgba(0,240,255,0.4)' }}>{data.lobby.count}</span>
          <span className="text-[2.6vmin] text-muted mb-[2vmin]">hunters joined</span>
        </div>
        <div className="mt-[2vmin] flex gap-[1.5vmin]">
          <Stat label="Rounds" value={String(data.event.roundsPlanned)} />
          <Stat label="Per round" value={`${data.event.roundSeconds}s`} />
          <Stat label="Score" value="10·6·4·2·1" />
        </div>
        <div className="mt-[3vmin] rounded-2xl border border-cyan/30 bg-cyan/[0.06] px-[2vmin] py-[1.6vmin] inline-flex items-center gap-3 w-fit">
          <Icon.Target size={22} className="text-cyan" />
          <div><div className="text-[1.6vmin] uppercase tracking-[0.2em] fh-mono text-muted">Join now</div><div className="text-[2.6vmin] font-bold">{host || 'open the FaceHunt link'}</div></div>
        </div>
      </div>
      <div className="self-center">
        <div className="grid grid-cols-6 gap-[1.4vmin]">
          {data.lobby.players.slice(0, 36).map((p, i) => (
            <div key={i} className="fh-up flex flex-col items-center gap-1" style={{ animationDelay: `${i * 25}ms` }}>
              <Avatar name={p.nickname} hue={p.hue} selfie={p.selfie} size={48} />
              <div className="text-[1.4vmin] text-muted truncate max-w-[8vmin] text-center">{p.nickname}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-surface border border-line px-[2vmin] py-[1.2vmin]"><div className="text-[1.4vmin] uppercase fh-mono tracking-[0.16em] text-muted">{label}</div><div className="fh-mono text-[3vmin] font-extrabold text-ink leading-none mt-1">{value}</div></div>
);

/* ───────── Reveal ───────── */
function RevealView({ data, offset }: { data: Snapshot; offset: number }) {
  const t = data.round!.target;
  const { sec } = useCountdownTo(data.round!.revealUntil, offset);
  return (
    <div className="flex-1 relative flex flex-col items-center justify-center">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(60% 60% at 50% 45%, rgba(255,0,110,0.30), transparent 70%)' }} />
      <div className="relative text-[2.4vmin] uppercase tracking-[0.4em] fh-mono text-magenta">Tonight&apos;s target</div>
      <div className="relative mt-[3vmin]"><SelfieBubble name={t?.nickname || '?'} hue={t?.hue} selfie={t?.selfie} size={Math.min(360, 38 * 8)} frame="magenta" pulse /></div>
      <div className="relative text-[10vmin] font-black leading-none mt-[3vmin]" style={{ background: 'linear-gradient(180deg, #FFFFFF, #FF006E)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', textShadow: '0 0 60px rgba(255,0,110,0.4)' }}>{t?.nickname}</div>
      <div className="relative text-[2.4vmin] text-muted mt-[2vmin]">Hunt begins in {sec}s — photograph their face!</div>
    </div>
  );
}

/* ───────── Hunt ───────── */
function HuntView({ data, offset }: { data: Snapshot; offset: number }) {
  const r = data.round!;
  const t = r.target;
  const { sec, mm, ss } = useCountdownTo(r.huntEndsAt, offset);
  const danger = sec <= 15;
  const caught = r.ticker.filter((s) => s.status === 'approved').sort((a, b) => (a.rank ?? 9) - (b.rank ?? 9));
  return (
    <div className="flex-1 grid grid-cols-[1fr_1.3fr] gap-[2vmin] px-[2vmin] items-stretch">
      <div className="rounded-3xl bg-magenta/[0.06] border border-magenta/40 flex flex-col items-center justify-center gap-[2vmin] p-[2vmin]">
        <div className="text-[2vmin] uppercase tracking-[0.3em] fh-mono text-magenta">Target</div>
        <SelfieBubble name={t?.nickname || '?'} hue={t?.hue} selfie={t?.selfie} size={Math.min(280, 30 * 8)} frame="magenta" pulse />
        <div className="text-[6vmin] font-black leading-none">{t?.nickname}</div>
      </div>
      <div className="flex flex-col items-center justify-center">
        <div className="text-[2vmin] uppercase tracking-[0.3em] fh-mono text-muted">Time left</div>
        <div className={`fh-mono font-black leading-none tabular-nums ${danger ? 'text-magenta' : 'text-cyan'}`} style={{ fontSize: '26vmin', textShadow: danger ? '0 0 60px rgba(255,0,110,0.5)' : '0 0 60px rgba(0,240,255,0.4)' }}>
          {mm}:{ss}
        </div>
        <div className="mt-[2vmin] flex items-center gap-[1.5vmin]">
          <Pill tone="success" size="lg">Caught {r.approvedScored} / 5</Pill>
          <Pill tone="cyan" size="lg"><Icon.Users size={14} /> {r.submissionCount} shots</Pill>
        </div>
        <div className="mt-[2vmin] flex flex-wrap gap-2 justify-center min-h-[5vmin]">
          {caught.map((c, i) => (
            <div key={i} className="inline-flex items-center gap-2 rounded-full bg-surface border border-success/40 h-[4.5vmin] pl-1 pr-3">
              <Avatar name={c.nickname} hue={c.hue} size={30} />
              <span className="text-[1.8vmin] font-semibold">{c.nickname}</span>
              <Pill tone="success" size="sm">#{c.rank} +{c.points}</Pill>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────── Verify ───────── */
function VerifyView({ data }: { data: Snapshot }) {
  const r = data.round!;
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-[2vmin]">
      <div className="h-[14vmin] w-[14vmin] rounded-full border-4 border-warn/40 border-t-warn animate-spin" />
      <div className="text-[5vmin] font-black">Host is verifying…</div>
      <div className="text-[2.4vmin] text-muted">Confirming who caught <span className="text-magenta font-bold">{r.target?.nickname}</span></div>
      <Pill tone="warn" size="lg"><Icon.Clock size={16} /> {r.approvedScored} / 5 confirmed</Pill>
    </div>
  );
}

/* ───────── Result ───────── */
function ResultView({ data }: { data: Snapshot }) {
  const r = data.round!;
  const res = r.result;
  const ordered = res ? [res.podium[1], res.podium[0], res.podium[2]] : [];
  const heights = ['22vmin', '30vmin', '17vmin'];
  return (
    <div className="flex-1 flex flex-col px-[3vmin]">
      <div className="text-center">
        <div className="text-[2vmin] uppercase tracking-[0.3em] fh-mono text-gold">Round {r.idx} results</div>
        <div className="text-[5vmin] font-black leading-tight mt-1">
          {res?.targetSurvived ? `${r.target?.nickname} survived (+5)` : `${r.target?.nickname} caught by ${res?.caughtCount} in ${res?.caughtAt ?? ''}`}
        </div>
      </div>
      <div className="flex-1 flex items-end justify-center gap-[3vmin] pb-[3vmin]">
        {res && res.podium.length > 0 ? ordered.map((p, i) => {
          if (!p) return <div key={`e-${i}`} className="w-[18vmin]" />;
          const medal = (['silver', 'gold', 'bronze'] as const)[i];
          const col = { gold: '#FFD24A', silver: '#C9D2DA', bronze: '#E0934A' }[medal];
          return (
            <div key={p.rank} className="flex flex-col items-center fh-up" style={{ animationDelay: `${i * 120}ms` }}>
              <div className="relative"><SelfieBubble name={p.nickname} hue={p.hue} selfie={p.selfie} size={p.rank === 1 ? 130 : 100} frame={medal} /><div className="absolute -bottom-2 -right-2 h-[4vmin] w-[4vmin] rounded-full grid place-items-center fh-mono text-[2vmin] font-bold text-void" style={{ background: col }}>{p.rank}</div></div>
              <div className="mt-[1.5vmin] text-[3vmin] font-black">{p.nickname}</div>
              <div className="text-[1.6vmin] text-muted fh-mono">{p.time}</div>
              <div className="mt-[1.5vmin] w-[18vmin] rounded-t-2xl border-t-2 border-x relative" style={{ height: heights[i], background: `linear-gradient(180deg, ${col}33, ${col}08)`, borderColor: `${col}66` }}>
                <div className="absolute inset-x-0 bottom-[2vmin] text-center"><div className="fh-mono text-[5vmin] font-black" style={{ color: col, textShadow: `0 0 30px ${col}` }}>+{p.points}</div></div>
              </div>
            </div>
          );
        }) : <div className="text-[3vmin] text-muted">No one caught {r.target?.nickname} — they survived! 🏃</div>}
      </div>
    </div>
  );
}

/* ───────── Final ───────── */
function FinalView({ data }: { data: Snapshot }) {
  const rows = data.leaderboard.slice(0, 10);
  return (
    <div className="flex-1 grid grid-cols-2 gap-[3vmin] px-[3vmin] py-[1vmin]">
      <div className="flex flex-col justify-center">
        <div className="text-[2vmin] uppercase tracking-[0.3em] fh-mono text-gold">Final standings</div>
        <div className="text-[8vmin] font-black leading-none mt-2 flex items-center gap-3"><Icon.Trophy size={64} className="text-gold" /> Winner</div>
        {rows[0] && (
          <div className="mt-[2vmin] flex items-center gap-[2vmin]">
            <SelfieBubble name={rows[0].nickname} hue={rows[0].hue} selfie={rows[0].selfie} size={140} frame="gold" />
            <div><div className="text-[6vmin] font-black leading-none">{rows[0].nickname}</div><div className="text-[3vmin] fh-mono text-gold mt-2">{rows[0].pts} pts · {rows[0].wins} wins</div></div>
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center gap-[1vmin] overflow-hidden">
        {rows.map((row, i) => (
          <div key={row.id} className="flex items-center gap-[1.5vmin] rounded-xl bg-surface/70 border border-line px-[1.5vmin] h-[6vmin]">
            <div className="w-[4vmin] text-center text-[2.4vmin]">{row.medal ? ['🥇', '🥈', '🥉'][i] : <span className="fh-mono font-bold text-muted">{String(row.rank).padStart(2, '0')}</span>}</div>
            <Avatar name={row.nickname} hue={row.hue} selfie={row.selfie} size={40} medal={row.medal} />
            <div className="flex-1 min-w-0"><div className="text-[2.4vmin] font-bold truncate">{row.nickname}</div></div>
            <div className="fh-mono text-[3vmin] font-black"><DigitRoll value={row.pts} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
