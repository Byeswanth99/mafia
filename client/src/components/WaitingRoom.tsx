import { ClientGameState } from '../types/game';

interface WaitingRoomProps {
  gameState: ClientGameState;
  onStartGame: () => void;
}

export function WaitingRoom({ gameState, onStartGame }: WaitingRoomProps) {
  const isHost = gameState.myId === gameState.hostId;
  const playerCount = gameState.players.length;
  const canStart = playerCount >= 5;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(gameState.roomCode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-midnight-950 via-midnight-900 to-midnight-800 p-4">
      <div className="max-w-lg mx-auto pt-8 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎭</div>
          <h2 className="font-display text-2xl font-bold text-white mb-1">Waiting Room</h2>
          <p className="text-midnight-300 font-body text-sm">Share the code with your friends</p>
        </div>

        {/* Room Code */}
        <div
          onClick={copyRoomCode}
          className="bg-midnight-800/60 border-2 border-gold-500/30 rounded-2xl p-6 mb-8 text-center cursor-pointer hover:border-gold-500/60 transition-colors group"
        >
          <p className="text-midnight-400 text-xs uppercase tracking-widest mb-2 font-body">Room Code</p>
          <p className="font-display text-4xl font-black text-gold-400 tracking-[0.3em] group-hover:text-gold-300 transition-colors">
            {gameState.roomCode}
          </p>
          <p className="text-midnight-500 text-xs mt-2 font-body">Click to copy</p>
        </div>

        {/* Players List */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-display text-lg font-bold">
              Players ({playerCount})
            </h3>
            {!canStart && (
              <span className="text-midnight-400 text-xs font-body">
                Need {5 - playerCount} more
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {gameState.players.map((player, index) => (
              <div
                key={player.id}
                className="bg-midnight-800/40 border border-midnight-600/50 rounded-xl p-3 flex items-center gap-3 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-midnight-600 to-midnight-700 flex items-center justify-center text-lg">
                  {player.isHost ? '👑' : '🎭'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-body font-medium text-sm truncate">
                    {player.name}
                    {player.id === gameState.myId && (
                      <span className="text-gold-400 ml-1">(you)</span>
                    )}
                  </p>
                  {player.isHost && (
                    <p className="text-gold-500 text-xs font-body">Host</p>
                  )}
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${player.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Start Button */}
        {isHost ? (
          <button
            onClick={onStartGame}
            disabled={!canStart}
            className="w-full py-4 px-6 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-midnight-950 font-display font-bold text-xl rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gold-500/20"
          >
            {canStart ? 'Start Game' : `Need at least 5 players`}
          </button>
        ) : (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-midnight-400 font-body">
              <div className="w-2 h-2 rounded-full bg-gold-500 animate-pulse" />
              Waiting for host to start the game...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
