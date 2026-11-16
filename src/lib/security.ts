import { createHash, timingSafeEqual } from 'node:crypto'

/** Bandingkan dua string rahasia dengan waktu konstan (mencegah timing side-channel). */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const aHash = createHash('sha256').update(a).digest()
  const bHash = createHash('sha256').update(b).digest()
  return timingSafeEqual(aHash, bHash)
}
