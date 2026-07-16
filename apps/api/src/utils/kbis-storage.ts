import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const KBIS_MAX_BYTES = 10 * 1024 * 1024;
export const KBIS_DIR = path.resolve(__dirname, '../../uploads/kbis');

const SAFE_REF = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i;

export function ensureKbisDir(): void {
  fs.mkdirSync(KBIS_DIR, { recursive: true });
}

export function isSafeKbisRef(ref: string): boolean {
  return SAFE_REF.test(ref);
}

export function kbisAbsolutePath(ref: string): string {
  return path.join(KBIS_DIR, ref);
}

export function kbisExists(ref: string): boolean {
  if (!isSafeKbisRef(ref)) return false;
  return fs.existsSync(kbisAbsolutePath(ref));
}
