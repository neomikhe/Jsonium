const SEED_STEP = 0x6d2b79f5;
const SHIFT_A = 15;
const SHIFT_B = 7;
const MIX_B = 61;
const SHIFT_C = 14;
const UINT32_RANGE = 4294967296;

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + SEED_STEP) >>> 0;
    let mixed = Math.imul(state ^ (state >>> SHIFT_A), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> SHIFT_B), MIX_B | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> SHIFT_C)) >>> 0) / UINT32_RANGE;
  };
}
