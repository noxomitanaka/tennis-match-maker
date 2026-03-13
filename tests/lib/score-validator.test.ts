import { describe, it, expect } from 'vitest';
import { validateSetScore, validateAllSets } from '../../src/lib/score-validator';

describe('validateSetScore', () => {
  it('accepts valid normal score', () => {
    const errors = validateSetScore({ games1: 6, games2: 3 }, 6, true, 0);
    expect(errors).toHaveLength(0);
  });

  it('accepts valid tiebreak score', () => {
    const errors = validateSetScore({ games1: 6, games2: 6, tiebreak1: 7, tiebreak2: 5 }, 6, true, 0);
    expect(errors).toHaveLength(0);
  });

  it('rejects negative games', () => {
    const errors = validateSetScore({ games1: -1, games2: 3 }, 6, true, 0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects games exceeding max', () => {
    const errors = validateSetScore({ games1: 8, games2: 3 }, 6, true, 0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects both at max+1 (e.g. 7-7)', () => {
    const errors = validateSetScore({ games1: 7, games2: 7 }, 6, true, 0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects tiebreak without 2-point margin', () => {
    const errors = validateSetScore({ games1: 6, games2: 6, tiebreak1: 7, tiebreak2: 6 }, 6, true, 0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts extended tiebreak (e.g. 10-8)', () => {
    const errors = validateSetScore({ games1: 6, games2: 6, tiebreak1: 10, tiebreak2: 8 }, 6, true, 0);
    expect(errors).toHaveLength(0);
  });

  it('rejects winner with too few games', () => {
    // 5-3: winner has 5, less than gamesPerSet=6
    const errors = validateSetScore({ games1: 5, games2: 3 }, 6, true, 0);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('validateAllSets', () => {
  it('validates multiple sets', () => {
    const errors = validateAllSets([
      { games1: 6, games2: 3 },
      { games1: 4, games2: 6 },
      { games1: 6, games2: 2 },
    ], 6, true);
    expect(errors).toHaveLength(0);
  });

  it('returns errors for invalid set in array', () => {
    const errors = validateAllSets([
      { games1: 6, games2: 3 },
      { games1: -1, games2: 6 },
    ], 6, true);
    expect(errors.length).toBeGreaterThan(0);
  });
});
