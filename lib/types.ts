// FaceHunt v2 — shared types

export type EventStatus = 'lobby' | 'running' | 'finished';
// A round's phase is *derived* from timestamps + flags (see game.phaseOf).
export type RoundPhase = 'reveal' | 'hunt' | 'verify' | 'result' | 'closed';
export type SubStatus = 'pending' | 'approved' | 'rejected' | 'skipped';

export interface User {
  id: string;
  email: string | null;
  name: string;
  nickname: string;
  selfie_path: string | null;
  photo_url: string | null; // external (e.g. Google) profile photo, used when no selfie
  hue: number;
  created_at: number;
}

export interface EventRow {
  id: string;
  name: string;
  status: EventStatus;
  current_round_id: string | null;
  rounds_planned: number;
  round_seconds: number;
  reveal_seconds: number;
  created_at: number;
}

export interface RoundRow {
  id: string;
  event_id: string;
  idx: number;
  target_user_id: string;
  started_at: number;
  reveal_until: number;
  hunt_ends_at: number;
  result_revealed_at: number | null;
  closed_at: number | null;
}

export interface SubmissionRow {
  id: string;
  round_id: string;
  hunter_id: string;
  photo_path: string;
  status: SubStatus;
  rank: number | null;
  points: number | null;
  server_received_at: number;
  verified_at: number | null;
}

export interface ScoreRow {
  id: number;
  event_id: string;
  user_id: string;
  round_id: string;
  points: number;
  reason: 'hunt_rank' | 'target_survive';
}

export const POINTS = [10, 6, 4, 2, 1];
export const MAX_RANKS = POINTS.length;
export const HUNT_GRACE_MS = 5000; // accept late uploads up to 5s after hunt ends
