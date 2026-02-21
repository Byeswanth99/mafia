import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientGameState, NightPhaseData, VotingData, NarrationEvent } from '../types/game';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  gameState: ClientGameState | null;
  nightPhaseData: NightPhaseData | null;
  votingData: VotingData | null;
  narrationQueue: NarrationEvent[];
  clearNarration: () => void;
  error: string | null;
  reconnectMessage: string | null;
  createRoom: (playerName: string) => Promise<{ success: boolean; roomCode?: string; playerId?: string; token?: string; error?: string }>;
  joinRoom: (roomCode: string, playerName: string) => Promise<{ success: boolean; roomCode?: string; playerId?: string; token?: string; error?: string }>;
  rejoinRoom: (token: string) => Promise<{ success: boolean; error?: string }>;
  startGame: () => Promise<{ success: boolean; error?: string }>;
  readyForNight: () => void;
  startVoting: () => void;
  startNextNight: () => void;
  nightSelect: (targetId: string) => void;
  nightConfirm: () => void;
  nightUnconfirm: () => void;
  castVote: (targetId: string) => void;
  removeVote: () => void;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [nightPhaseData, setNightPhaseData] = useState<NightPhaseData | null>(null);
  const [votingData, setVotingData] = useState<VotingData | null>(null);
  const [narrationQueue, setNarrationQueue] = useState<NarrationEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reconnectMessage, setReconnectMessage] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);

      const token = localStorage.getItem('mafia_token');
      if (token) {
        socket.emit('rejoinRoom', { token }, (response: any) => {
          if (response.success) {
            setGameState(response.gameState);
            setReconnectMessage('Reconnected to your game!');
            setTimeout(() => setReconnectMessage(null), 3000);
          } else {
            localStorage.removeItem('mafia_token');
            localStorage.removeItem('mafia_playerId');
            localStorage.removeItem('mafia_roomCode');
          }
        });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      setError('Connection failed. Retrying...');
    });

    socket.on('gameState', (state: ClientGameState) => {
      setGameState(state);
    });

    socket.on('nightPhaseUpdate', (data: NightPhaseData) => {
      setNightPhaseData(data);
    });

    socket.on('votingUpdate', (data: VotingData) => {
      setVotingData(data);
    });

    socket.on('narration', (events: NarrationEvent[]) => {
      setNarrationQueue(events);
    });

    socket.on('playerReconnected', (data: { playerName: string }) => {
      setReconnectMessage(`${data.playerName} reconnected!`);
      setTimeout(() => setReconnectMessage(null), 3000);
    });

    socket.on('playerDisconnected', (data: { playerName: string }) => {
      setReconnectMessage(`${data.playerName} disconnected...`);
      setTimeout(() => setReconnectMessage(null), 3000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((playerName: string): Promise<any> => {
    return new Promise((resolve) => {
      socketRef.current?.emit('createRoom', { playerName }, (response: any) => {
        if (response.success) {
          localStorage.setItem('mafia_token', response.token);
          localStorage.setItem('mafia_playerId', response.playerId);
          localStorage.setItem('mafia_roomCode', response.roomCode);
          setGameState(response.gameState);
        }
        resolve(response);
      });
    });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string): Promise<any> => {
    return new Promise((resolve) => {
      socketRef.current?.emit('joinRoom', { roomCode, playerName }, (response: any) => {
        if (response.success) {
          localStorage.setItem('mafia_token', response.token);
          localStorage.setItem('mafia_playerId', response.playerId);
          localStorage.setItem('mafia_roomCode', response.roomCode);
          setGameState(response.gameState);
        }
        resolve(response);
      });
    });
  }, []);

  const rejoinRoom = useCallback((token: string): Promise<any> => {
    return new Promise((resolve) => {
      socketRef.current?.emit('rejoinRoom', { token }, (response: any) => {
        if (response.success) {
          setGameState(response.gameState);
        }
        resolve(response);
      });
    });
  }, []);

  const startGame = useCallback((): Promise<any> => {
    return new Promise((resolve) => {
      socketRef.current?.emit('startGame', (response: any) => {
        resolve(response);
      });
    });
  }, []);

  const readyForNight = useCallback(() => {
    socketRef.current?.emit('readyForNight');
  }, []);

  const startVoting = useCallback(() => {
    socketRef.current?.emit('startVoting');
  }, []);

  const startNextNight = useCallback(() => {
    socketRef.current?.emit('startNextNight');
  }, []);

  const nightSelect = useCallback((targetId: string) => {
    socketRef.current?.emit('nightSelect', { targetId });
  }, []);

  const nightConfirm = useCallback(() => {
    socketRef.current?.emit('nightConfirm');
  }, []);

  const nightUnconfirm = useCallback(() => {
    socketRef.current?.emit('nightUnconfirm');
  }, []);

  const castVote = useCallback((targetId: string) => {
    socketRef.current?.emit('castVote', { targetId });
  }, []);

  const removeVote = useCallback(() => {
    socketRef.current?.emit('removeVote');
  }, []);

  const clearNarration = useCallback(() => {
    setNarrationQueue([]);
  }, []);

  return {
    socket: socketRef.current,
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
    rejoinRoom,
    startGame,
    readyForNight,
    startVoting,
    startNextNight,
    nightSelect,
    nightConfirm,
    nightUnconfirm,
    castVote,
    removeVote,
  };
}
