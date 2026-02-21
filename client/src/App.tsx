import { useEffect, useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import { useNarrator } from './hooks/useNarrator';
import { useSoundEffects } from './hooks/useSoundEffects';
import { Lobby } from './components/Lobby';
import { WaitingRoom } from './components/WaitingRoom';
import { RoleReveal } from './components/RoleReveal';
import { NightPhase } from './components/NightPhase';
import { DayPhase } from './components/DayPhase';
import { VotingPanel } from './components/VotingPanel';
import { GameOver } from './components/GameOver';
import { NarratorDisplay } from './components/NarratorDisplay';

function App() {
  const {
    isConnected,
    gameState,
    nightPhaseData,
    votingData,
    narrationQueue,
    clearNarration,
    error,
    reconnectMessage,
    createRoom,
    joinRoom,
    startGame,
    readyForNight,
    startVoting,
    startNextNight,
    nightSelect,
    nightConfirm,
    nightUnconfirm,
    castVote,
    removeVote,
  } = useSocket();

  const narrator = useNarrator();
  const sfx = useSoundEffects();
  const prevPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    if (narrationQueue.length > 0) {
      narrator.stopNarration();
      narrator.playNarration(narrationQueue);
      clearNarration();
    }
  }, [narrationQueue, narrator.playNarration, narrator.stopNarration, clearNarration]);

  useEffect(() => {
    if (gameState?.phase && gameState.phase !== prevPhaseRef.current) {
      sfx.playPhaseSound(gameState.phase);
      prevPhaseRef.current = gameState.phase;
    }
  }, [gameState?.phase, sfx.playPhaseSound]);

  const handleStartGame = async () => {
    const result = await startGame();
    if (!result.success) {
      alert(result.error || 'Failed to start game');
    }
  };

  const handlePlayAgain = () => {
    localStorage.removeItem('mafia_token');
    localStorage.removeItem('mafia_playerId');
    localStorage.removeItem('mafia_roomCode');
    window.location.reload();
  };

  const renderPhase = () => {
    if (!gameState) {
      return (
        <Lobby
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          isConnected={isConnected}
        />
      );
    }

    switch (gameState.phase) {
      case 'lobby':
        return (
          <WaitingRoom
            gameState={gameState}
            onStartGame={handleStartGame}
          />
        );

      case 'role_reveal':
        return (
          <RoleReveal
            gameState={gameState}
            onReady={readyForNight}
          />
        );

      case 'night_mafia':
      case 'night_doctor':
      case 'night_detective':
        return (
          <NightPhase
            gameState={gameState}
            nightData={nightPhaseData}
            onSelect={nightSelect}
            onConfirm={nightConfirm}
            onUnconfirm={nightUnconfirm}
          />
        );

      case 'day_discussion':
        return (
          <DayPhase
            gameState={gameState}
            onStartVoting={startVoting}
            onStartNextNight={startNextNight}
          />
        );

      case 'day_voting':
        return (
          <VotingPanel
            gameState={gameState}
            votingData={votingData}
            onVote={castVote}
            onRemoveVote={removeVote}
          />
        );

      case 'game_over':
        return (
          <GameOver
            gameState={gameState}
            onPlayAgain={handlePlayAgain}
          />
        );

      default:
        return (
          <Lobby
            onCreateRoom={createRoom}
            onJoinRoom={joinRoom}
            isConnected={isConnected}
          />
        );
    }
  };

  return (
    <div className="relative">
      <NarratorDisplay text={narrator.currentText} isSpeaking={narrator.isSpeaking} />

      {renderPhase()}

      {/* Connection error toast */}
      {error && (
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <div className="max-w-md mx-auto bg-red-900/90 border border-red-500/50 text-red-200 rounded-xl p-3 text-center text-sm font-body backdrop-blur-sm">
            {error}
          </div>
        </div>
      )}

      {/* Reconnect message toast */}
      {reconnectMessage && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
          <div className="max-w-md mx-auto bg-midnight-800/90 border border-gold-500/30 text-gold-400 rounded-xl p-3 text-center text-sm font-body backdrop-blur-sm">
            {reconnectMessage}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
