/** Print-ready page: assembles format-specific print sections. */
import { useParams, Link } from 'react-router-dom';
import { useTournamentStore } from '@/store/tournament-store';
import { PrintHeader } from './print/PrintHeader';
import { PrintRoundRobinSection } from './print/PrintRoundRobinSection';
import { PrintSwissSection } from './print/PrintSwissSection';
import { PrintBracketSection } from './print/PrintBracketSection';
import { printStyles } from './print/printStyles';

export function PrintPage() {
  const { id } = useParams<{ id: string }>();
  const tournament = useTournamentStore((s) => s.tournaments.find((t) => t.id === id));

  if (!tournament) {
    return (
      <div className="p-8 text-center">
        <p>大会が見つかりません</p>
        <Link to="/">ホームに戻る</Link>
      </div>
    );
  }

  const format = tournament.format || 'swiss';

  return (
    <>
      <style>{printStyles}</style>
      <div className="print-page">
        <PrintHeader tournament={tournament} />

        {format === 'round_robin_knockout' && <PrintRoundRobinSection tournament={tournament} />}
        {format === 'swiss' && <PrintSwissSection tournament={tournament} />}
        {format === 'single_elimination' && <PrintBracketSection tournament={tournament} />}
      </div>
    </>
  );
}
