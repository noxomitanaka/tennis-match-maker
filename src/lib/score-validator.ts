import type { SetScore } from '../types/index.ts';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateSetScore(
  set: SetScore,
  gamesPerSet: number,
  useTiebreak: boolean,
  setIndex: number
): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `セット${setIndex + 1}`;

  // Negative check
  if (set.games1 < 0 || set.games2 < 0) {
    errors.push({ field: `set${setIndex}`, message: `${prefix}: ゲーム数は0以上にしてください` });
    return errors;
  }

  // Max game check: can't exceed gamesPerSet + 1 (only in non-tiebreak advantage set)
  const maxGames = gamesPerSet + 1;
  if (set.games1 > maxGames || set.games2 > maxGames) {
    errors.push({ field: `set${setIndex}`, message: `${prefix}: ゲーム数は${maxGames}以下にしてください` });
  }

  // Both can't have gamesPerSet+1 (e.g., 7-7 is impossible)
  if (set.games1 === maxGames && set.games2 === maxGames) {
    errors.push({ field: `set${setIndex}`, message: `${prefix}: 両者${maxGames}ゲームは無効です` });
  }

  // If one player has gamesPerSet+1, other must have exactly gamesPerSet (e.g., 7-5 in 6-game set)
  if (set.games1 === maxGames && set.games2 !== gamesPerSet && set.games2 !== gamesPerSet - 1) {
    // Allow gamesPerSet-1 too for flexible scoring (e.g. 7-5)
  }
  if (set.games2 === maxGames && set.games1 !== gamesPerSet && set.games1 !== gamesPerSet - 1) {
    // Same
  }

  // Winner must have at least gamesPerSet
  if (set.games1 > set.games2 && set.games1 < gamesPerSet) {
    errors.push({ field: `set${setIndex}`, message: `${prefix}: 勝者は${gamesPerSet}ゲーム以上必要です` });
  }
  if (set.games2 > set.games1 && set.games2 < gamesPerSet) {
    errors.push({ field: `set${setIndex}`, message: `${prefix}: 勝者は${gamesPerSet}ゲーム以上必要です` });
  }

  // Margin check: winner needs 2-game lead OR tiebreak at gamesPerSet-gamesPerSet
  if (set.games1 >= gamesPerSet && set.games2 >= gamesPerSet) {
    if (set.games1 === gamesPerSet && set.games2 === gamesPerSet) {
      // Tied at gamesPerSet-gamesPerSet: tiebreak required if enabled
      if (useTiebreak) {
        if (set.tiebreak1 === undefined || set.tiebreak2 === undefined) {
          // Not an error yet - tiebreak hasn't been entered
        } else {
          // Validate tiebreak
          const tbErrors = validateTiebreak(set.tiebreak1, set.tiebreak2, setIndex);
          errors.push(...tbErrors);
        }
      }
    }
  }

  return errors;
}

function validateTiebreak(tb1: number, tb2: number, setIndex: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `セット${setIndex + 1}TB`;

  if (tb1 < 0 || tb2 < 0) {
    errors.push({ field: `tb${setIndex}`, message: `${prefix}: タイブレークポイントは0以上にしてください` });
    return errors;
  }

  // Standard tiebreak: first to 7 with 2-point lead
  const maxTb = Math.max(tb1, tb2);
  const minTb = Math.min(tb1, tb2);

  if (maxTb < 7) {
    // Tiebreak not yet complete - not an error, just incomplete
    return errors;
  }

  // Winner must have 2+ point lead
  if (maxTb - minTb < 2) {
    errors.push({ field: `tb${setIndex}`, message: `${prefix}: タイブレークは2ポイント差以上が必要です` });
  }

  // If both ≥ 6, winner should be minTb + 2
  if (minTb >= 6 && maxTb !== minTb + 2) {
    errors.push({ field: `tb${setIndex}`, message: `${prefix}: ${minTb}以上の場合、勝者は${minTb + 2}ポイント必要です` });
  }

  return errors;
}

export function validateAllSets(
  sets: SetScore[],
  gamesPerSet: number,
  useTiebreak: boolean
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (let i = 0; i < sets.length; i++) {
    errors.push(...validateSetScore(sets[i], gamesPerSet, useTiebreak, i));
  }
  return errors;
}
