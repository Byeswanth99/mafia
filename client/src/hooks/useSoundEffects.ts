import { useCallback, useRef, useEffect } from 'react';
import { GamePhase } from '../types/game';

// Generate tones using Web Audio API instead of external audio files
export function useSoundEffects() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeOscillators = useRef<OscillatorNode[]>([]);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
      activeOscillators.current.push(osc);
      osc.onended = () => {
        activeOscillators.current = activeOscillators.current.filter(o => o !== osc);
      };
    } catch {
      // Audio not supported
    }
  }, [getCtx]);

  const playNightAmbience = useCallback(() => {
    // Low eerie drone
    playTone(80, 4, 'sawtooth', 0.04);
    setTimeout(() => playTone(120, 3, 'sine', 0.03), 1000);
    setTimeout(() => playTone(60, 3, 'triangle', 0.05), 2000);
  }, [playTone]);

  const playDramaticSting = useCallback(() => {
    playTone(200, 0.8, 'sawtooth', 0.12);
    setTimeout(() => playTone(150, 1.2, 'sawtooth', 0.1), 200);
    setTimeout(() => playTone(100, 1.5, 'sawtooth', 0.08), 500);
  }, [playTone]);

  const playRevealSting = useCallback(() => {
    playTone(300, 0.3, 'square', 0.08);
    setTimeout(() => playTone(400, 0.3, 'square', 0.08), 150);
    setTimeout(() => playTone(500, 0.5, 'square', 0.06), 300);
  }, [playTone]);

  const playSavedSound = useCallback(() => {
    playTone(400, 0.3, 'sine', 0.1);
    setTimeout(() => playTone(500, 0.3, 'sine', 0.1), 200);
    setTimeout(() => playTone(600, 0.5, 'sine', 0.08), 400);
  }, [playTone]);

  const playDeathSound = useCallback(() => {
    playTone(300, 0.5, 'sawtooth', 0.1);
    setTimeout(() => playTone(200, 0.5, 'sawtooth', 0.08), 300);
    setTimeout(() => playTone(100, 1, 'sawtooth', 0.06), 600);
  }, [playTone]);

  const playPhaseSound = useCallback((phase: GamePhase) => {
    if (phase.startsWith('night_')) {
      playNightAmbience();
    } else if (phase === 'game_over') {
      playRevealSting();
    }
  }, [playNightAmbience, playRevealSting]);

  const stopAll = useCallback(() => {
    activeOscillators.current.forEach(osc => {
      try { osc.stop(); } catch { /* already stopped */ }
    });
    activeOscillators.current = [];
  }, []);

  useEffect(() => {
    return () => stopAll();
  }, [stopAll]);

  return {
    playPhaseSound,
    playNightAmbience,
    playDramaticSting,
    playRevealSting,
    playSavedSound,
    playDeathSound,
    stopAll,
  };
}
