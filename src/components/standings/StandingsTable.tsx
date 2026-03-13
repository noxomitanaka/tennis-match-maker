import { calculateStandings } from '@/lib/standings-calculator';
import { getParticipantName } from '@/lib/participant-utils';
import type { Tournament } from '@/types';

interface Props {
  tournament: Tournament;
}

export function StandingsTable({ tournament }: Props) {
  const standings = calculateStandings(tournament);

  if (standings.length === 0) {
    return <p className="text-sm text-muted-foreground">{tournament.type === 'team' ? 'チームがありません' : '参加者がいません'}</p>;
  }

  const isTeam = tournament.type === 'team';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 px-2 w-10">#</th>
            <th className="py-2 px-2">名前</th>
            <th className="py-2 px-2 text-center">勝</th>
            <th className="py-2 px-2 text-center">敗</th>
            <th className="py-2 px-2 text-center">セット差</th>
            <th className="py-2 px-2 text-center">ゲーム差</th>
            {isTeam && <th className="py-2 px-2 text-center">TP</th>}
          </tr>
        </thead>
        <tbody>
          {standings.map((entry) => (
            <tr key={entry.participantId} className="border-b border-border/50 hover:bg-muted/50">
              <td className="py-2 px-2 font-medium">{entry.rank}</td>
              <td className="py-2 px-2">{getParticipantName(tournament, entry.participantId)}</td>
              <td className="py-2 px-2 text-center">{entry.wins}</td>
              <td className="py-2 px-2 text-center">{entry.losses}</td>
              <td className="py-2 px-2 text-center">
                {entry.setWins - entry.setLosses > 0 ? '+' : ''}{entry.setWins - entry.setLosses}
              </td>
              <td className="py-2 px-2 text-center">
                {entry.gameWins - entry.gameLosses > 0 ? '+' : ''}{entry.gameWins - entry.gameLosses}
              </td>
              {isTeam && <td className="py-2 px-2 text-center">{entry.teamPoints}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
