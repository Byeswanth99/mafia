import { useState } from 'react';

interface LobbyProps {
  onCreateRoom: (name: string) => Promise<{ success: boolean; error?: string }>;
  onJoinRoom: (code: string, name: string) => Promise<{ success: boolean; error?: string }>;
  isConnected: boolean;
}

export function Lobby({ onCreateRoom, onJoinRoom, isConnected }: LobbyProps) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!playerName.trim()) { setError('Enter your name'); return; }
    setLoading(true);
    setError('');
    const result = await onCreateRoom(playerName.trim());
    if (!result.success) setError(result.error || 'Failed to create room');
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!playerName.trim()) { setError('Enter your name'); return; }
    if (!roomCode.trim()) { setError('Enter room code'); return; }
    setLoading(true);
    setError('');
    const result = await onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    if (!result.success) setError(result.error || 'Failed to join room');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-midnight-950 via-midnight-900 to-midnight-800 p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="text-7xl mb-4 animate-float">🎭</div>
          <h1 className="font-display text-5xl font-black text-white tracking-tight mb-2">
            MAFIA
          </h1>
          <p className="text-midnight-300 font-body text-lg">
            Trust no one. Suspect everyone.
          </p>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div className="bg-blood-700/30 border border-blood-500/50 rounded-lg p-3 mb-6 text-center">
            <span className="text-blood-400 text-sm">Connecting to server...</span>
          </div>
        )}

        {/* Menu */}
        {mode === 'menu' && (
          <div className="space-y-4 animate-slide-up">
            <button
              onClick={() => setMode('create')}
              disabled={!isConnected}
              className="w-full py-4 px-6 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-midnight-950 font-display font-bold text-xl rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gold-500/20"
            >
              Create Game
            </button>
            <button
              onClick={() => setMode('join')}
              disabled={!isConnected}
              className="w-full py-4 px-6 bg-midnight-700/50 hover:bg-midnight-600/50 border-2 border-midnight-500 hover:border-gold-500/50 text-white font-display font-bold text-xl rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Game
            </button>
          </div>
        )}

        {/* Create / Join Form */}
        {(mode === 'create' || mode === 'join') && (
          <div className="space-y-4 animate-slide-up">
            <div>
              <label className="block text-midnight-300 text-sm font-body mb-1.5">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (mode === 'create' ? handleCreate() : handleJoin())}
                placeholder="Enter your name..."
                maxLength={20}
                autoFocus
                className="w-full px-4 py-3 bg-midnight-800/80 border-2 border-midnight-600 focus:border-gold-500 rounded-xl text-white font-body text-lg placeholder-midnight-500 outline-none transition-colors"
              />
            </div>

            {mode === 'join' && (
              <div>
                <label className="block text-midnight-300 text-sm font-body mb-1.5">Room Code</label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  placeholder="e.g. ABC123"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-midnight-800/80 border-2 border-midnight-600 focus:border-gold-500 rounded-xl text-white font-body text-lg placeholder-midnight-500 outline-none transition-colors tracking-widest text-center font-bold uppercase"
                />
              </div>
            )}

            {error && (
              <div className="bg-blood-700/30 border border-blood-500/50 rounded-lg p-3 text-center">
                <span className="text-blood-400 text-sm">{error}</span>
              </div>
            )}

            <button
              onClick={mode === 'create' ? handleCreate : handleJoin}
              disabled={loading || !isConnected}
              className="w-full py-4 px-6 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-midnight-950 font-display font-bold text-xl rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gold-500/20"
            >
              {loading ? 'Loading...' : mode === 'create' ? 'Create Room' : 'Join Room'}
            </button>

            <button
              onClick={() => { setMode('menu'); setError(''); }}
              className="w-full py-3 text-midnight-400 hover:text-white font-body transition-colors text-sm"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
