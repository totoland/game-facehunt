import crypto from 'node:crypto';
import { db } from './db';
import { publish } from './bus';
import { saveDataUrl } from './photos';
import {
  EventRow, RoundRow, SubmissionRow, User, RoundPhase,
  POINTS, MAX_RANKS, HUNT_GRACE_MS,
} from './types';

const now = () => Date.now();
const uid = () => crypto.randomUUID();
const selfieUrl = (p: string | null) => (p ? `/api/photo/${p}` : null);
// Photo priority: a selfie they took > their Google profile photo > null (→ drawn bubble).
const photoOf = (u: { selfie_path: string | null; photo_url: string | null } | null | undefined) =>
  (u ? (u.selfie_path ? selfieUrl(u.selfie_path) : u.photo_url || null) : null);

/* ─────────────────────────── Users ─────────────────────────── */
// Guest joins were removed — the only way in is Google SSO via findOrCreateUserByEmail.

export function getUser(id: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id=?').get(id) as User | undefined;
}

/** Google SSO: reuse the existing player for this email, or create one. */
export function findOrCreateUserByEmail(email: string, name?: string, picture?: string | null): { user: User; created: boolean } {
  const existing = db.prepare('SELECT * FROM users WHERE email=?').get(email) as User | undefined;
  if (existing) {
    // Backfill / refresh the Google photo so it's available as a fallback.
    if (picture && existing.photo_url !== picture) {
      db.prepare('UPDATE users SET photo_url=? WHERE id=?').run(picture, existing.id);
      existing.photo_url = picture;
      publish('lobby');
    }
    return { user: existing, created: false };
  }
  const nick = (name || email.split('@')[0] || 'Hunter').trim().slice(0, 16) || 'Hunter';
  const u: User = { id: uid(), email, name: nick, nickname: nick, selfie_path: null, photo_url: picture || null, hue: Math.floor(Math.random() * 360), created_at: now() };
  db.prepare(
    `INSERT INTO users (id,email,name,nickname,selfie_path,photo_url,hue,created_at)
     VALUES (@id,@email,@name,@nickname,@selfie_path,@photo_url,@hue,@created_at)`
  ).run(u);
  publish('lobby');
  return { user: u, created: true };
}

export function allUsers(): User[] {
  return db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as User[];
}

// Nickname is locked after login — only the selfie can be updated here.
export function updateProfile(id: string, selfieDataUrl?: string) {
  const u = getUser(id);
  if (!u) throw new Error('no user');
  if (!selfieDataUrl) return; // nothing to do
  const selfie = saveDataUrl(selfieDataUrl, 'selfies', id);
  db.prepare('UPDATE users SET selfie_path=? WHERE id=?').run(selfie, id);
  publish('lobby');
}

export function publicUser(u: User | undefined | null) {
  if (!u) return null;
  const photo = photoOf(u);
  return { id: u.id, nickname: u.nickname, hue: u.hue, selfie: photo, hasSelfie: !!photo };
}

/* ─────────────────────────── Event ─────────────────────────── */

export function ensureEvent(): EventRow {
  let ev = db.prepare('SELECT * FROM events ORDER BY created_at DESC LIMIT 1').get() as EventRow | undefined;
  if (!ev) {
    ev = {
      id: uid(),
      name: '2C2P Year-End',
      status: 'lobby',
      current_round_id: null,
      rounds_planned: 4,
      round_seconds: 60,
      reveal_seconds: 3,
      created_at: now(),
    };
    db.prepare(
      `INSERT INTO events (id,name,status,current_round_id,rounds_planned,round_seconds,reveal_seconds,created_at)
       VALUES (@id,@name,@status,@current_round_id,@rounds_planned,@round_seconds,@reveal_seconds,@created_at)`
    ).run(ev);
  }
  return ev;
}

export function configureEvent(opts: { name?: string; rounds?: number; seconds?: number }) {
  const ev = ensureEvent();
  if (ev.status !== 'lobby') throw new Error('can only configure in lobby');
  db.prepare('UPDATE events SET name=?, rounds_planned=?, round_seconds=? WHERE id=?').run(
    opts.name ?? ev.name,
    Math.max(1, Math.min(12, opts.rounds ?? ev.rounds_planned)),
    Math.max(15, Math.min(300, opts.seconds ?? ev.round_seconds)),
    ev.id
  );
  publish('event');
}

/**
 * Wipe rounds/submissions/scores AND kick all players out of the lobby.
 * Everyone with the app open will be sent back to the splash screen and must
 * sign in / enter the code again — so the lobby only contains people who are
 * actually still present (no ghosts in the random target pool).
 */
