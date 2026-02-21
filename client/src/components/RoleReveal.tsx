import { useState } from 'react';
import { ClientGameState, ROLE_INFO } from '../types/game';

interface RoleRevealProps {
  gameState: ClientGameState;
  onReady: () => void;
}

export function RoleReveal({ gameState, onReady }: RoleRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const isHost = gameState.myId === gameState.hostId;
  const role = gameState.myRole;

  if (!role) return null;

  const info = ROLE_INFO[role];

  const mafiaTeammates = role === 'mafia'
    ? gameState.players.filter(p => p.role === 'mafia' && p.id !== gameState.myId)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-midnight-950 via-midnight-900 to-midnight-800 flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center animate-fade-in">
        {!revealed ? (
          <div className="space-y-8">
            <div className="text-6xl animate-float">🃏</div>
            <h2 className="font-display text-3xl font-bold text-white">Your Role Awaits</h2>
            <p className="text-midnight-300 font-body">Tap the card to reveal your identity</p>
            <button
              onClick={() => setRevealed(true)}
              className="w-48 h-64 mx-auto bg-gradient-to-br from-midnight-700 to-midnight-800 border-2 border-gold-500/40 rounded-2xl flex items-center justify-center hover:border-gold-400 transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-gold-500/10 cursor-pointer animate-pulse-glow"
            >
              <span className="text-6xl">❓</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-card-flip">
            <div className="text-7xl">{info.emoji}</div>
            <h2 className={`font-display text-4xl font-black ${info.color}`}>
              {info.label}
            </h2>
            <p className="text-midnight-200 font-body text-lg leading-relaxed">
              {info.description}
            </p>

            {mafiaTeammates.length > 0 && (
              <div className="bg-blood-700/20 border border-blood-500/30 rounded-xl p-4 mt-4">
                <p className="text-blood-400 text-sm font-body mb-2">Your fellow Mafia:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {mafiaTeammates.map(p => (
                    <span key={p.id} className="bg-blood-700/30 text-blood-400 px-3 py-1 rounded-full text-sm font-body font-medium">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {isHost ? (
              <button
                onClick={onReady}
                className="w-full py-4 px-6 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-midnight-950 font-display font-bold text-lg rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-gold-500/20 mt-6"
              >
                Start Night Phase
              </button>
            ) : (
              <div className="text-midnight-400 font-body text-sm mt-6">
                <div className="inline-flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gold-500 animate-pulse" />
                  Waiting for host to begin...
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
