// Shapes returned by /api/state (player) and /api/admin/state (admin), for the client.

export interface PublicUser { id: string; nickname: string; hue: number; selfie: string | null; hasSelfie: boolean }

export interface TickerItem { nickname: string; hue: number; status: string; rank: number | null; points: number | null }

export interface ResultRow { rank: number | null; nickname: string; hue: number; selfie: string | null; points: number | null; time: string; mine: boolean }

export interface RoundView {
  id: string;
  idx: number;
  phase: 'reveal' | 'hunt' | 'verify' | 'result' | 'closed';
  target: PublicUser | null;
  iAmTarget: boolean;
  revealUntil: number;
  huntEndsAt: number;
  approvedScored: number;
  submissionCount: number;
  hunterCount: number;
  mySubmission: { status: string; rank: number | null; points: number | null } | null;
  iScored: boolean;
  ticker: TickerItem[];
  result: {
    podium: ResultRow[];
    rest: ResultRow[];
    targetSurvived: boolean;
    caughtCount: number;
    caughtAt: string | null;
  } | null;
}

export interface LeaderRow { id: string; nickname: string; hue: number; selfie: string | null; pts: number; wins: number; rank: number; medal: string | null; isMe: boolean }

export interface Snapshot {
  now: number;
  me: PublicUser | null;
  event: { name: string; status: 'lobby' | 'running' | 'finished'; roundsPlanned: number; roundSeconds: number; revealSeconds: number; currentIdx: number };
  round: RoundView | null;
  lobby: { count: number; players: { nickname: string; hue: number; selfie: string | null; isMe: boolean }[] };
  leaderboard: LeaderRow[];
}

export interface QueueItem { id: string; hunter: string; hue: number; photo: string; status: string; rank: number | null; points: number | null; receivedAt: number }
export interface AdminSnapshot extends Snapshot { queue: QueueItem[] }

export function livePhase(round: RoundView | null, offset: number): RoundView['phase'] {
  if (!round) return 'closed';
  if (round.phase === 'result' || round.phase === 'closed') return round.phase;
  const t = Date.now() + offset;
  if (t < round.revealUntil) return 'reveal';
  if (t < round.huntEndsAt) return 'hunt';
  return 'verify';
}
