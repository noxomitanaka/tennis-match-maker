import type { Tournament } from '@/types';

export interface ImportValidationResult {
  valid: boolean;
  tournaments: Tournament[];
  errors: string[];
  warnings: string[];
}

export function validateImport(data: unknown): ImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(data)) {
    return { valid: false, tournaments: [], errors: ['JSONの形式が不正です。大会データの配列が必要です。'], warnings: [] };
  }

  if (data.length === 0) {
    return { valid: false, tournaments: [], errors: ['空の配列です。大会データが含まれていません。'], warnings: [] };
  }

  const validTournaments: Tournament[] = [];

  for (let i = 0; i < data.length; i++) {
    const t = data[i];
    const prefix = `大会${i + 1}`;

    if (typeof t !== 'object' || t === null) {
      errors.push(`${prefix}: オブジェクトではありません`);
      continue;
    }

    const obj = t as Record<string, unknown>;

    // Required fields
    if (!obj.id || typeof obj.id !== 'string') {
      errors.push(`${prefix}: IDがありません`);
      continue;
    }
    if (!obj.name || typeof obj.name !== 'string') {
      errors.push(`${prefix}: 大会名がありません`);
      continue;
    }
    if (!['singles', 'doubles', 'team'].includes(obj.type as string)) {
      errors.push(`${prefix}: type が不正です（${String(obj.type)}）`);
      continue;
    }
    if (typeof obj.totalRounds !== 'number' || obj.totalRounds < 0) {
      errors.push(`${prefix}: totalRounds が不正です`);
      continue;
    }
    if (!Array.isArray(obj.participants)) {
      errors.push(`${prefix}: participants がありません`);
      continue;
    }
    if (!Array.isArray(obj.rounds)) {
      errors.push(`${prefix}: rounds がありません`);
      continue;
    }

    // Validate participants have ids and names
    for (let j = 0; j < obj.participants.length; j++) {
      const p = obj.participants[j] as Record<string, unknown>;
      if (!p || !p.id || !p.name) {
        warnings.push(`${prefix}: 参加者${j + 1}のデータが不完全です`);
      }
    }

    // Validate rounds have matches
    for (let j = 0; j < obj.rounds.length; j++) {
      const r = obj.rounds[j] as Record<string, unknown>;
      if (!r || !Array.isArray(r.matches)) {
        warnings.push(`${prefix}: ラウンド${j + 1}の試合データが不完全です`);
      }
    }

    // Set defaults for optional fields
    if (typeof obj.setsPerMatch !== 'number') obj.setsPerMatch = 1;
    if (typeof obj.gamesPerSet !== 'number') obj.gamesPerSet = 6;
    if (typeof obj.useTiebreakGame !== 'boolean') obj.useTiebreakGame = true;
    if (!Array.isArray(obj.tiebreakCriteria)) obj.tiebreakCriteria = ['wins', 'game_diff'];
    if (!obj.status) obj.status = 'setup';
    if (!obj.createdAt) obj.createdAt = new Date().toISOString();
    if (!obj.format) obj.format = 'swiss'; // Default for legacy data

    validTournaments.push(obj as unknown as Tournament);
  }

  if (validTournaments.length === 0 && errors.length > 0) {
    return { valid: false, tournaments: [], errors, warnings };
  }

  if (validTournaments.length < data.length) {
    warnings.push(`${data.length}件中${validTournaments.length}件のみ有効です`);
  }

  return { valid: true, tournaments: validTournaments, errors, warnings };
}
