import type { TournamentFormat } from '@/types';

interface Props {
  value: TournamentFormat;
  onChange: (format: TournamentFormat) => void;
}

const FORMAT_OPTIONS: { value: TournamentFormat; label: string; description: string }[] = [
  {
    value: 'swiss',
    label: 'スイスドロー',
    description: '全員が指定ラウンド数を対戦。同程度の実力同士が当たるよう自動ペアリング',
  },
  {
    value: 'single_elimination',
    label: 'トーナメント',
    description: '負けたら終了のシングルエリミネーション。3位決定戦・コンソレーション対応',
  },
  {
    value: 'round_robin_knockout',
    label: '予選リーグ→決勝T',
    description: 'グループ内総当たり後、上位者が決勝トーナメントに進出',
  },
];

export function FormatSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      {FORMAT_OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className={`flex items-start gap-3 p-3 rounded-[var(--radius)] border cursor-pointer transition-colors ${
            value === opt.value
              ? 'border-primary bg-primary/5'
              : 'border-border hover:bg-muted/50'
          }`}
        >
          <input
            type="radio"
            name="format"
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="mt-1"
          />
          <div>
            <div className="font-medium">{opt.label}</div>
            <div className="text-sm text-muted-foreground">{opt.description}</div>
          </div>
        </label>
      ))}
    </div>
  );
}
