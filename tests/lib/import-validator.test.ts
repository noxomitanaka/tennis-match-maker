import { describe, it, expect } from 'vitest';
import { validateImport } from '../../src/lib/import-validator';

describe('validateImport', () => {
  it('rejects non-array', () => {
    const result = validateImport({ foo: 'bar' });
    expect(result.valid).toBe(false);
  });

  it('rejects empty array', () => {
    const result = validateImport([]);
    expect(result.valid).toBe(false);
  });

  it('accepts valid tournament', () => {
    const result = validateImport([{
      id: 'test-1',
      name: 'Test',
      type: 'singles',
      totalRounds: 4,
      participants: [],
      rounds: [],
    }]);
    expect(result.valid).toBe(true);
    expect(result.tournaments).toHaveLength(1);
  });

  it('rejects tournament without name', () => {
    const result = validateImport([{
      id: 'test-1',
      type: 'singles',
      totalRounds: 4,
      participants: [],
      rounds: [],
    }]);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid tournament type', () => {
    const result = validateImport([{
      id: 'test-1',
      name: 'Test',
      type: 'invalid',
      totalRounds: 4,
      participants: [],
      rounds: [],
    }]);
    expect(result.valid).toBe(false);
  });

  it('sets defaults for missing optional fields', () => {
    const result = validateImport([{
      id: 'test-1',
      name: 'Test',
      type: 'singles',
      totalRounds: 4,
      participants: [],
      rounds: [],
    }]);
    expect(result.valid).toBe(true);
    expect(result.tournaments[0].setsPerMatch).toBe(1);
    expect(result.tournaments[0].gamesPerSet).toBe(6);
    expect(result.tournaments[0].useTiebreakGame).toBe(true);
  });

  it('partially valid array: imports valid, warns about invalid', () => {
    const result = validateImport([
      { id: '1', name: 'Good', type: 'singles', totalRounds: 4, participants: [], rounds: [] },
      { id: '2' }, // invalid - no name
    ]);
    expect(result.valid).toBe(true);
    expect(result.tournaments).toHaveLength(1);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
