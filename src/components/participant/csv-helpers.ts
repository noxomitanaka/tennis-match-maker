/** CSV parsing and template generation for participant import. */
import type { Tournament } from '@/types';

export interface ParsedEntry {
  name: string;
  player1?: string;
  player2?: string;
  members?: string[];
  error?: string;
}

export function generateCsvTemplate(type: Tournament['type']): string {
  const BOM = '\uFEFF'; // Excel UTF-8 BOM
  switch (type) {
    case 'singles':
      return BOM + '名前\n山田太郎\n佐藤花子\n鈴木一郎\n';
    case 'doubles':
      return BOM + '選手1,選手2\n山田太郎,佐藤花子\n鈴木一郎,高橋美咲\n';
    case 'team':
      return BOM + 'チーム名,メンバー1,メンバー2,メンバー3\n神戸FC,田中,佐藤,鈴木\n大阪ユナイテッド,高橋,渡辺,伊藤\n';
  }
}

export function downloadTemplate(type: Tournament['type']) {
  const csv = generateCsvTemplate(type);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const suffix = type === 'singles' ? 'シングルス' : type === 'doubles' ? 'ダブルス' : '団体戦';
  a.download = `参加者テンプレート_${suffix}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseCsv(text: string, type: Tournament['type']): ParsedEntry[] {
  const lines = text
    .replace(/^\uFEFF/, '') // strip BOM
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  // Skip header if it matches known patterns
  const first = lines[0].toLowerCase();
  const isHeader =
    first.includes('名前') || first.includes('選手') || first.includes('チーム') ||
    first.includes('name') || first.includes('player') || first.includes('team');
  const dataLines = isHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const cols = parseCsvLine(line);

    switch (type) {
      case 'singles': {
        const name = cols[0]?.trim();
        if (!name) return { name: '', error: '名前が空です' };
        return { name };
      }
      case 'doubles': {
        const p1 = cols[0]?.trim();
        const p2 = cols[1]?.trim();
        if (!p1 || !p2) return { name: '', error: '選手名が不足しています' };
        return { name: `${p1} / ${p2}`, player1: p1, player2: p2 };
      }
      case 'team': {
        const teamName = cols[0]?.trim();
        if (!teamName) return { name: '', error: 'チーム名が空です' };
        const members = cols.slice(1).map((c) => c.trim()).filter(Boolean);
        return { name: teamName, members };
      }
    }
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}
