import { useState, useEffect } from 'react';

interface TimerProps {
  startTime: number;
}

export function Timer({ startTime }: TimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="inline-flex items-center gap-1.5 text-sm font-body mt-1">
      <span className="text-gray-400">⏱</span>
      <span className="text-gray-500 tabular-nums">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}