export function resetEvent() {
  const ev = ensureEvent();
  db.prepare('DELETE FROM scores WHERE event_id=?').run(ev.id);
  db.prepare('DELETE FROM submissions WHERE round_id IN (SELECT id FROM rounds WHERE event_id=?)').run(ev.id);
  db.prepare('DELETE FROM rounds WHERE event_id=?').run(ev.id);
  db.prepare('DELETE FROM users').run();
  db.prepare('UPDATE events SET status=?, current_round_id=NULL WHERE id=?').run('lobby', ev.id);
  publish('event');
  publish('lobby');
}

/* ─────────────────────────── Rounds ─────────────────────────── */

export function currentRound(ev: EventRow): RoundRow | null {
  if (!ev.current_round_id) return null;
  return (db.prepare('SELECT * FROM rounds WHERE id=?').get(ev.current_round_id) as RoundRow) ?? null;
}

export function phaseOf(r: RoundRow | null, t = now()): RoundPhase {
  if (!r) return 'closed';
  if (r.closed_at) return 'closed';
  if (r.result_revealed_at) return 'result';
  if (t >= r.hunt_ends_at) return 'verify';
  if (t >= r.reveal_until) return 'hunt';
  return 'reveal';
}

function pickTarget(ev: EventRow): User {
  const players = allUsers();
  if (players.length === 0) throw new Error('no players joined');
  const past = (db.prepare('SELECT target_user_id FROM rounds WHERE event_id=? ORDER BY idx').all(ev.id) as { target_user_id: string }[])
    .map((r) => r.target_user_id);
  const lastTarget = past[past.length - 1];
  // Prefer players who haven't been target yet this event.
  let pool = players.filter((p) => !past.includes(p.id));
  if (pool.length === 0) {
    // Everyone has been target → reshuffle, but never repeat the most recent
    // target back-to-back (matters a lot with small groups).
    pool = players.filter((p) => p.id !== lastTarget);
    if (pool.length === 0) pool = players; // only one player exists
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export function startRound(): RoundRow {
  const ev = ensureEvent();
  const prev = currentRound(ev);
  const idx = prev && !prev.closed_at ? prev.idx : (db.prepare('SELECT COALESCE(MAX(idx),0) m FROM rounds WHERE event_id=?').get(ev.id) as { m: number }).m + 1;
  // if a live round exists, refuse (admin should End/Next first)
  if (prev && !prev.closed_at) throw new Error('round already running');

  const target = pickTarget(ev);
  const t = now();
  const r: RoundRow = {
    id: uid(),
    event_id: ev.id,
    idx,
    target_user_id: target.id,
    started_at: t,
    reveal_until: t + ev.reveal_seconds * 1000,
    hunt_ends_at: t + (ev.reveal_seconds + ev.round_seconds) * 1000,
    result_revealed_at: null,
    closed_at: null,
  };
  db.prepare(
    `INSERT INTO rounds (id,event_id,idx,target_user_id,started_at,reveal_until,hunt_ends_at,result_revealed_at,closed_at)
     VALUES (@id,@event_id,@idx,@target_user_id,@started_at,@reveal_until,@hunt_ends_at,NULL,NULL)`
  ).run(r);
  db.prepare('UPDATE events SET status=?, current_round_id=? WHERE id=?').run('running', r.id, ev.id);
  publish('round', { phase: 'reveal', idx });
  return r;
}

/** Jump straight to verify (admin "End round" before timer). */
export function endHunt() {
  const ev = ensureEvent();
  const r = currentRound(ev);
  if (!r || r.closed_at) throw new Error('no live round');
  if (now() < r.hunt_ends_at) db.prepare('UPDATE rounds SET hunt_ends_at=? WHERE id=?').run(now(), r.id);
  publish('round', { phase: 'verify' });
}

export function revealResult() {
  const ev = ensureEvent();
  const r = currentRound(ev);
  if (!r || r.closed_at) throw new Error('no live round');
  if (!r.result_revealed_at) {
    // target survives if no submission was approved (caught)
    const caught = db.prepare("SELECT COUNT(*) c FROM submissions WHERE round_id=? AND status='approved'").get(r.id) as { c: number };
    if (caught.c === 0) {
      db.prepare('INSERT INTO scores (event_id,user_id,round_id,points,reason) VALUES (?,?,?,?,?)')
        .run(ev.id, r.target_user_id, r.id, 5, 'target_survive');
    }
    db.prepare('UPDATE rounds SET result_revealed_at=? WHERE id=?').run(now(), r.id);
  }
  publish('round', { phase: 'result' });
}

export function nextRound() {
  const ev = ensureEvent();
  const r = currentRound(ev);
  if (r && !r.closed_at) {
    if (!r.result_revealed_at) revealResult();
    db.prepare('UPDATE rounds SET closed_at=? WHERE id=?').run(now(), r.id);
  }
  const idx = r ? r.idx : 0;
  if (idx >= ev.rounds_planned) {
    db.prepare('UPDATE events SET status=?, current_round_id=NULL WHERE id=?').run('finished', ev.id);
    publish('event', { status: 'finished' });
    return null;
  }
  return startRound();
}

/* ─────────────────────────── Submissions ─────────────────────────── */

export function submit(hunterId: string, dataUrl: string): SubmissionRow {
  const ev = ensureEvent();
  const r = currentRound(ev);
  const phase = phaseOf(r);
  if (!r) throw new Error('no round');
  if (r.target_user_id === hunterId) throw new Error('target cannot submit');
  const t = now();
  const inHunt = phase === 'hunt' || (phase === 'verify' && t <= r.hunt_ends_at + HUNT_GRACE_MS);
  if (!inHunt) throw new Error('hunt is not open');
  // One submission per hunter per round.
  const already = db.prepare('SELECT 1 FROM submissions WHERE round_id=? AND hunter_id=?').get(r.id, hunterId);
  if (already) throw new Error('you already submitted this round');

  const id = uid();
  const photo = saveDataUrl(dataUrl, `${ev.id}/${r.id}`, id);
  const sub: SubmissionRow = {
    id, round_id: r.id, hunter_id: hunterId, photo_path: photo,
    status: 'pending', rank: null, points: null, server_received_at: t, verified_at: null,
  };
  db.prepare(
    `INSERT INTO submissions (id,round_id,hunter_id,photo_path,status,rank,points,server_received_at,verified_at)
     VALUES (@id,@round_id,@hunter_id,@photo_path,@status,NULL,NULL,@server_received_at,NULL)`
  ).run(sub);
  publish('submission', { roundId: r.id });
  return sub;
}

/** Recompute ranks/points/scores for a round from its approved submissions. */
function recompute(roundId: string, eventId: string) {
  const approved = db.prepare(
    "SELECT * FROM submissions WHERE round_id=? AND status='approved' ORDER BY verified_at ASC, server_received_at ASC"
  ).all(roundId) as SubmissionRow[];
  db.prepare("DELETE FROM scores WHERE round_id=? AND reason='hunt_rank'").run(roundId);
  const seen = new Set<string>();
  let rank = 0;
  for (const s of approved) {
    if (seen.has(s.hunter_id) || rank >= MAX_RANKS) {
      // duplicate hunter or beyond cap → approved but unscored
      db.prepare('UPDATE submissions SET rank=NULL, points=NULL WHERE id=?').run(s.id);
      continue;
    }
    seen.add(s.hunter_id);
    rank += 1;
    const pts = POINTS[rank - 1];
    db.prepare('UPDATE submissions SET rank=?, points=? WHERE id=?').run(rank, pts, s.id);
    db.prepare('INSERT INTO scores (event_id,user_id,round_id,points,reason) VALUES (?,?,?,?,?)')
      .run(eventId, s.hunter_id, roundId, pts, 'hunt_rank');
  }
}

export function setVerdict(subId: string, action: 'match' | 'not' | 'skip' | 'undo') {
  const ev = ensureEvent();
  const sub = db.prepare('SELECT * FROM submissions WHERE id=?').get(subId) as SubmissionRow | undefined;
  if (!sub) throw new Error('no submission');
  const status = action === 'match' ? 'approved' : action === 'not' ? 'rejected' : action === 'skip' ? 'skipped' : 'pending';
  const verifiedAt = action === 'match' ? now() : null;
  db.prepare('UPDATE submissions SET status=?, verified_at=?, rank=NULL, points=NULL WHERE id=?').run(status, verifiedAt, subId);
  recompute(sub.round_id, ev.id);
  publish('submission', { roundId: sub.round_id, verdict: action });
}

export function listQueue(roundId: string) {
  const rows = db.prepare(
    'SELECT * FROM submissions WHERE round_id=? ORDER BY server_received_at ASC'
  ).all(roundId) as SubmissionRow[];
  return rows.map((s) => {
    const u = getUser(s.hunter_id);
    return {
      id: s.id,
      hunter: u?.nickname ?? '?',
      hue: u?.hue ?? 220,
      photo: `/api/photo/${s.photo_path}`,
      status: s.status,
      rank: s.rank,
      points: s.points,
      receivedAt: s.server_received_at,
    };
  });
}

/* ─────────────────────────── Leaderboard ─────────────────────────── */

export function leaderboard(eventId: string) {
  const users = allUsers();
  const totals = db.prepare('SELECT user_id, SUM(points) pts FROM scores WHERE event_id=? GROUP BY user_id').all(eventId) as { user_id: string; pts: number }[];
  const wins = db.prepare("SELECT s.hunter_id AS user_id, COUNT(*) w FROM submissions s JOIN rounds r ON r.id=s.round_id WHERE r.event_id=? AND s.rank=1 GROUP BY s.hunter_id").all(eventId) as { user_id: string; w: number }[];
  const ptsMap = new Map(totals.map((t) => [t.user_id, t.pts]));
  const winMap = new Map(wins.map((w) => [w.user_id, w.w]));
  const rows = users.map((u) => ({
    id: u.id, nickname: u.nickname, hue: u.hue, selfie: photoOf(u),
    pts: ptsMap.get(u.id) ?? 0, wins: winMap.get(u.id) ?? 0,
  }));
  rows.sort((a, b) => b.pts - a.pts || a.nickname.localeCompare(b.nickname));
  return rows.map((r, i) => ({ ...r, rank: i + 1, medal: i < 3 ? (['gold', 'silver', 'bronze'][i]) : null }));
}

/* ─────────────────────────── Snapshot (client state) ─────────────────────────── */

export function snapshot(userId: string | null) {
  const ev = ensureEvent();
  const me = userId ? getUser(userId) : null;
  const r = currentRound(ev);
  const phase = phaseOf(r);
  const players = allUsers();

  let round = null;
  if (r) {
    const target = getUser(r.target_user_id);
    const subs = db.prepare('SELECT * FROM submissions WHERE round_id=? ORDER BY server_received_at DESC').all(r.id) as SubmissionRow[];
    const approvedScored = subs.filter((s) => s.points != null).length;
    const myFirstApproved = me ? subs.find((s) => s.hunter_id === me.id && s.status === 'approved') : null;
    const mySub = me ? subs.find((s) => s.hunter_id === me.id) : null;

    const ticker = subs.slice(0, 8).map((s) => {
      const u = getUser(s.hunter_id);
      return { nickname: u?.nickname ?? '?', hue: u?.hue ?? 220, status: s.status, rank: s.rank, points: s.points };
    });

    let result = null;
    if (phase === 'result') {
      const scored = (db.prepare(
        "SELECT * FROM submissions WHERE round_id=? AND points IS NOT NULL ORDER BY rank ASC"
      ).all(r.id) as SubmissionRow[]).map((s) => {
        const u = getUser(s.hunter_id);
        return {
          rank: s.rank, nickname: u?.nickname ?? '?', hue: u?.hue ?? 220, selfie: photoOf(u),
          points: s.points, time: fmtClock(s.server_received_at - r.started_at - ev.reveal_seconds * 1000),
          mine: !!me && u?.id === me.id,
        };
      });
      const caughtRow = db.prepare("SELECT MIN(server_received_at) m FROM submissions WHERE round_id=? AND status='approved'").get(r.id) as { m: number | null };
      result = {
        podium: scored.slice(0, 3),
        rest: scored.slice(3, 5),
        targetSurvived: scored.length === 0 && (db.prepare("SELECT COUNT(*) c FROM submissions WHERE round_id=? AND status='approved'").get(r.id) as { c: number }).c === 0,
        caughtCount: scored.length,
        caughtAt: caughtRow.m ? fmtClock(caughtRow.m - r.started_at - ev.reveal_seconds * 1000) : null,
      };
    }

    round = {
      id: r.id,
      idx: r.idx,
      phase,
      target: publicUser(target),
      iAmTarget: !!me && r.target_user_id === me.id,
      revealUntil: r.reveal_until,
      huntEndsAt: r.hunt_ends_at,
      approvedScored,
      submissionCount: subs.length,
      hunterCount: Math.max(0, players.length - 1),
      mySubmission: mySub ? { status: mySub.status, rank: mySub.rank, points: mySub.points } : null,
      iScored: !!myFirstApproved,
      ticker,
      result,
    };
  }

  return {
    now: now(),
    me: publicUser(me),
    event: {
      name: ev.name, status: ev.status,
      roundsPlanned: ev.rounds_planned, roundSeconds: ev.round_seconds, revealSeconds: ev.reveal_seconds,
      currentIdx: r?.idx ?? 0,
    },
    round,
    lobby: {
      count: players.length,
      players: players.map((p) => ({ nickname: p.nickname, hue: p.hue, selfie: photoOf(p), isMe: !!me && p.id === me.id })),
    },
    leaderboard: leaderboard(ev.id).map((l) => ({ ...l, isMe: !!me && l.id === me.id })),
  };
}

function fmtClock(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
