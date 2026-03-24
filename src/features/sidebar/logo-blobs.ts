export type BlobSpec = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  background: string;
};

export type LogoScene = {
  blobs: BlobSpec[];
  grainSeed: number;
};

const hashSeed = (seed: string): number => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** Deterministic 0..1 floats from a string seed (mulberry32). */
const createSeededRng = (seed: string) => {
  let state = hashSeed(seed) || 1;
  return (): number => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

function pushBlob(
  blobs: BlobSpec[],
  i: number,
  nextRand: () => number,
): void {
  const L = 0.12 + nextRand() * 0.78;
  const C = 0.03 + nextRand() * 0.22;
  const H = nextRand() * 360;
  blobs.push({
    id: `blob-${i}-${Math.floor(nextRand() * 1e9)}`,
    x: nextRand() * 100,
    y: nextRand() * 100,
    w: 42 + nextRand() * 95,
    h: 42 + nextRand() * 95,
    background: `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`,
  });
}

export const createRandomLogoScene = (): LogoScene => {
  const blobCount = 5 + Math.floor(Math.random() * 5);
  const blobs: BlobSpec[] = [];
  for (let i = 0; i < blobCount; i++) {
    pushBlob(blobs, i, Math.random);
  }
  return {
    blobs,
    grainSeed: Math.random() * 1000,
  };
};

export const createSeededBlobScene = (seed: string): LogoScene => {
  const rand = createSeededRng(seed);
  const blobCount = 5 + Math.floor(rand() * 5);
  const blobs: BlobSpec[] = [];
  for (let i = 0; i < blobCount; i++) {
    pushBlob(blobs, i, rand);
  }
  return {
    blobs,
    grainSeed: Math.floor(rand() * 1000),
  };
};

/** Compact glow for small avatars (deterministic per seed). */
export const createSeededAvatarScene = (seed: string): LogoScene => {
  const rand = createSeededRng(`avatar:${seed}`);
  const blobCount = 4;
  const blobs: BlobSpec[] = [];
  for (let i = 0; i < blobCount; i++) {
    pushBlob(blobs, i, rand);
  }
  return {
    blobs,
    grainSeed: Math.floor(rand() * 1000),
  };
};
