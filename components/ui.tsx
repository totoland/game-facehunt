'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ───────────────────────── Icons (lucide-flavored) ───────────────────────── */
type IconProps = { size?: number; sw?: number; className?: string; fill?: string };
const I = ({ size = 20, sw = 1.75, className, fill, children }: IconProps & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={fill || 'none'} stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className}>
    {children}
  </svg>
);
export const Icon = {
  Target: (p: IconProps) => <I {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /></I>,
  Camera: (p: IconProps) => <I {...p}><path d="M4 8h3l1.5-2.2A1.6 1.6 0 0 1 9.8 5h4.4c.5 0 1 .25 1.3.66L17 8h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z" /><circle cx="12" cy="13.5" r="3.6" /></I>,
  Check: (p: IconProps) => <I {...p}><path d="M5 12l4 4 10-10" /></I>,
  X: (p: IconProps) => <I {...p}><path d="M6 6l12 12M18 6L6 18" /></I>,
  ChevronRight: (p: IconProps) => <I {...p}><path d="M9 6l6 6-6 6" /></I>,
  Users: (p: IconProps) => <I {...p}><circle cx="9" cy="9" r="3.2" /><path d="M3 19c0-3 3-5 6-5s6 2 6 5" /><circle cx="17" cy="8" r="2.6" /><path d="M15 19c0-2.5 1.8-4.2 4-4.4" /></I>,
  Clock: (p: IconProps) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></I>,
  Dot: (p: IconProps) => <I {...p} fill="currentColor"><circle cx="12" cy="12" r="4" /></I>,
  Award: (p: IconProps) => <I {...p}><circle cx="12" cy="9" r="5" /><path d="M9 13l-2 8 5-3 5 3-2-8" /></I>,
  Run: (p: IconProps) => <I {...p}><circle cx="14" cy="5" r="2" /><path d="M10 21l2-6 3 2 2 4M8 13l3-3 4 3-2 3-4-1-3 4" /></I>,
  Send: (p: IconProps) => <I {...p}><path d="M3 11l18-8-8 18-3-7-7-3z" /></I>,
  Refresh: (p: IconProps) => <I {...p}><path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" /></I>,
  Trophy: (p: IconProps) => <I {...p}><path d="M8 4h8v4a4 4 0 0 1-8 0V4z" /><path d="M4 5h4v3a3 3 0 0 1-3-3V5zM20 5h-4v3a3 3 0 0 0 3-3V5z" /><path d="M10 13.5V17H8v2h8v-2h-2v-3.5" /></I>,
  ArrowUp: (p: IconProps) => <I {...p}><path d="M12 19V5M6 11l6-6 6 6" /></I>,
  ArrowDown: (p: IconProps) => <I {...p}><path d="M12 5v14M6 13l6 6 6-6" /></I>,
  Minus: (p: IconProps) => <I {...p}><path d="M5 12h14" /></I>,
  EyeOff: (p: IconProps) => <I {...p}><path d="M3 3l18 18M10.6 6.2A9.5 9.5 0 0 1 22 12c-1 2-3 4-6 5.5M6 8C4 9.5 2.5 11 2 12c1 2 4 6 10 6 1.5 0 2.8-.3 4-.7" /></I>,
  Eye: (p: IconProps) => <I {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></I>,
  Sparkles: (p: IconProps) => <I {...p}><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" /><path d="M19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8L16.5 17.5l1.8-.7z" /></I>,
  Settings: (p: IconProps) => <I {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.7 7l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></I>,
  Projector: (p: IconProps) => <I {...p}><rect x="2" y="8" width="20" height="9" rx="2" /><circle cx="9" cy="12.5" r="2.5" /><path d="M16 11h3M16 14h2M8 21h8M10 17v4M14 17v4" /></I>,
  Stop: (p: IconProps) => <I {...p} fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1.5" /></I>,
  Play: (p: IconProps) => <I {...p} fill="currentColor"><path d="M7 5l12 7-12 7z" /></I>,
};

export const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 8-11.3 8a12 12 0 1 1 0-24c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 6.2 29.1 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 7.2 29.1 5 24 5 16.3 5 9.7 9.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5 0 9.5-1.9 12.9-5l-6-5c-1.9 1.3-4.3 2-6.9 2-5.3 0-9.7-3.4-11.3-8L6 32.4C9.3 39 16 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5l6 5C40 35.7 44 30.4 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

/* ───────────────────────── Wordmark ───────────────────────── */
export const Wordmark = ({ size = 40 }: { size?: number }) => (
  <div className="inline-flex items-baseline tracking-tight font-black" style={{ fontSize: size, lineHeight: 1 }}>
    <span className="text-ink">Face</span>
    <span className="ml-[2px]" style={{ background: 'linear-gradient(180deg, #00F0FF 0%, #7C3AED 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', textShadow: '0 0 28px rgba(0,240,255,0.35)' }}>Hunt</span>
  </div>
);

/* ───────────────────────── Pill ───────────────────────── */
type Tone = 'muted' | 'cyan' | 'magenta' | 'success' | 'purple' | 'warn' | 'gold' | 'silver' | 'bronze' | 'solidMagenta';
export const Pill = ({ children, tone = 'muted', className = '', size = 'md' }: { children: React.ReactNode; tone?: Tone; className?: string; size?: 'sm' | 'md' | 'lg' }) => {
  const tones: Record<Tone, string> = {
    muted: 'bg-surface text-muted border border-line',
    cyan: 'bg-cyan/10 text-cyan border border-cyan/30',
    magenta: 'bg-magenta/10 text-magenta border border-magenta/30',
    success: 'bg-success/10 text-success border border-success/30',
    purple: 'bg-purple/15 text-[#c5a8ff] border border-purple/40',
    warn: 'bg-warn/10 text-warn border border-warn/30',
    gold: 'bg-[rgba(255,210,74,0.10)] text-gold border border-[rgba(255,210,74,0.40)]',
    silver: 'bg-[rgba(201,210,218,0.10)] text-silver border border-[rgba(201,210,218,0.40)]',
    bronze: 'bg-[rgba(224,147,74,0.10)] text-bronze border border-[rgba(224,147,74,0.40)]',
    solidMagenta: 'bg-magenta text-white border border-magenta',
  };
  const sizes = { sm: 'h-5 px-1.5 text-[9.5px]', md: 'h-6 px-2 text-[10.5px]', lg: 'h-7 px-2.5 text-[11.5px]' };
  return <span className={`inline-flex items-center gap-1 rounded-full font-semibold tracking-wide uppercase whitespace-nowrap ${sizes[size]} ${tones[tone]} ${className}`}>{children}</span>;
};

/* ───────────────────────── Button ───────────────────────── */
type BtnKind = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'warn' | 'outline';
export const Button = ({ kind = 'primary', size = 'md', disabled, children, leading, trailing, className = '', onClick }: {
  kind?: BtnKind; size?: 'sm' | 'md' | 'lg'; disabled?: boolean; children?: React.ReactNode; leading?: React.ReactNode; trailing?: React.ReactNode; className?: string; onClick?: () => void;
}) => {
  const sizes = { sm: 'h-9 px-3 text-[13px] gap-1.5 rounded-xl', md: 'h-12 px-5 text-[15px] gap-2 rounded-2xl', lg: 'h-14 px-6 text-base gap-2 rounded-2xl' };
  const kinds: Record<BtnKind, string> = {
    primary: 'bg-cyan text-void hover:brightness-110 active:brightness-95 fh-ring-cyan font-bold',
    secondary: 'bg-surface text-ink hover:bg-[#1a1a2b] border border-line font-semibold',
    danger: 'bg-magenta text-white hover:brightness-110 fh-ring-magenta font-bold',
    ghost: 'bg-transparent text-muted hover:text-ink hover:bg-white/5 font-medium',
    success: 'bg-success text-void hover:brightness-110 fh-ring-success font-bold',
    warn: 'bg-warn text-void hover:brightness-110 fh-ring-warn font-bold',
    outline: 'bg-transparent text-ink border border-line hover:border-white/30 font-semibold',
  };
  return (
    <button disabled={disabled} onClick={onClick}
      className={`fh-press inline-flex items-center justify-center tracking-tight whitespace-nowrap ${sizes[size]} ${kinds[kind]} ${disabled ? 'opacity-40 grayscale pointer-events-none' : ''} ${className}`}>
      {leading}<span>{children}</span>{trailing}
    </button>
  );
};

/* ───────────────────────── Avatar ───────────────────────── */
export const Avatar = ({ name, hue = 220, size = 32, ring = false, medal, selfie }: { name: string; hue?: number; size?: number; ring?: boolean; medal?: string | null; selfie?: string | null }) => {
  const initial = (name || '?').slice(0, 1).toUpperCase();
  const border = medal ? ({ gold: 'rgba(255,210,74,0.95)', silver: 'rgba(201,210,218,0.95)', bronze: 'rgba(224,147,74,0.95)' } as Record<string, string>)[medal] : `hsl(${hue} 85% 55% / 0.55)`;
  return (
    <div className="relative inline-flex items-center justify-center font-semibold select-none overflow-hidden"
      style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(140deg, hsl(${hue} 80% 22%), hsl(${(hue + 28) % 360} 75% 14%))`, color: `hsl(${hue} 95% 85%)`, border: `1.5px solid ${border}`, fontSize: size * 0.42, boxShadow: ring ? `0 0 0 2px var(--fh-void), 0 0 0 3px ${border}` : 'none' }}>
      {selfie ? <img src={selfie} alt={name} className="absolute inset-0 w-full h-full object-cover" /> : initial}
    </div>
  );
};

/* ───────────────────────── SelfieBubble (CSS/SVG portrait) ───────────────────────── */
export const SelfieBubble = ({ name = 'Target', hue = 348, size = 120, frame = 'cyan', pulse = false, selfie, className = '' }: {
  name?: string; hue?: number; size?: number; frame?: 'cyan' | 'magenta' | 'gold' | 'silver' | 'bronze' | 'none'; pulse?: boolean; selfie?: string | null; className?: string;
}) => {
  const v = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % 3;
  const frames = {
    cyan: 'conic-gradient(from 210deg, #00F0FF, #7C3AED, #00F0FF)',
    magenta: 'conic-gradient(from 210deg, #FF006E, #7C3AED, #FF006E)',
    gold: 'conic-gradient(from 210deg, #FFD24A, #E0934A, #FFD24A)',
    silver: 'conic-gradient(from 210deg, #C9D2DA, #6E7B86, #C9D2DA)',
    bronze: 'conic-gradient(from 210deg, #E0934A, #7A4B2A, #E0934A)',
    none: 'transparent',
  } as const;
  const ringPad = frame === 'none' ? 0 : Math.max(2, size * 0.025);
  const hairPaths = [
    'M22,48 C18,28 32,16 50,16 C68,16 82,28 78,48 C76,42 70,38 64,38 C58,38 54,40 50,40 C42,40 36,38 32,40 C28,42 24,46 22,48 Z',
    'M20,52 C18,30 30,14 48,14 C68,14 84,30 80,54 C78,46 74,44 70,44 C64,44 58,48 50,48 C44,48 38,46 34,48 C30,50 24,52 20,52 Z',
    'M24,50 C22,30 36,18 50,18 C66,18 78,28 78,50 C72,44 64,42 58,46 C52,50 46,50 40,46 C34,42 28,46 24,50 Z',
  ];
  const smiles = ['M44,72 Q50,76 56,72', 'M44,72 Q50,78 56,72', 'M44,72 Q50,74 56,72'];
  const skin = `hsl(${hue} 55% 70%)`, skinShade = `hsl(${hue} 55% 56%)`, hair = `hsl(${hue} 55% 14%)`, eye = `hsl(${hue} 45% 12%)`;
  return (
    <div className={`relative rounded-full ${pulse ? 'fh-pulse-magenta' : ''} ${className}`} style={{ width: size, height: size, background: frames[frame], padding: ringPad }}>
      <div className="w-full h-full rounded-full overflow-hidden relative" style={{ background: `radial-gradient(60% 60% at 50% 30%, hsl(${hue} 60% 30%), hsl(${(hue + 30) % 360} 55% 12%) 80%)` }}>
        {selfie ? (
          <img src={selfie} alt={name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            <div className="absolute inset-0" style={{ background: `radial-gradient(closest-side at 50% 85%, hsl(${hue} 90% 55% / 0.35), transparent 75%)` }} />
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
              <path d="M14,100 C18,86 30,80 50,80 C70,80 82,86 86,100 Z" fill={`hsl(${hue} 60% 18%)`} />
              <path d="M40,80 L42,90 L50,86 L58,90 L60,80 Z" fill={`hsl(${hue} 70% 38%)`} opacity="0.7" />
              <rect x="46" y="76" width="8" height="6" fill={skinShade} />
              <ellipse cx="50" cy="56" rx="19" ry="22" fill={skin} />
              <ellipse cx="40" cy="62" rx="3.5" ry="2" fill={`hsl(${hue} 80% 55%)`} opacity="0.35" />
              <ellipse cx="60" cy="62" rx="3.5" ry="2" fill={`hsl(${hue} 80% 55%)`} opacity="0.35" />
              <path d={hairPaths[v]} fill={hair} />
              <rect x="38" y="50" width="6" height="1.2" rx="0.6" fill={eye} />
              <rect x="56" y="50" width="6" height="1.2" rx="0.6" fill={eye} />
              <circle cx="41" cy="55" r="1.6" fill={eye} />
              <circle cx="59" cy="55" r="1.6" fill={eye} />
              <path d="M50 58 L48 65 L52 65" fill="none" stroke={skinShade} strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
              <path d={smiles[v]} fill="none" stroke={`hsl(${hue} 50% 24%)`} strokeWidth="1.4" strokeLinecap="round" />
              <ellipse cx="42" cy="50" rx="2.5" ry="1.4" fill="white" opacity="0.18" />
            </svg>
          </>
        )}
      </div>
    </div>
  );
};

/* ───────────────────────── DigitRoll ───────────────────────── */
export const DigitRoll = ({ value, pad = 0, className = '' }: { value: number; pad?: number; className?: string }) => {
  const str = String(Math.max(0, Math.floor(value))).padStart(pad, '0');
  return (
    <span className={`fh-mono inline-flex ${className}`}>
      {str.split('').map((ch, i) => {
        if (!/\d/.test(ch)) return <span key={i}>{ch}</span>;
        const n = parseInt(ch, 10);
        return (
          <span key={i} className="fh-roll" style={{ height: '1em' }}>
            <span className="fh-roll-track" style={{ transform: `translateY(-${n}em)` }}>
              {Array.from({ length: 10 }).map((_, d) => <span key={d} className="fh-roll-cell">{d}</span>)}
            </span>
          </span>
        );
      })}
    </span>
  );
};

/* ───────────────────────── ParticleBurst ───────────────────────── */
export const ParticleBurst = ({ count = 14, color = 'var(--fh-cyan)', size = 6, run }: { count?: number; color?: string; size?: number; run: number }) => {
  const seeds = useMemo(() => Array.from({ length: count }).map((_, i) => {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const r = 60 + Math.random() * 50;
    return { tx: Math.cos(a) * r, ty: Math.sin(a) * r, d: Math.random() * 120 };
  }), [count, run]);
  return (
    <div className="absolute inset-0 pointer-events-none" key={run}>
      {seeds.map((s, i) => (
        <span key={i} className="fh-particle absolute left-1/2 top-1/2 rounded-full"
          style={{ width: size, height: size, background: color, boxShadow: `0 0 12px ${color}`, transform: 'translate(-50%, -50%)', ['--tx' as string]: `${s.tx}px`, ['--ty' as string]: `${s.ty}px`, animationDelay: `${s.d}ms` }} />
      ))}
    </div>
  );
};

/* ───────────────────────── Mobile shell ───────────────────────── */
// On phones (<=480px) the screen IS the device — full-bleed. On desktop, a centered frame.
export const Shell = ({ children }: { children: React.ReactNode }) => (
  <main className="relative z-10 min-h-[100dvh] flex items-center justify-center sm:py-6">
    <div className="fh-frame fh-grain">
      <div className="absolute inset-0">{children}</div>
    </div>
  </main>
);

/* ───────────────────────── Hooks ───────────────────────── */
/** Smooth client countdown to an absolute server timestamp, corrected by clock offset. */
export function useCountdownTo(targetTs: number | null, offset: number) {
  const [, force] = useState(0);
  useEffect(() => {
    if (targetTs == null) return;
    const id = setInterval(() => force((x) => x + 1), 250);
    return () => clearInterval(id);
  }, [targetTs]);
  if (targetTs == null) return { sec: 0, mm: '00', ss: '00' };
  const remain = Math.max(0, Math.round((targetTs - (Date.now() + offset)) / 1000));
  return { sec: remain, mm: String(Math.floor(remain / 60)).padStart(2, '0'), ss: String(remain % 60).padStart(2, '0') };
}

/** Subscribe to /api/stream and re-fetch a JSON endpoint on every event (+ poll fallback). */
export function useLiveState<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const offsetRef = useRef(0);
  const fetchState = useRef(async () => {
    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
      if (!res.ok) { setData(null); return; }
      const json = await res.json();
      if (typeof json.now === 'number') offsetRef.current = json.now - Date.now();
      setData(json);
    } catch { /* ignore */ }
  });
  useEffect(() => {
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval>;
    fetchState.current();
    try {
      es = new EventSource('/api/stream');
      es.onmessage = () => fetchState.current();
      es.onerror = () => { /* EventSource auto-reconnects */ };
    } catch { /* no SSE */ }
    poll = setInterval(() => fetchState.current(), 3000); // fallback / keeps lobby fresh
    return () => { es?.close(); clearInterval(poll); };
  }, [endpoint]);
  return { data, offset: offsetRef.current, refetch: () => fetchState.current() };
}

/** Live camera preview + frame capture. Attach `videoRef` to a <video> element. */
export function useCamera(facingMode: 'environment' | 'user' = 'environment') {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<'idle' | 'on' | 'error'>('idle');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) { setStatus('error'); return; }
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play().catch(() => {}); }
        setStatus('on');
      } catch { if (!cancelled) setStatus('error'); }
    })();
    return () => { cancelled = true; streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [facingMode]);

  const capture = useCallback((): string => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return placeholderDataUrl(Math.floor(Math.random() * 360));
    const w = Math.min(v.videoWidth, 900);
    const h = Math.round((w / v.videoWidth) * v.videoHeight);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d')!.drawImage(v, 0, 0, w, h);
    return c.toDataURL('image/jpeg', 0.7);
  }, []);

  return { videoRef, status, capture };
}

/** Capture a frame from the camera, with a graceful gradient fallback when no camera. */
export async function capturePhoto(): Promise<string> {
  const hue = Math.floor(Math.random() * 360);
  const fallback = () => placeholderDataUrl(hue);
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return fallback();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    await new Promise((r) => setTimeout(r, 350));
    const w = video.videoWidth || 720, h = video.videoHeight || 960;
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(w, 900); canvas.height = Math.round((Math.min(w, 900) / w) * h);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stream.getTracks().forEach((t) => t.stop());
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return fallback();
  }
}

export function placeholderDataUrl(hue: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600; canvas.height = 800;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 600, 800);
  g.addColorStop(0, `hsl(${hue} 60% 28%)`);
  g.addColorStop(1, `hsl(${(hue + 60) % 360} 55% 14%)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 600, 800);
  ctx.fillStyle = `hsl(${hue} 50% 55%)`;
  ctx.beginPath(); ctx.ellipse(300, 360, 150, 190, 0, 0, Math.PI * 2); ctx.fill();
  return canvas.toDataURL('image/jpeg', 0.7);
}
