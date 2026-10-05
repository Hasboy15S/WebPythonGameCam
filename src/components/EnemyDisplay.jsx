import React, { memo } from 'react';

export const EnemyDisplay = memo(function EnemyDisplay({ isHit, isAttacking, isDefeated }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div
        className={`relative w-48 h-48 sm:w-64 sm:h-64 transition-transform duration-150 flex flex-col items-center justify-center ${
          isHit ? 'scale-90 animate-bounce brightness-150' : 'animate-[pulse_3s_ease-in-out_infinite]'
        }`}
      >
        {/* Magic Aura behind Enemy */}
        <div
          className={`absolute inset-0 rounded-full blur-2xl transition-all duration-300 ${
            isAttacking
              ? 'bg-purple-600/60 scale-125 animate-ping'
              : isHit
              ? 'bg-red-600/80 scale-110'
              : 'bg-indigo-900/40'
          }`}
        />

        {/* 2D Enemy Character Graphics */}
        <div
          className={`relative w-full h-full p-4 transition-all duration-150 ${
            isHit ? 'filter drop-shadow-[0_0_25px_rgba(239,68,68,0.9)]' : 'filter drop-shadow-[0_0_15px_rgba(147,51,234,0.5)]'
          } ${isDefeated ? 'opacity-0 scale-50 rotate-45 transition-all duration-1000' : ''}`}
        >
          <img
            src="/enemy.svg"
            alt="Void Shaman Boss"
            className="w-full h-full object-contain pointer-events-none select-none"
          />
        </div>

        {/* Attack Telegraph Aura */}
        {isAttacking && (
          <div className="absolute -bottom-4 px-3 py-1 bg-purple-950/90 border border-purple-500 rounded-full text-purple-200 text-xs font-bold tracking-wider animate-bounce shadow-[0_0_15px_rgba(168,85,247,0.8)]">
            CASTING SHADOW BOLT!
          </div>
        )}
      </div>
    </div>
  );
});
