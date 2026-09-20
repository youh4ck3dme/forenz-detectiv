import React from 'react';
import { Clock, RotateCcw, Play, Square } from 'lucide-react';
import { formatMinutes } from '@/lib/forenzUtils';

export default function TimeSlider({ min, max, value, onChange, replaying, onToggleReplay }) {
  if (min >= max) return null;

  const handleDragStart = () => {
    if (replaying && onToggleReplay) {
      onToggleReplay();
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border-t border-slate-200 shrink-0">
      <button
        onClick={onToggleReplay}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition ${
          replaying ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500 replay-pulse'
        }`}
        title={replaying ? 'Zastaviť replay' : 'Spustiť animovaný replay'}
      >
        {replaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        {replaying ? 'Stop' : 'Replay'}
      </button>
      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
      <span className="hidden sm:inline text-xs text-slate-500 w-12 shrink-0">{formatMinutes(min)}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-blue-500 cursor-pointer"
      />
      <span className="hidden sm:inline text-xs text-slate-500 w-12 text-right shrink-0">{formatMinutes(max)}</span>
      <span className="text-sm font-mono text-blue-600 w-12 text-center shrink-0 tabular-nums">{formatMinutes(value)}</span>
      <button onClick={() => onChange(max)} title="Zobraziť všetky vzťahy" className="hidden sm:block text-slate-400 hover:text-slate-900 shrink-0">
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
}
