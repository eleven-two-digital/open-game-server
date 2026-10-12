// SPDX-License-Identifier: Apache-2.0

export interface Clock {
  now(): number;
}

export interface RandomSource {
  next(): number;
}

export const systemClock: Clock = {
  now: () => Date.now(),
};

export function createSeededRandom(seed: number): RandomSource {
  if (!Number.isSafeInteger(seed)) {
    throw new RangeError("Random seed must be a safe integer.");
  }

  let state = seed >>> 0;
  if (state === 0) {
    state = 0x6d2b79f5;
  }

  return {
    next() {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 0x1_0000_0000;
    },
  };
}

export function createTestIdFactory(prefix = "test"): () => string {
  let next = 0;
  return () => `${prefix}-${++next}`;
}
