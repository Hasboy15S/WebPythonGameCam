import React, { memo } from 'react';

export const GestureGuide = memo(function GestureGuide({ currentGesture, pinchHoldProgress }) {
  const currentType = currentGesture?.type || 'NONE';

  const gestures = [
    {
      id: 'FIST',
      name: 'Fist',
      emoji: '✊',
      action: 'Fireball Spell',
      color: 'border-red-500 bg-red-950/40 text-red-200',
      activeColor: 'border-red-400 bg-red-900/80 text-white shadow-[0_0_20px_rgba(239,68,68,0.7)] scale-105',
    },
    {
      id: 'OPEN_PALM',
      name: 'Open Palm',
      emoji: '✋',
      action: 'Energy Shield',
      color: 'border-cyan-500 bg-cyan-950/40 text-cyan-200',
      activeColor: 'border-cyan-400 bg-cyan-900/80 text-white shadow-[0_0_20px_rgba(56,189,248,0.7)] scale-105',
    },
    {
      id: 'PINCH',
      name: 'Pinch (Hold 1s)',
      emoji: '🤏',
      action: 'Toggle Inventory',
      color: 'border-purple-500 bg-purple-950/40 text-purple-200',
      activeColor: 'border-purple-400 bg-purple-900/80 text-white shadow-[0_0_20px_rgba(192,132,252,0.7)] scale-105',
    },
  ];

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden lg:flex flex-col gap-2 max-w-xs">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
        Gesture Spellbook
      </div>
      <div className="flex flex-col gap-1.5">
        {gestures.map((item) => {
          const isActive = currentType === item.id;
          return (
            <div
              key={item.id}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border backdrop-blur-md transition-all duration-200 ${
                isActive ? item.activeColor : item.color
              }`}
            >
              <span className="text-xl">{item.emoji}</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold leading-tight flex items-center gap-1.5">
                  {item.name}
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  )}
                </span>
                <span className="text-[10px] opacity-80">{item.action}</span>
              </div>
              {item.id === 'PINCH' && pinchHoldProgress > 0 && (
                <div className="ml-auto text-[10px] font-mono font-bold text-purple-300">
                  {Math.round(pinchHoldProgress * 100)}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
