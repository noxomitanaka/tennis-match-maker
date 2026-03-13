/** Swiss-draw print section: per-round pairings and standings table. */
import { calculateStandings } from '@/lib/standings-calculator';
import { getParticipantName } from '@/lib/participant-utils';
import type { Tournament, StandingEntry } from '@/types';

interface Props {
  tournament: Tournament;
}

export function PrintSwissSection({ tournament }: Props) {
  const standings = calculateStandings(tournament);
  const getName = (pid: string) => getParticipantName(tournament, pid);

  return (
    <>
      {/* Per-round pairings */}
      {tournament.rounds.map((round) => (
        <div key={round.number} className="swiss-round">
          <h2 className="section-title">ラウンド {round.number}</h2>
          <table className="pairing-table">
            <thead>
              <tr>
                <th className="match-num">#</th>
                <th className="player-col">
                  {tournament.type === 'team' ? 'チーム1' : '選手1'}
                </th>
                <th className="score-col">スコア</th>
                <th className="player-col">
                  {tournament.type === 'team' ? 'チーム2' : '選手2'}
                </th>
              </tr>
            </thead>
            <tbody>
              {round.matches.map((match, i) => {
                const scoreText = match.sets.length > 0
                  ? match.sets.map((s) => `${s.games1}-${s.games2}`).join(', ')
                  : '';
                return (
                  <tr key={match.id}>
                    <td className="match-num">{i + 1}</td>
                    <td className={`player-col ${match.winner === 1 ? 'winner' : ''}`}>
                      {getName(match.participant1Id)}
                    </td>
                    <td className="score-col">
                      {match.isBye ? 'BYE' : scoreText || 'vs'}
                    </td>
                    <td className={`player-col ${match.winner === 2 ? 'winner' : ''}`}>
                      {match.participant2Id ? getName(match.participant2Id) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {/* Standings table */}
      <div className="swiss-standings">
        <h2 className="section-title">順位表</h2>
        <SwissStandingsTable standings={standings} tournament={tournament} />
      </div>
    </>
  );
}

function SwissStandingsTable({ standings, tournament }: {
  standings: StandingEntry[];
  tournament: Tournament;
}) {
  const isTeam = tournament.type === 'team';
  return (
    <table className="standings-table">
      <thead>
        <tr>
          <th>#</th>
          <th className="name-col">名前</th>
          <th>勝</th>
          <th>負</th>
          <th>セット差</th>
          <th>ゲーム差</th>
          {isTeam && <th>TP</th>}
        </tr>
      </thead>
      <tbody>
        {standings.map((s) => (
          <tr key={s.participantId}>
            <td>{s.rank}</td>
            <td className="name-col">{getParticipantName(tournament, s.participantId)}</td>
            <td>{s.wins}</td>
            <td>{s.losses}</td>
            <td>{(s.setWins - s.setLosses > 0 ? '+' : '') + (s.setWins - s.setLosses)}</td>
            <td>{(s.gameWins - s.gameLosses > 0 ? '+' : '') + (s.gameWins - s.gameLosses)}</td>
            {isTeam && <td>{s.teamPoints}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
