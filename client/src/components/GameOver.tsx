import { ClientGameState, ROLE_INFO } from '../types/game';

interface GameOverProps {
  gameState: ClientGameState;
  onPlayAgain: () => void;
}

export function GameOver({ gameState, onPlayAgain }: GameOverProps) {
  const isHost = gameState.myId === gameState.hostId;
  const myRole = gameState.myRole;
  const winners = gameState.winners;

  const didIWin =
    (winners === 'town' && myRole !== 'mafia') ||
    (winners === 'mafia' && myRole === 'mafia');

  const mafiaPlayers = gameState.players.filter(p => p.role === 'mafia');
  const townPlayers = gameState.players.filter(p => p.role !== 'mafia');

  return (
    <div className={`min-h-screen p-4 ${
      winners === 'town'
        ? 'bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-900'
        : 'bg-gradient-to-b from-red-950 via-red-900 to-midnight-950'
    }`}>
      <div className="max-w-lg mx-auto pt-8 animate-fade-in">
        {/* Result Banner */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-4">
            {winners === 'town' ? '🏛️' : '🔪'}
          </div>
          <h1 className="font-display text-4xl font-black text-white mb-2">
            {winners === 'town' ? 'Town Wins!' : 'Mafia Wins!'}
          </h1>
          <p className={`font-body text-lg ${
            didIWin ? 'text-green-400' : 'text-red-400'
          }`}>
            {didIWin ? '🎉 You won!' : '💀 You lost!'}
          </p>
          <p className="text-white/60 font-body text-sm mt-2">
            You were {myRole && ROLE_INFO[myRole] ? `${ROLE_INFO[myRole].emoji} ${ROLE_INFO[myRole].label}` : 'Unknown'}
          </p>
        </div>

        {/* Full Role Reveal */}
        <div className="mb-8">
          <h3 className="font-display text-xl font-bold text-white mb-4 text-center">
            All Roles Revealed
          </h3>

          {/* Mafia Team */}
          <div className="mb-4">
            <p className="text-red-400 font-display font-bold text-sm mb-2 uppercase tracking-wider">
              🔪 Mafia
            </p>
            <div className="space-y-2">
              {mafiaPlayers.map(player => (
                <div
                  key={player.id}
                  className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{player.isAlive ? '🔪' : '💀'}</span>
                    <span className="text-white font-body font-medium">
                      {player.name}
                      {player.id === gameState.myId && (
                        <span className="text-red-400 ml-1">(you)</span>
                      )}
                    </span>
                  </div>
                  <span className={`text-xs font-body ${player.isAlive ? 'text-green-400' : 'text-red-400'}`}>
                    {player.isAlive ? 'Survived' : 'Eliminated'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Town Team */}
          <div>
            <p className="text-blue-400 font-display font-bold text-sm mb-2 uppercase tracking-wider">
              🏛️ Town
            </p>
            <div className="space-y-2">
              {townPlayers.map(player => (
                <div
                  key={player.id}
                  className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {player.role ? ROLE_INFO[player.role].emoji : '👤'}
                    </span>
                    <div>
                      <span className="text-white font-body font-medium">
                        {player.name}
                        {player.id === gameState.myId && (
                          <span className="text-blue-400 ml-1">(you)</span>
                        )}
                      </span>
                      <span className="text-blue-300/60 font-body text-xs ml-2">
                        {player.role && ROLE_INFO[player.role].label}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-body ${player.isAlive ? 'text-green-400' : 'text-red-400'}`}>
                    {player.isAlive ? 'Survived' : 'Eliminated'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Game Stats */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8 text-center">
          <h3 className="text-white/60 font-body text-xs uppercase tracking-wider mb-3">Game Stats</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-display font-bold text-white">{gameState.round}</p>
              <p className="text-white/40 font-body text-xs">Rounds</p>
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-white">{gameState.players.length}</p>
              <p className="text-white/40 font-body text-xs">Players</p>
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-white">
                {gameState.players.filter(p => !p.isAlive).length}
              </p>
              <p className="text-white/40 font-body text-xs">Eliminated</p>
            </div>
          </div>
        </div>

        {/* Play Again */}
        {isHost && (
          <button
            onClick={onPlayAgain}
            className="w-full py-4 px-6 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-midnight-950 font-display font-bold text-xl rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-gold-500/20"
          >
            Back to Lobby
          </button>
        )}
      </div>
    </div>
  );
}
