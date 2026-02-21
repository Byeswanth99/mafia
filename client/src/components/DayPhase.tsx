import { ClientGameState, ROLE_INFO } from '../types/game';
import { Timer } from './Timer';

interface DayPhaseProps {
  gameState: ClientGameState;
  onStartVoting: () => void;
  onStartNextNight: () => void;
}

export function DayPhase({ gameState, onStartVoting, onStartNextNight }: DayPhaseProps) {
  const isHost = gameState.myId === gameState.hostId;
  const amDead = !gameState.players.find(p => p.id === gameState.myId)?.isAlive;
  const nightResult = gameState.nightResult;
  const alivePlayers = gameState.players.filter(p => p.isAlive);
  const deadPlayers = gameState.players.filter(p => !p.isAlive);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 p-4">
      <div className="max-w-lg mx-auto pt-6">
        {/* Day Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">☀️</div>
          <h2 className="font-display text-2xl font-bold text-midnight-900">
            Day {gameState.round}
          </h2>
          <Timer startTime={gameState.phaseStartTime} />
        </div>

        {/* Vote Elimination Announcement */}
        {gameState.lastEliminatedPlayer && (
          <div className="rounded-2xl p-5 mb-6 text-center border-2 bg-red-50 border-red-200">
            <div className="text-3xl mb-2">⚖️</div>
            <p className="font-display text-xl font-bold text-red-800 mb-1">
              {gameState.lastEliminatedPlayer.name} was eliminated
            </p>
            <p className="text-red-600 font-body text-sm">
              They were a {ROLE_INFO[gameState.lastEliminatedPlayer.role].emoji} {ROLE_INFO[gameState.lastEliminatedPlayer.role].label}
            </p>
          </div>
        )}

        {/* Night Result Announcement */}
        {nightResult && !gameState.lastEliminatedPlayer && (
          <div className={`rounded-2xl p-5 mb-6 text-center border-2 ${
            nightResult.killedPlayer
              ? 'bg-red-50 border-red-200'
              : 'bg-green-50 border-green-200'
          }`}>
            {nightResult.killedPlayer ? (
              <>
                <div className="text-3xl mb-2">💀</div>
                <p className="font-display text-xl font-bold text-red-800 mb-1">
                  {nightResult.killedPlayer.name} was killed
                </p>
                <p className="text-red-600 font-body text-sm">
                  They were a {ROLE_INFO[nightResult.killedPlayer.role].emoji} {ROLE_INFO[nightResult.killedPlayer.role].label}
                </p>
              </>
            ) : nightResult.savedByDoctor ? (
              <>
                <div className="text-3xl mb-2">💉</div>
                <p className="font-display text-xl font-bold text-green-800 mb-1">
                  Nobody died!
                </p>
                <p className="text-green-600 font-body text-sm">The doctor saved someone last night</p>
              </>
            ) : (
              <>
                <div className="text-3xl mb-2">🌅</div>
                <p className="font-display text-xl font-bold text-green-800 mb-1">
                  Peaceful night
                </p>
                <p className="text-green-600 font-body text-sm">Nobody died last night</p>
              </>
            )}
          </div>
        )}

        {/* Discussion Banner */}
        <div className="bg-white/80 border-2 border-amber-200 rounded-2xl p-4 mb-6 text-center">
          <p className="font-display text-lg font-bold text-midnight-900">
            🗣️ Discussion Time
          </p>
          <p className="text-midnight-600 font-body text-sm mt-1">
            Discuss with your town on the Zoom call. Who do you suspect?
          </p>
        </div>

        {/* Alive Players */}
        <div className="mb-6">
          <h3 className="font-display text-lg font-bold text-midnight-900 mb-3">
            Alive ({alivePlayers.length})
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {alivePlayers.map(player => (
              <div
                key={player.id}
                className="bg-white/60 border border-amber-200 rounded-xl p-3 text-center"
              >
                <div className="text-2xl mb-1">
                  {player.isHost ? '👑' : '👤'}
                </div>
                <p className="text-midnight-800 font-body text-xs font-medium truncate">
                  {player.name}
                  {player.id === gameState.myId && (
                    <span className="text-amber-600"> (you)</span>
                  )}
                </p>
                {!player.isConnected && (
                  <span className="text-red-400 text-[10px]">offline</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dead Players */}
        {deadPlayers.length > 0 && (
          <div className="mb-6">
            <h3 className="font-display text-lg font-bold text-midnight-900 mb-3">
              Graveyard ({deadPlayers.length})
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {deadPlayers.map(player => (
                <div
                  key={player.id}
                  className="bg-gray-100 border border-gray-300 rounded-xl p-3 text-center opacity-60"
                >
                  <div className="text-2xl mb-1">💀</div>
                  <p className="text-gray-600 font-body text-xs font-medium truncate">
                    {player.name}
                  </p>
                  {player.role && (
                    <p className="text-gray-500 text-[10px]">
                      {ROLE_INFO[player.role].emoji} {ROLE_INFO[player.role].label}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!amDead && isHost && gameState.lastEliminatedPlayer && (
          <button
            onClick={onStartNextNight}
            className="w-full py-4 px-6 mb-3 bg-gradient-to-r from-midnight-700 to-midnight-600 hover:from-midnight-600 hover:to-midnight-500 text-white font-display font-bold text-lg rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg border border-midnight-500"
          >
            🌙 Proceed to Night
          </button>
        )}

        {!amDead && isHost && !gameState.lastEliminatedPlayer && (
          <button
            onClick={onStartVoting}
            className="w-full py-4 px-6 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-display font-bold text-lg rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-500/20"
          >
            Start Voting
          </button>
        )}

        {!amDead && !isHost && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-amber-700 font-body text-sm">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {gameState.lastEliminatedPlayer
                ? 'Waiting for host to proceed...'
                : 'Host will start voting when discussion is over'}
            </div>
          </div>
        )}

        {amDead && (
          <div className="text-center py-4 text-gray-500 font-body text-sm">
            You are watching from the graveyard...
          </div>
        )}
      </div>
    </div>
  );
}
