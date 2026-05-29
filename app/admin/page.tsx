'use client';
import React, { useEffect, useState } from 'react';
import { Icon, Pill, Button, Avatar, SelfieBubble, DigitRoll, useLiveState, useCountdownTo } from '@/components/ui';
import { AdminSnapshot, livePhase } from '@/lib/client-types';

async function post(url: string, body?: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
  return { ok: res.ok, json: await res.json().catch(() => ({})) };
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => { fetch('/api/admin/login').then((r) => r.json()).then((j) => setAuthed(!!j.admin)).catch(() => setAuthed(false)); }, []);

  if (authed === null) return <Frame><div className="text-muted fh-mono text-sm p-10 text-center">Loading…</div></Frame>;
  if (!authed) return <Frame><AdminLogin onAuthed={() => setAuthed(true)} /></Frame>;
  return <Frame><Console /></Frame>;
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative z-10 min-h-[100dvh] flex justify-center px-3 sm:px-6 py-6">
      <div className="w-full max-w-[760px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: 'conic-gradient(from 220deg, #00F0FF 0%, #7C3AED 50%, #FF006E 100%)' }}>
            <div className="h-[26px] w-[26px] rounded-md bg-void grid place-items-center"><Icon.Settings size={14} /></div>
          </div>
          <div className="flex items-baseline gap-2"><span className="font-extrabold tracking-tight text-[15px]">FaceHunt</span><span className="text-[10.5px] uppercase tracking-[0.2em] fh-mono text-muted">Host Console</span></div>
        </div>
        {children}
      </div>
    </main>
  );
}

function AdminLogin({ onAuthed }: { onAuthed: () => void }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const go = async () => {
    const { ok, json } = await post('/api/admin/login', { code });
    if (!ok) setErr(json.error || 'wrong code'); else onAuthed();
  };
  return (
    <div className="rounded-2xl bg-surface border border-line p-5 max-w-[360px] mx-auto mt-10">
      <div className="text-[18px] font-extrabold mb-1">Host sign-in</div>
      <div className="text-[12px] text-muted mb-4">Enter the admin passcode to run the hunt.</div>
      <input value={code} onChange={(e) => setCode(e.target.value)} type="password" placeholder="Admin code" onKeyDown={(e) => e.key === 'Enter' && go()}
        className="w-full h-12 px-3.5 rounded-xl bg-void border border-line outline-none focus:border-cyan/50 text-[15px] fh-mono text-ink placeholder-dim mb-3" />
      {err && <div className="text-[12px] text-magenta mb-2">{err}</div>}
      <Button kind="primary" className="w-full" onClick={go}>Unlock console</Button>
    </div>
  );
}

