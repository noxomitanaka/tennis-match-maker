/** Round-robin knockout print section: group grids with N×N matrix and knockout bracket. */
import { calculateStandings } from '@/lib/standings-calculator';
import { getParticipantName } from '@/lib/participant-utils';
import { BracketTree, EmptyBracket } from './PrintBracketSection';
import type { Tournament, GroupDef, Match } from '@/types';

interface Props {
  tournament: Tournament;
}

export function PrintRoundRobinSection({ tournament }: Props) {
  const config = tournament.formatConfig as { advancingPerGroup: number } | undefined;
  const advancingCount = config?.advancingPerGroup ?? 2;

  return (
    <>
      {tournament.groups && tournament.groups.map((group) => (
        <GroupGrid key={group.id} group={group} tournament={tournament} advancingCount={advancingCount} />
      ))}

      {/* Knockout bracket */}
      {tournament.bracket ? (
        <div className="page-break-before">
          <h2 className="section-title">決勝トーナメント</h2>
          <BracketTree bracket={tournament.bracket} tournament={tournament} />
        </div>
      ) : (
        <div className="page-break-before">
          <h2 className="section-title">決勝トーナメント</h2>
          <EmptyBracket participantCount={
            (tournament.groups?.length ?? 0) * advancingCount
          } />
        </div>
      )}
    </>
  );
}

// ─── Group Grid (N×N matrix) ───

function GroupGrid({ group, tournament, advancingCount }: {
  group: GroupDef;
  tournament: Tournament;
  advancingCount: number;
}) {
  const pIds = group.participantIds;
  const allMatches = group.roundRobinRounds.flatMap((r) => r.matches);

  // Build standings
  const groupTournament: Tournament = {
    ...tournament,
    participants: tournament.participants.filter((p) => pIds.includes(p.id)),
    rounds: group.roundRobinRounds,
  };
  const standings = calculateStandings(groupTournament);

  // Order participants by standings rank
  const orderedIds = standings.length > 0
    ? standings.map((s) => s.participantId)
    : pIds;

  const standingsMap = new Map(standings.map((s) => [s.participantId, s]));

  // Find match result between two participants
  const findMatch = (p1: string, p2: string): Match | undefined => {
    return allMatches.find(
      (m) =>
        (m.participant1Id === p1 && m.participant2Id === p2) ||
        (m.participant1Id === p2 && m.participant2Id === p1)
    );
  };

  // Get result from p1's perspective
  const getResult = (p1: string, p2: string): { mark: string; score: string } | null => {
    const match = findMatch(p1, p2);
    if (!match || match.winner === undefined) return null;

    const isP1First = match.participant1Id === p1;
    const won = isP1First ? match.winner === 1 : match.winner === 2;
    const mark = won ? '○' : '●';

    let score = '';
    if (match.sets.length > 0) {
      score = match.sets.map((s) => {
        const g1 = isP1First ? s.games1 : s.games2;
        const g2 = isP1First ? s.games2 : s.games1;
        return `${g1}-${g2}`;
      }).join(' ');
    }

    return { mark, score };
  };

  return (
    <div className="group-section">
      <h2 className="group-title">{group.name}</h2>
      <table className="league-grid">
        <thead>
          <tr>
            <th className="name-col"></th>
            {orderedIds.map((_, i) => (
              <th key={i} className="match-col">{String.fromCharCode(65 + i)}</th>
            ))}
            <th className="stat-col">勝</th>
            <th className="stat-col">負</th>
            <th className="stat-col">得失</th>
            <th className="stat-col">順位</th>
          </tr>
        </thead>
        <tbody>
          {orderedIds.map((pid, rowIdx) => {
            const s = standingsMap.get(pid);
            const name = getParticipantName(tournament, pid);
            const rank = s?.rank ?? rowIdx + 1;
            const isAdvancing = rank <= advancingCount;

            return (
              <tr key={pid} className={isAdvancing ? 'advancing' : ''}>
                <td className="name-cell">
                  <span className="player-label">{String.fromCharCode(65 + rowIdx)}</span>
                  <span className="player-name">{name}</span>
                </td>
                {orderedIds.map((opId, colIdx) => {
                  if (rowIdx === colIdx) {
                    return <td key={opId} className="diagonal-cell"></td>;
                  }
                  const result = getResult(pid, opId);
                  return (
                    <td key={opId} className="result-cell">
                      {result ? (
                        <>
                          <span className={`result-mark ${result.mark === '○' ? 'win' : 'loss'}`}>
                            {result.mark}
                          </span>
                          {result.score && (
                            <span className="result-score">{result.score}</span>
                          )}
                        </>
                      ) : (
                        <span className="result-empty"></span>
                      )}
                    </td>
                  );
                })}
                <td className="stat-cell">{s?.wins ?? 0}</td>
                <td className="stat-cell">{s?.losses ?? 0}</td>
                <td className="stat-cell">
                  {s ? (s.gameWins - s.gameLosses > 0 ? '+' : '') + (s.gameWins - s.gameLosses) : '0'}
                </td>
                <td className="stat-cell rank">{rank}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Round schedule below grid */}
      <div className="round-schedule">
        <div className="schedule-title">対戦スケジュール</div>
        <div className="schedule-rounds">
          {group.roundRobinRounds.map((round) => (
            <div key={round.number} className="schedule-round">
              <span className="round-label">R{round.number}</span>
              {round.matches.filter((m) => !m.isBye).map((match, i) => {
                const idx1 = orderedIds.indexOf(match.participant1Id);
                const idx2 = orderedIds.indexOf(match.participant2Id!);
                return (
                  <span key={i} className="match-pair">
                    {String.fromCharCode(65 + idx1)} - {String.fromCharCode(65 + idx2)}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
