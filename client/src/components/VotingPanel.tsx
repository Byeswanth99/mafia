import { ClientGameState, VotingData, ROLE_INFO } from '../types/game';
import { Timer } from './Timer';

interface VotingPanelProps {
  gameState: ClientGameState;
  votingData: VotingData | null;
  onVote: (targetId: string) => void;
  onRemoveVote: () => void;
}

export function VotingPanel({ gameState, votingData, onVote, onRemoveVote }: VotingPanelProps) {
  const amDead = !gameState.players.find(p => p.id === gameState.myId)?.isAlive;
  const alivePlayers = gameState.players.filter(p => p.isAlive);
  const myVote = votingData?.votes[gameState.myId] || null;

  const voteCounts: Record<string, { count: number; voters: string[] }> = {};
  if (votingData) {
    for (const [voterId, targetId] of Object.entries(votingData.votes)) {
      if (!voteCounts[targetId]) voteCounts[targetId] = { count: 0, voters: [] };
      voteCounts[targetId].count++;
      const voter = gameState.players.find(p => p.id === voterId);
      if (voter) voteCounts[targetId].voters.push(voter.name);
    }
  }

  const totalVotes = votingData ? Object.keys(votingData.votes).length : 0;
  const totalAlive = alivePlayers.length;

  const hasTie = (() => {
    if (totalVotes < totalAlive) return false;
    const counts = Object.values(voteCounts).map(v => v.count);
    const maxCount = Math.max(...counts, 0);
    return counts.filter(c => c === maxCount).length > 1;
  })();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-red-50 to-orange-50 p-4">
      <div className="max-w-lg mx-auto pt-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🗳️</div>
          <h2 className="font-display text-2xl font-bold text-midnight-900">
            Vote to Eliminate
          </h2>
          <Timer startTime={gameState.phaseStartTime} />
          <p className="text-midnight-600 font-body text-sm mt-2">
            {totalVotes}/{totalAlive} votes cast
          </p>
        </div>

        {/* Tie warning */}
        {hasTie && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-6 text-center animate-shake">
            <p className="font-display font-bold text-yellow-800">⚠️ Tie detected!</p>
            <p className="text-yellow-700 font-body text-sm mt-1">
              Change your votes to break the tie. Voting continues until resolved.
            </p>
          </div>
        )}

        {/* Voting grid */}
        {!amDead ? (
          <div className="space-y-3 mb-6">
            {alivePlayers
              .filter(p => p.id !== gameState.myId)
              .map(player => {
                const isMyVote = myVote === player.id;
                const playerVotes = voteCounts[player.id];

                return (
                  <div
                    key={player.id}
                    onClick={() => isMyVote ? onRemoveVote() : onVote(player.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      isMyVote
                        ? 'border-red-400 bg-red-50 shadow-lg shadow-red-200/50'
                        : 'border-gray-200 bg-white hover:border-red-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">👤</span>
                        <div>
                          <p className="font-body font-medium text-midnight-900">
                            {player.name}
                          </p>
                          {playerVotes && playerVotes.voters.length > 0 && (
                            <p className="text-gray-500 font-body text-xs mt-0.5">
                              Voted by: {playerVotes.voters.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {playerVotes && (
                          <span className={`font-display font-bold text-lg ${
                            isMyVote ? 'text-red-500' : 'text-gray-400'
                          }`}>
                            {playerVotes.count}
                          </span>
                        )}
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isMyVote
                            ? 'border-red-400 bg-red-400'
                            : 'border-gray-300'
                        }`}>
                          {isMyVote && <span className="text-white text-xs">✓</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-8 mb-6">
            <div className="text-4xl mb-3">💀</div>
            <p className="text-gray-500 font-body">Watching the vote from the graveyard...</p>
          </div>
        )}

        {/* Vote summary */}
        {!amDead && myVote && (
          <div className="bg-white/80 border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-midnight-800 font-body text-sm">
              Your vote: <span className="font-bold text-red-600">
                {gameState.players.find(p => p.id === myVote)?.name}
              </span>
            </p>
            <button
              onClick={onRemoveVote}
              className="text-gray-500 hover:text-red-500 font-body text-xs mt-1 transition-colors"
            >
              Remove vote
            </button>
          </div>
        )}

        {/* Dead players graveyard */}
        {gameState.players.filter(p => !p.isAlive).length > 0 && (
          <div className="mt-8">
            <h3 className="font-display text-sm font-bold text-gray-500 mb-3">
              Graveyard
            </h3>
            <div className="flex flex-wrap gap-2">
              {gameState.players.filter(p => !p.isAlive).map(player => (
                <span
                  key={player.id}
                  className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-body"
                >
                  💀 {player.name} {player.role && `(${ROLE_INFO[player.role].label})`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
