/** Header section with tournament title, format label, and screen-only controls. */
import { Link } from 'react-router-dom';
import type { Tournament } from '@/types';

interface Props {
  tournament: Tournament;
}

export function PrintHeader({ tournament }: Props) {
  const format = tournament.format || 'swiss';

  return (
    <>
      {/* Screen-only controls */}
      <div className="no-print controls">
        <Link to={`/tournament/${tournament.id}`} className="back-link">← 戻る</Link>
        <button className="print-btn" onClick={() => window.print()}>印刷 / PDF保存</button>
      </div>

      {/* Header */}
      <div className="print-header">
        <h1>{tournament.name}</h1>
        <div className="print-meta">
          {tournament.type === 'team' ? '団体戦' : tournament.type === 'doubles' ? 'ダブルス' : 'シングルス'}
          {' / '}
          {format === 'swiss' ? 'スイスドロー' : format === 'single_elimination' ? 'トーナメント' : '予選リーグ→決勝T'}
        </div>
      </div>
    </>
  );
}
