/** Bracket print section: single-elimination tree, empty bracket, and consolation. */
import { getParticipantName } from '@/lib/participant-utils';
import { getRoundLabel } from '@/lib/knockout-bracket';
import type { Tournament, KnockoutBracket } from '@/types';

interface BracketPrintProps {
  tournament: Tournament;
}

export function PrintBracketSection({ tournament }: BracketPrintProps) {
  return (
    <>
      {tournament.bracket ? (
        <>
          <h2 className="section-title">トーナメント表</h2>
          <BracketTree bracket={tournament.bracket} tournament={tournament} />
        </>
      ) : (
        <>
          <h2 className="section-title">トーナメント表</h2>
          <EmptyBracket participantCount={
            tournament.participants.filter((p) => !p.withdrawn && !p.absent).length
          } />
        </>
      )}

      {tournament.consolationBracket && tournament.consolationBracket.matches.length > 0 && (
        <div className="page-break-before">
          <h2 className="section-title">コンソレーション</h2>
          <BracketTree bracket={tournament.consolationBracket} tournament={tournament} />
        </div>
      )}
    </>
  );
}

// ─── Bracket Tree Renderer ───

export function BracketTree({ bracket, tournament }: {
  bracket: KnockoutBracket;
  tournament: Tournament;
}) {
  const mainMatches = bracket.matches.filter((m) => m.position > 0);
  if (mainMatches.length === 0) return <p>ブラケットが空です</p>;

  const maxRound = Math.max(...mainMatches.map((m) => m.roundNum));
  const columns: typeof bracket.matches[] = [];

  for (let r = maxRound; r >= 1; r--) {
    columns.push(
      mainMatches.filter((m) => m.roundNum === r).sort((a, b) => a.position - b.position)
    );
  }

  const thirdPlace = bracket.matches.find((m) => m.position === -1);

  return (
    <div className="bracket-container">
      <div className="bracket-flex">
        {columns.map((matches, colIdx) => {
          const roundNum = maxRound - colIdx;
          return (
            <div key={colIdx} className="bracket-round">
              <div className="round-header">{getRoundLabel(roundNum, maxRound)}</div>
              <div className="bracket-matches">
                {matches.map((m) => {
                  const p1 = m.participant1Id ? getParticipantName(tournament, m.participant1Id) : '';
                  const p2 = m.participant2Id ? getParticipantName(tournament, m.participant2Id) : '';
                  const score = m.match?.sets.map((s) => `${s.games1}-${s.games2}`).join(' ') || '';
                  return (
                    <div key={m.id} className={`bracket-match ${m.isBye ? 'bye' : ''}`}>
                      <div className={`bracket-slot ${m.winnerId === m.participant1Id ? 'winner' : ''}`}>
                        <span className="slot-name">{p1 || '\u00A0'}</span>
                      </div>
                      <div className="bracket-score">{score || '\u00A0'}</div>
                      <div className={`bracket-slot ${m.winnerId === m.participant2Id ? 'winner' : ''}`}>
                        <span className="slot-name">{p2 || '\u00A0'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {thirdPlace && (
        <div className="third-place">
          <div className="round-header">3位決定戦</div>
          <div className="bracket-match">
            <div className={`bracket-slot ${thirdPlace.winnerId === thirdPlace.participant1Id ? 'winner' : ''}`}>
              <span className="slot-name">
                {thirdPlace.participant1Id ? getParticipantName(tournament, thirdPlace.participant1Id) : '\u00A0'}
              </span>
            </div>
            <div className="bracket-score">
              {thirdPlace.match?.sets.map((s) => `${s.games1}-${s.games2}`).join(' ') || '\u00A0'}
            </div>
            <div className={`bracket-slot ${thirdPlace.winnerId === thirdPlace.participant2Id ? 'winner' : ''}`}>
              <span className="slot-name">
                {thirdPlace.participant2Id ? getParticipantName(tournament, thirdPlace.participant2Id) : '\u00A0'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Empty bracket (for pre-tournament printing) ───

export function EmptyBracket({ participantCount }: { participantCount: number }) {
  if (participantCount < 2) return <p>参加者が不足しています</p>;

  let size = 2;
  while (size < participantCount) size *= 2;

  const totalRounds = Math.log2(size);
  const columns: number[] = [];
  for (let r = totalRounds; r >= 1; r--) {
    columns.push(Math.pow(2, r - 1));
  }

  return (
    <div className="bracket-container">
      <div className="bracket-flex">
        {columns.map((matchCount, colIdx) => {
          const roundNum = totalRounds - colIdx;
          return (
            <div key={colIdx} className="bracket-round">
              <div className="round-header">{getRoundLabel(roundNum, totalRounds)}</div>
              <div className="bracket-matches">
                {Array.from({ length: matchCount }).map((_, i) => (
                  <div key={i} className="bracket-match">
                    <div className="bracket-slot">
                      <span className="slot-name">{'\u00A0'}</span>
                    </div>
                    <div className="bracket-score">{'\u00A0'}</div>
                    <div className="bracket-slot">
                      <span className="slot-name">{'\u00A0'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
