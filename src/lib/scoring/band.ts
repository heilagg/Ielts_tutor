/**
 * Raw-score → band conversion for Reading & Listening.
 *
 * These thresholds are the widely-published *indicative* conversion tables used by
 * British Council / IDP prep materials — not IELTS's confidential official scale,
 * which varies slightly test-to-test to equate difficulty. Treat all bands produced
 * here as estimates, never as guaranteed official results.
 */

const READING_TABLE: Array<[minRaw: number, band: number]> = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5],
  [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5],
  [6, 3], [4, 2.5], [0, 2],
];

const LISTENING_TABLE: Array<[minRaw: number, band: number]> = [
  [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5],
  [23, 6], [18, 5.5], [16, 5], [13, 4.5], [11, 4], [8, 3.5],
  [6, 3], [4, 2.5], [0, 2],
];

function rawToBand(raw: number, table: Array<[number, number]>): number {
  const clamped = Math.max(0, Math.min(40, raw));
  for (const [minRaw, band] of table) {
    if (clamped >= minRaw) return band;
  }
  return 0;
}

/**
 * The tables above are calibrated for a 40-question test. Practice sets are often
 * shorter (e.g. a 13-question targeted drill), so raw scores are first scaled to a
 * /40-equivalent by accuracy before lookup — otherwise a short set silently produces
 * a badly understated band (e.g. 7/13 correct looks catastrophic on the /40 table even
 * though it's the same ~54% accuracy as 22/40).
 */
function scaleTo40(raw: number, total: number): number {
  if (total === 40) return raw;
  if (total <= 0) return 0;
  return Math.round((raw / total) * 40);
}

export function readingRawToBand(raw: number, total: number = 40): number {
  return rawToBand(scaleTo40(raw, total), READING_TABLE);
}

export function listeningRawToBand(raw: number, total: number = 40): number {
  return rawToBand(scaleTo40(raw, total), LISTENING_TABLE);
}

/**
 * Official IELTS overall-band rounding rule applied to the mean of the four
 * component bands: averages ending in .25 round up to the next half band,
 * and averages ending in .75 round up to the next whole band.
 */
export function overallBandFromComponents(components: {
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}): number {
  const mean =
    (components.listening + components.reading + components.writing + components.speaking) / 4;
  return roundToIeltsBand(mean);
}

export function roundToIeltsBand(value: number): number {
  const remainder = value % 1;
  const base = Math.floor(value);
  if (remainder < 0.25) return base;
  if (remainder < 0.75) return base + 0.5;
  return base + 1;
}

/** Clamp/round any raw AI or rubric band (e.g. 6.3) to the nearest valid 0.5 step used for component bands. */
export function roundToHalfBand(value: number): number {
  return Math.round(value * 2) / 2;
}
