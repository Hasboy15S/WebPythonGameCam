import React, { memo } from 'react';
import { Heart, Sparkles, Shield, Flame, Backpack, Skull, Zap } from 'lucide-react';

export const GameHUD = memo(function GameHUD({
  playerHp,
  maxPlayerHp,
  playerMana,
  maxPlayerMana,
  enemyHp,
  maxEnemyHp,
  cooldownProgress,
  isShieldActive,
  currentGesture,
  isInventoryOpen,
  onToggleInventory,
  battleLog,
  fireballBonus,
}) {
  const hpPercent = Math.max(0, Math.min(100, (playerHp / maxPlayerHp) * 100));
  const manaPercent = Math.max(0, Math.min(100, (playerMana / maxPlayerMana) * 100));
  const enemyPercent = Math.max(0, Math.min(100, (enemyHp / maxEnemyHp) * 100));

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Top Section: Enemy Boss Bar + Player Vitals */}
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-4">
        {/* Boss HP Bar */}
        <div className="w-full bg-slate-900/80 backdrop-blur-md border border-purple-500/40 rounded-xl p-3 shadow-2xl">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <div className="flex items-center gap-2">
              <Skull className="w-5 h-5 text-purple-400 animate-pulse" />
              <span className="font-serif font-bold text-sm sm:text-base tracking-wider text-purple-200 uppercase">
                Malakor The Void Shaman
              </span>
            </div>
            <span className="font-mono text-xs sm:text-sm text-purple-300 font-semibold">
              {enemyHp} / {maxEnemyHp} HP
            </span>
          </div>

          <div className="w-full h-3.5 sm:h-4 bg-slate-950/80 rounded-full overflow-hidden p-0.5 border border-purple-900/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-600 via-purple-600 to-pink-500 transition-all duration-300 shadow-[0_0_12px_rgba(236,72,153,0.5)]"
              style={{ width: `${enemyPercent}%` }}
            />
          </div>
        </div>

        {/* Player Health & Mana Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Player HP */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-red-500/30 rounded-xl p-3 shadow-xl">
            <div className="flex items-center justify-between mb-1 px-1">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs sm:text-sm">
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                <span>PLAYER HEALTH</span>
              </div>
              <span className="font-mono text-xs sm:text-sm text-rose-200 font-bold">
                {playerHp} / {maxPlayerHp}
              </span>
            </div>
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-rose-950">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-600 to-red-400 transition-all duration-300 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Player Mana */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 rounded-xl p-3 shadow-xl">
            <div className="flex items-center justify-between mb-1 px-1">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs sm:text-sm">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>MANA POWER</span>
              </div>
              <span className="font-mono text-xs sm:text-sm text-cyan-200 font-bold">
                {playerMana} / {maxPlayerMana}
              </span>
            </div>
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-cyan-950">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-600 to-cyan-400 transition-all duration-300 shadow-[0_0_10px_rgba(56,189,248,0.6)]"
                style={{ width: `${manaPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Middle/Bottom Floating Spell Status & Controls */}
      <div className="w-full flex items-end justify-between gap-4 mt-auto">
        {/* Battle Log ticker */}
        <div className="hidden md:flex flex-col gap-1 max-w-sm bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-lg p-2.5 text-xs text-slate-300 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Combat Chronology</span>
            </div>
            {currentGesture?.type && currentGesture.type !== 'NONE' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/80 text-purple-200 border border-purple-500/50 font-mono">
                HAND: {currentGesture.type}
              </span>
            )}
          </div>
          <p className="font-mono text-slate-200 truncate">{battleLog[0] || 'Ready for spell casting...'}</p>
          {battleLog[1] && <p className="font-mono text-slate-400 text-[11px] truncate">{battleLog[1]}</p>}
        </div>

        {/* Center: Spell Indicators & Cooldown Badges */}
        <div className="flex items-center gap-3 mx-auto">
          {/* Fireball Badge */}
          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl backdrop-blur-md border transition-all ${
              cooldownProgress > 0
                ? 'bg-slate-900/80 border-slate-700 text-slate-400'
                : 'bg-red-950/80 border-red-500/80 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
            }`}
          >
            <Flame className={`w-5 h-5 ${cooldownProgress > 0 ? 'text-slate-500' : 'text-orange-400 animate-pulse'}`} />
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold uppercase tracking-wider">Fireball (Fist)</span>
              <span className="text-[10px] font-mono">
                {cooldownProgress > 0 ? `CD: ${(cooldownProgress * 1).toFixed(1)}s` : `READY (-10 MP${fireballBonus ? ` +${fireballBonus} DMG` : ''})`}
              </span>
            </div>
          </div>

          {/* Shield Badge */}
          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl backdrop-blur-md border transition-all ${
              isShieldActive
                ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-[0_0_20px_rgba(56,189,248,0.6)] scale-105'
                : 'bg-slate-900/80 border-slate-700 text-slate-400'
            }`}
          >
            <Shield className={`w-5 h-5 ${isShieldActive ? 'text-cyan-400' : 'text-slate-500'}`} />
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold uppercase tracking-wider">Aegis (Open Palm)</span>
              <span className="text-[10px] font-mono">{isShieldActive ? 'DEFENDING' : 'STANDBY'}</span>
            </div>
          </div>

          {/* Inventory Button (pointer-events enabled) */}
          <button
            onClick={onToggleInventory}
            className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-xl backdrop-blur-md border cursor-pointer transition-all hover:scale-105 active:scale-95 ${
              isInventoryOpen
                ? 'bg-purple-900/90 border-purple-400 text-purple-100 shadow-[0_0_15px_rgba(192,132,252,0.6)]'
                : 'bg-slate-900/80 border-purple-500/50 text-purple-300 hover:border-purple-400'
            }`}
          >
            <Backpack className="w-5 h-5 text-purple-400" />
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold uppercase tracking-wider">Inventory (Pinch)</span>
              <span className="text-[10px] font-mono">Hold 1s / Click</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
});
