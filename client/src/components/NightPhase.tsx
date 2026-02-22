import { useMemo, useRef, useEffect, useState } from 'react';
import { ClientGameState, NightPhaseData, ROLE_INFO } from '../types/game';

interface NightPhaseProps {
  gameState: ClientGameState;
  nightData: NightPhaseData | null;
  nightChatMessages: { playerName: string; text: string; ts: number }[];
  onSelect: (targetId: string) => void;
  onConfirm: () => void;
  onUnconfirm: () => void;
  onSendChat: (text: string) => void;
}

export function NightPhase({ gameState, nightData, nightChatMessages, onSelect, onConfirm, onUnconfirm, onSendChat }: NightPhaseProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [nightChatMessages]);
  const myRole = gameState.myRole;
  const phase = gameState.phase;

  const isMyTurn =
    (phase === 'night_mafia' && myRole === 'mafia') ||
    (phase === 'night_doctor' && myRole === 'doctor') ||
    (phase === 'night_detective' && myRole === 'detective');

  const amDead = !gameState.players.find(p => p.id === gameState.myId)?.isAlive;

  const mySelection = nightData?.selections[gameState.myId] || null;
  const amConfirmed = nightData?.confirmed.includes(gameState.myId) || false;

  const activeRoleLabel =
    phase === 'night_mafia' ? 'Mafia' :
    phase === 'night_doctor' ? 'Doctor' :
    phase === 'night_detective' ? 'Detective' : '';

  const starPositions = useMemo(() =>
    Array.from({ length: 30 }).map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
    })),
  []);

  const selectablePlayers = nightData?.alivePlayers.filter(p => {
    if (p.id === gameState.myId && myRole !== 'doctor') return false;
    if (myRole === 'mafia' && p.role === 'mafia') return false;
    return true;
  }) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050510] via-[#0a0a20] to-[#0e0e24] p-4 relative overflow-hidden">
      {/* Stars background */}
      <div className="absolute inset-0 pointer-events-none">
        {starPositions.map((pos, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-flicker"
            style={{ left: pos.left, top: pos.top, animationDelay: pos.delay }}
          />
        ))}
      </div>

      <div className="max-w-lg mx-auto pt-6 relative z-10">
        {/* Night Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🌙</div>
          <h2 className="font-display text-2xl font-bold text-white">
            Night {gameState.round}
          </h2>
          <p className="text-midnight-400 font-body text-sm mt-1">
            {activeRoleLabel} is making their choice...
          </p>
        </div>

        {/* Dead player view */}
        {amDead && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">💀</div>
            <p className="text-midnight-300 font-body text-lg">You are dead. Watching from the beyond...</p>
          </div>
        )}

        {/* Sleeping view — not your turn and alive */}
        {!isMyTurn && !amDead && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 animate-float">😴</div>
            <p className="text-midnight-300 font-body text-lg">You are asleep...</p>
            <p className="text-midnight-500 font-body text-sm mt-2">
              {myRole && ROLE_INFO[myRole] ? `Your role: ${ROLE_INFO[myRole].emoji} ${ROLE_INFO[myRole].label}` : ''}
            </p>
          </div>
        )}

        {/* Active role view */}
        {isMyTurn && !amDead && nightData && (
          <div className="space-y-4 animate-fade-in">
            {/* Role badge */}
            <div className="text-center mb-4">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-midnight-800/60 border border-midnight-600/50 ${ROLE_INFO[myRole!].color} font-body font-medium`}>
                {ROLE_INFO[myRole!].emoji} {ROLE_INFO[myRole!].label}
              </span>
            </div>

            {/* Instruction */}
            <p className="text-center text-midnight-200 font-body text-sm mb-4">
              {myRole === 'mafia' && 'Choose a player to eliminate'}
              {myRole === 'doctor' && 'Choose a player to save'}
              {myRole === 'detective' && 'Choose a player to investigate'}
            </p>

            {/* Detective result */}
            {myRole === 'detective' && nightData.detectiveResult !== undefined && amConfirmed && (
              <div className={`text-center p-4 rounded-xl border-2 mb-4 ${
                nightData.detectiveResult
                  ? 'bg-blood-700/20 border-blood-500/50 text-blood-400'
                  : 'bg-green-900/20 border-green-500/50 text-green-400'
              }`}>
                <p className="font-display font-bold text-lg">
                  {nightData.detectiveResult ? '🔪 MAFIA!' : '✅ Not Mafia'}
                </p>
              </div>
            )}

            {/* Player selection grid */}
            <div className="grid grid-cols-2 gap-3">
              {selectablePlayers.map(player => {
                const isSelected = mySelection === player.id;
                const isSelectedByOther = Object.entries(nightData.selections)
                  .some(([pid, tid]) => pid !== gameState.myId && tid === player.id);

                return (
                  <button
                    key={player.id}
                    onClick={() => !amConfirmed && onSelect(player.id)}
                    disabled={amConfirmed}
                    className={`p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? 'border-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-400/10'
                        : isSelectedByOther
                        ? 'border-yellow-600/40 bg-yellow-600/5'
                        : 'border-midnight-600/50 bg-midnight-800/30 hover:border-midnight-400/50'
                    } ${amConfirmed ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {player.id === gameState.myId ? '🫵' : '👤'}
                      </span>
                      <span className="text-white font-body font-medium text-sm truncate">
                        {player.name}
                        {player.id === gameState.myId && ' (you)'}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="text-yellow-400 text-xs mt-1 font-body">Selected</div>
                    )}
                    {isSelectedByOther && !isSelected && (
                      <div className="text-yellow-600 text-xs mt-1 font-body">Teammate selected</div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Confirm / Done controls */}
            <div className="space-y-3 mt-6">
              {mySelection && !amConfirmed && (
                <button
                  onClick={onConfirm}
                  className="w-full py-3 px-6 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-midnight-950 font-display font-bold text-lg rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Confirm Selection
                </button>
              )}

              {amConfirmed && (
                <>
                  <div className="text-center py-2">
                    <span className="text-green-400 font-body text-sm flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      Selection confirmed
                    </span>
                  </div>
                  <button
                    onClick={onUnconfirm}
                    className="w-full py-2 px-4 text-midnight-400 hover:text-white font-body text-sm transition-colors"
                  >
                    Change my mind
                  </button>
                </>
              )}

              {/* Status indicators for multi-player roles */}
              {(() => {
                const sameRoleCount = nightData.sameRoleCount;
                const allConfirmed = nightData.confirmed.length >= sameRoleCount;

                if (amConfirmed && !allConfirmed) {
                  return (
                    <div className="text-center text-midnight-400 text-xs font-body">
                      Waiting for your teammate(s) to confirm...
                    </div>
                  );
                }

                if (amConfirmed && allConfirmed && phase === 'night_mafia' && sameRoleCount > 1) {
                  const targets = Object.values(nightData.selections);
                  const allSame = targets.every(t => t === targets[0]);
                  if (!allSame) {
                    return (
                      <div className="text-center text-blood-400 text-sm font-body animate-shake p-3 bg-blood-700/20 border border-blood-500/30 rounded-xl">
                        ⚠️ Your team selected different targets! Change selections to agree.
                      </div>
                    );
                  }
                }

                return null;
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