function Console() {
  const { data, offset, refetch } = useLiveState<AdminSnapshot>('/api/admin/state');
  if (!data) return <div className="text-muted fh-mono text-sm p-10 text-center">Loading…</div>;

  const ev = data.event;
  const r = data.round;
  const phase = livePhase(r, offset);
  const liveRound = ev.status === 'running' && r && phase !== 'closed';
  const huntOver = !r || phase === 'verify' || phase === 'result';
  const canStart = ev.status === 'lobby' || (ev.status === 'running' && phase === 'result');
  const isLast = (r?.idx ?? 0) >= ev.roundsPlanned;

  const round = (action: string) => async () => { await post('/api/admin/round', { action }); refetch(); };
  const verify = (subId: string, action: string) => async () => { await post('/api/admin/verify', { subId, action }); refetch(); };

  return (
    <div className="space-y-4">
      {/* status row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Pill tone="purple"><Icon.Settings size={11} /> {ev.name}</Pill>
        <Pill tone={ev.status === 'running' ? 'cyan' : ev.status === 'finished' ? 'gold' : 'muted'}><Icon.Dot size={9} /> {ev.status}</Pill>
        {r && <Pill tone="magenta">Round {r.idx} / {ev.roundsPlanned} · {phase}</Pill>}
        <span className="ml-auto" />
        <Pill tone="cyan"><Icon.Users size={11} /> {data.lobby.count} joined</Pill>
      </div>

      {/* lobby config */}
      {ev.status === 'lobby' && <EventConfig ev={ev} onSaved={refetch} />}

      {/* target ref + timer + controls */}
      {r && (
        <div className="rounded-2xl bg-magenta/[0.06] border border-magenta/40 p-3 flex items-center gap-3">
          <SelfieBubble name={r.target?.nickname || '?'} hue={r.target?.hue} selfie={r.target?.selfie} size={52} frame="magenta" />
          <div className="flex-1 min-w-0"><div className="text-[9.5px] uppercase fh-mono tracking-[0.18em] text-magenta">TARGET</div><div className="text-[16px] font-bold">{r.target?.nickname}</div></div>
          {!huntOver && <RoundTimer huntEndsAt={r.huntEndsAt} offset={offset} />}
          {huntOver && <Pill tone="warn"><Icon.Clock size={11} /> hunt ended</Pill>}
        </div>
      )}

      {/* control buttons */}
      <div className="flex gap-2 flex-wrap">
        {canStart && <Button kind="primary" leading={<Icon.Play size={16} />} onClick={round('start')}>{ev.status === 'lobby' ? 'Start round 1' : 'Start next round'}</Button>}
        {liveRound && !huntOver && <Button kind="danger" leading={<Icon.Stop size={14} />} onClick={round('end')}>End hunt</Button>}
        {liveRound && phase === 'verify' && <Button kind="success" leading={<Icon.Trophy size={16} />} onClick={round('reveal')}>Reveal result</Button>}
        {liveRound && phase === 'result' && <Button kind="primary" trailing={<Icon.ChevronRight size={16} />} onClick={round('next')}>{isLast ? 'Finish event' : 'Next round'}</Button>}
        <Button kind="secondary" leading={<Icon.Projector size={16} />} onClick={() => window.open('/projector', '_blank')}>Projector</Button>
        <span className="ml-auto" />
        <Button kind="ghost" className="!border !border-line" leading={<Icon.Refresh size={14} />} onClick={async () => { if (confirm('Reset the whole event (clears rounds, submissions, scores)?')) { await post('/api/admin/event', { action: 'reset' }); refetch(); } }}>Reset event</Button>
      </div>

      {/* progress */}
      {r && (
        <div>
          <div className="flex items-end justify-between"><div className="text-[10.5px] uppercase fh-mono tracking-[0.18em] text-muted">Approved</div><div className="text-[12px] fh-mono whitespace-nowrap">{r.approvedScored} / 5 approved</div></div>
          <div className="mt-1.5 h-1.5 bg-line rounded-full overflow-hidden"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(r.approvedScored / 5) * 100}%`, background: 'linear-gradient(90deg, #00F0FF, #00F5A0)' }} /></div>
        </div>
      )}

      {/* verify queue */}
      {r ? (
        <div className="grid sm:grid-cols-2 gap-2.5">
          {data.queue.length === 0 && <div className="text-[13px] text-muted fh-mono col-span-full py-6 text-center">No submissions yet — hunters are shooting…</div>}
          {data.queue.map((s) => {
            const border = { pending: 'border-line', approved: 'border-success/60', rejected: 'border-magenta/60', skipped: 'border-warn/40' }[s.status] || 'border-line';
            const boxColor = { pending: '#00F0FF', approved: '#00F5A0', rejected: '#FF006E', skipped: '#FFB020' }[s.status] || '#00F0FF';
            const capped = r.approvedScored >= 5 && s.status !== 'approved';
            return (
              <div key={s.id} className={`rounded-2xl bg-surface border ${border} overflow-hidden flex`}>
                <div className="relative w-[110px] shrink-0 bg-black">
                  <img src={s.photo} alt={s.hunter} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-[10px] rounded border-[1.5px]" style={{ borderColor: boxColor, boxShadow: `0 0 10px ${boxColor}55` }} />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2 py-1 bg-gradient-to-t from-black/85 to-transparent">
                    <span className="fh-mono text-[9.5px] text-muted">#{s.id.slice(0, 4)}</span>
                    {s.status === 'approved' && <span className="fh-mono text-[9.5px] font-bold text-success">#{s.rank}</span>}
                  </div>
                </div>
                <div className="flex-1 min-w-0 p-3 flex flex-col">
                  <div className="flex items-center gap-2 min-w-0"><Avatar name={s.hunter} hue={s.hue} size={26} /><div className="min-w-0"><div className="text-[13px] font-bold truncate">{s.hunter}</div><div className="text-[10.5px] text-muted fh-mono">{new Date(s.receivedAt).toLocaleTimeString()}</div></div></div>
                  <div className="mt-auto pt-2">
                    {s.status === 'pending' && (
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
                        <button onClick={verify(s.id, 'match')} disabled={capped} className={`fh-press h-9 rounded-lg bg-success/15 text-success border border-success/40 text-[12px] font-bold inline-flex items-center justify-center gap-1 ${capped ? 'opacity-40 pointer-events-none' : ''}`}><Icon.Check size={14} /> Match</button>
                        <button onClick={verify(s.id, 'not')} className="fh-press h-9 rounded-lg bg-magenta/15 text-magenta border border-magenta/40 text-[12px] font-bold inline-flex items-center justify-center gap-1"><Icon.X size={14} /> Not</button>
                        <button onClick={verify(s.id, 'skip')} className="fh-press h-9 px-2.5 rounded-lg text-muted hover:text-ink text-[11px] font-semibold">Skip</button>
                      </div>
                    )}
                    {s.status === 'approved' && <div className="flex items-center justify-between gap-2"><Pill tone="success" size="sm"><Icon.Check size={10} /> {s.points != null ? `#${s.rank} · +${s.points}` : 'approved'}</Pill><button onClick={verify(s.id, 'undo')} className="fh-press text-[10.5px] text-muted hover:text-ink underline-offset-2 hover:underline">undo</button></div>}
                    {s.status === 'rejected' && <div className="flex items-center justify-between gap-2"><Pill tone="magenta" size="sm"><Icon.X size={10} /> Rejected</Pill><button onClick={verify(s.id, 'undo')} className="fh-press text-[10.5px] text-muted hover:text-ink underline-offset-2 hover:underline">undo</button></div>}
                    {s.status === 'skipped' && <div className="flex items-center justify-between gap-2"><Pill tone="warn" size="sm">Skipped</Pill><button onClick={verify(s.id, 'undo')} className="fh-press text-[10.5px] text-muted hover:text-ink underline-offset-2 hover:underline">restore</button></div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl bg-surface border border-line p-4 text-[13px] text-muted">
          {ev.status === 'finished' ? 'Event finished — final standings below.' : 'No live round. Press “Start round 1” when everyone has joined.'}
        </div>
      )}

      {/* standings (projector-friendly) */}
      <div className="rounded-2xl bg-void border border-line p-4">
        <div className="flex items-center justify-between mb-3"><div className="text-[11px] uppercase fh-mono tracking-[0.18em] text-muted flex items-center gap-1.5"><Icon.Projector size={12} /> Standings</div><Pill tone="cyan"><Icon.Trophy size={11} /> {ev.status === 'finished' ? 'final' : 'live'}</Pill></div>
        <div className="space-y-1.5">
          {data.leaderboard.slice(0, 10).map((row, i) => (
            <div key={row.id} className="flex items-center gap-3 rounded-lg bg-surface/60 border border-line px-3 h-11">
              <div className="w-6 text-center">{row.medal ? <span className="text-[16px]">{['🥇', '🥈', '🥉'][i]}</span> : <span className="fh-mono text-[12px] font-bold text-muted">{String(row.rank).padStart(2, '0')}</span>}</div>
              <Avatar name={row.nickname} hue={row.hue} selfie={row.selfie} size={28} medal={row.medal} />
              <div className="flex-1 min-w-0"><div className="text-[13px] font-semibold truncate">{row.nickname}</div><div className="text-[10px] text-muted">{row.wins} win{row.wins === 1 ? '' : 's'}</div></div>
              <div className="fh-mono text-[18px] font-extrabold text-ink"><DigitRoll value={row.pts} /></div>
            </div>
          ))}
          {data.leaderboard.length === 0 && <div className="text-[12px] text-muted fh-mono py-4 text-center">No players yet.</div>}
        </div>
      </div>
    </div>
  );
}

