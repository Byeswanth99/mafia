interface NarratorDisplayProps {
  text: string;
  isSpeaking: boolean;
}

export function NarratorDisplay({ text, isSpeaking }: NarratorDisplayProps) {
  if (!text) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4 pointer-events-none">
      <div className="max-w-lg mx-auto">
        <div className={`bg-midnight-950/95 backdrop-blur-sm border border-gold-500/30 rounded-2xl p-4 shadow-2xl shadow-black/50 transition-all duration-300 ${
          isSpeaking ? 'animate-pulse-glow' : ''
        }`}>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isSpeaking
                  ? 'bg-gold-500/20 border border-gold-500/50'
                  : 'bg-midnight-800 border border-midnight-600'
              }`}>
                <span className="text-lg">{isSpeaking ? '🗣️' : '🎭'}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gold-400 text-xs font-body uppercase tracking-wider mb-0.5">
                Narrator
              </p>
              <p className="text-white font-body text-sm leading-relaxed">
                {text}
              </p>
            </div>
            {isSpeaking && (
              <div className="flex-shrink-0 flex items-center gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1 bg-gold-400 rounded-full animate-pulse"
                    style={{
                      height: `${12 + Math.random() * 8}px`,
                      animationDelay: `${i * 0.15}s`
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
