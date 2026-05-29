import fs from 'node:fs';
import path from 'node:path';
import { PHOTO_DIR } from './db';

const MAX_BYTES = 6 * 1024 * 1024; // 6MB safety cap
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Decode a data: URL ("data:image/jpeg;base64,....") and write it under
 * data/photos/<relDir>/<name>.<ext>. Returns the relative path (for photo_path).
 */
export function saveDataUrl(dataUrl: string, relDir: string, name: string): string {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl || '');
  if (!m) throw new Error('invalid image data');
  const mime = m[1];
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > MAX_BYTES) throw new Error('image too large');
  const ext = EXT[mime];
  const dir = path.join(PHOTO_DIR, relDir);
  fs.mkdirSync(dir, { recursive: true });
  const rel = path.join(relDir, `${name}.${ext}`);
  fs.writeFileSync(path.join(PHOTO_DIR, rel), buf);
  return rel.split(path.sep).join('/');
}

export function readPhoto(rel: string): { buf: Buffer; mime: string } | null {
  // prevent path traversal
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(PHOTO_DIR, safe);
  if (!full.startsWith(PHOTO_DIR)) return null;
  if (!fs.existsSync(full)) return null;
  const ext = path.extname(full).slice(1).toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return { buf: fs.readFileSync(full), mime };
}