function EventConfig({ ev, onSaved }: { ev: AdminSnapshot['event']; onSaved: () => void }) {
  const [name, setName] = useState(ev.name);
  const [rounds, setRounds] = useState(ev.roundsPlanned);
  const [seconds, setSeconds] = useState(ev.roundSeconds);
  const save = async () => { await post('/api/admin/event', { action: 'config', name, rounds, seconds }); onSaved(); };
  return (
    <div className="rounded-2xl bg-surface border border-line p-4">
      <div className="text-[12px] uppercase fh-mono tracking-[0.18em] text-muted mb-3">Event config</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-end">
        <label className="col-span-2 text-[11px] text-muted">Name<input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-void border border-line outline-none focus:border-cyan/50 text-[14px] text-ink" /></label>
        <label className="text-[11px] text-muted">Rounds<input type="number" min={1} max={12} value={rounds} onChange={(e) => setRounds(+e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-void border border-line outline-none focus:border-cyan/50 text-[14px] fh-mono text-ink" /></label>
        <label className="text-[11px] text-muted">Seconds/round<input type="number" min={15} max={300} value={seconds} onChange={(e) => setSeconds(+e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-void border border-line outline-none focus:border-cyan/50 text-[14px] fh-mono text-ink" /></label>
      </div>
      <div className="mt-3"><Button kind="secondary" size="sm" onClick={save}>Save config</Button></div>
    </div>
  );
}

function RoundTimer({ huntEndsAt, offset }: { huntEndsAt: number; offset: number }) {
  const { sec, mm, ss } = useCountdownTo(huntEndsAt, offset);
  const danger = sec <= 15;
  return (
    <div className="text-right"><div className="text-[9px] uppercase fh-mono tracking-[0.18em] text-muted">Round ends</div><div className={`fh-mono text-[22px] font-bold leading-none ${danger ? 'text-magenta' : 'text-cyan'}`} style={{ textShadow: danger ? '0 0 12px rgba(255,0,110,0.5)' : '0 0 12px rgba(0,240,255,0.4)' }}><DigitRoll value={parseInt(mm)} pad={2} />:<DigitRoll value={parseInt(ss)} pad={2} /></div></div>
  );
}
