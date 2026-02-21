import { useEffect, useRef, useState, useCallback } from 'react';
import { NarrationEvent } from '../types/game';

interface UseNarratorReturn {
  currentText: string;
  isSpeaking: boolean;
  isNarrating: boolean;
  playNarration: (events: NarrationEvent[]) => void;
  stopNarration: () => void;
}

export function useNarrator(): UseNarratorReturn {
  const [currentText, setCurrentText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const abortRef = useRef(false);
  const generationRef = useRef(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    const preferred = [
      'Google UK English Male',
      'Daniel',
      'Google UK English Female',
      'Samantha',
      'Alex',
    ];
    for (const name of preferred) {
      const voice = voices.find(v => v.name.includes(name));
      if (voice) return voice;
    }
    return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
  }, []);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (abortRef.current) { resolve(); return; }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      utterance.rate = 0.85;
      utterance.pitch = 0.8;
      utterance.volume = 1;

      const voice = getVoice();
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => { setIsSpeaking(false); resolve(); };
      utterance.onerror = () => { setIsSpeaking(false); resolve(); };

      window.speechSynthesis.speak(utterance);
    });
  }, [getVoice]);

  const playNarration = useCallback(async (events: NarrationEvent[]) => {
    abortRef.current = false;
    const myGeneration = ++generationRef.current;
    setIsNarrating(true);

    for (const event of events) {
      if (abortRef.current || generationRef.current !== myGeneration) break;
      setCurrentText(event.text);
      await speak(event.text);
      if (event.delay && !abortRef.current && generationRef.current === myGeneration) {
        await new Promise(r => setTimeout(r, event.delay));
      }
    }

    if (generationRef.current === myGeneration) {
      setIsNarrating(false);
    }
  }, [speak]);

  const stopNarration = useCallback(() => {
    abortRef.current = true;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsNarrating(false);
    setCurrentText('');
  }, []);

  useEffect(() => {
    window.speechSynthesis.getVoices();
    const handler = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      window.speechSynthesis.cancel();
    };
  }, []);

  return { currentText, isSpeaking, isNarrating, playNarration, stopNarration };
}
