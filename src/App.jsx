import React, { useRef, useEffect, useState } from 'react';
import { useHandTracking } from './hooks/useHandTracking';
import { useGameState } from './hooks/useGameState';
import { GameHUD } from './components/GameHUD';
import { EnemyDisplay } from './components/EnemyDisplay';
import { InventoryModal } from './components/InventoryModal';
import { GestureGuide } from './components/GestureGuide';
import {
  Fireball,
  EnemyAttack,
  FloatingText,
  drawEnergyShield,
  drawPinchHold,
  drawHandSkeleton,
} from './utils/particleSystem';
import { Camera, RefreshCw, Trophy, Skull, AlertCircle } from 'lucide-react';

export default function App() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Hand tracking & WebCam Hook
  const {
    videoRef,
    isLoading,
    loadingStatus,
    isCameraActive,
    error: cameraError,
    currentGesture,
    latestTrackingRef,
  } = useHandTracking();

  // Game State Hook
  const gameState = useGameState();
  const {
    playerHp,
    maxPlayerHp,
    playerMana,
    maxPlayerMana,
    enemyHp,
    maxEnemyHp,
    inventory,
    isInventoryOpen,
    toggleInventory,
    useItem,
    isShieldActive,
    setIsShieldActive,
    cooldownProgress,
    canCastFireball,
    executeFireballCast,
    damageEnemy,
    damagePlayer,
    enemyIsHit,
    enemyIsAttacking,
    setEnemyIsAttacking,
    isGameOver,
    isVictory,
    restartGame,
    battleLog,
    fireballDamageBonus,
  } = gameState;

  // Real-time canvas VFX refs (60fps performance)
  const fireballsRef = useRef([]);
  const enemyAttacksRef = useRef([]);
  const particlesRef = useRef([]);
  const floatingTextsRef = useRef([]);

  // Pinch hold gesture tracking
  const pinchHoldStartRef = useRef(0);
  const pinchDebounceUntilRef = useRef(0);
  const [pinchHoldProgress, setPinchHoldProgress] = useState(0);

  // Screen flash reaction when taking damage
  const [screenDamageFlash, setScreenDamageFlash] = useState(false);

  // Store latest game actions in a ref to avoid stale closures in the render loop without restarting it
  const gameActionsRef = useRef({});
  useEffect(() => {
    gameActionsRef.current = {
      canCastFireball,
      executeFireballCast,
      damageEnemy,
      setIsShieldActive,
      toggleInventory,
    };
  });

  // Resize canvas to match video container exactly
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Periodic Enemy Attack AI
  useEffect(() => {
    if (isGameOver || isVictory || !isCameraActive) return;

    const attackInterval = setInterval(() => {
      // Telegraph attack for 1.2s
      setEnemyIsAttacking(true);

      setTimeout(() => {
        if (!canvasRef.current) return;
        const width = canvasRef.current.width || 800;
        const height = canvasRef.current.height || 600;

        const startX = width / 2;
        const startY = height / 2;
        const targetX = width / 2 + (Math.random() - 0.5) * 200;
        const targetY = height;

        enemyAttacksRef.current.push(
          new EnemyAttack(startX, startY, targetX, targetY, () => {
            // Hit player callback
            damagePlayer(15);
            setScreenDamageFlash(true);
            setTimeout(() => setScreenDamageFlash(false), 250);
            floatingTextsRef.current.push(
              new FloatingText('-15 HP', width / 2, height - 120, '#ef4444', 32)
            );
          })
        );

        setEnemyIsAttacking(false);
      }, 1200);
    }, 4500);

    return () => clearInterval(attackInterval);
  }, [isGameOver, isVictory, isCameraActive, damagePlayer, setEnemyIsAttacking]);

  // Optional Keyboard Shortcuts for developer testing & accessibility (F = Fist/Fireball, S = Shield, I/P = Inventory, R = Restart)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      const canvas = canvasRef.current;
      const width = canvas ? canvas.width : 800;
      const height = canvas ? canvas.height : 600;

      if (key === 'f') {
        if (canCastFireball()) {
          const castResult = executeFireballCast();
          if (castResult) {
            const startX = width * 0.25;
            const startY = height * 0.7;
            fireballsRef.current.push(
              new Fireball(startX, startY, width / 2, height / 2, (hitX, hitY) => {
                damageEnemy(castResult.damage);
                floatingTextsRef.current.push(
                  new FloatingText(`-${castResult.damage}`, hitX, hitY - 20, '#f97316', 34)
                );
              })
            );
          }
        }
      } else if (key === 's') {
        setIsShieldActive(true);
      } else if (key === 'i' || key === 'p') {
        toggleInventory();
      } else if (key === 'r') {
        restartGame();
      }
    };

    const handleKeyUp = (e) => {
      if (e.key.toLowerCase() === 's') {
        setIsShieldActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [canCastFireball, executeFireballCast, damageEnemy, setIsShieldActive, toggleInventory, restartGame]);

  // Main 60FPS Canvas Animation Loop & Gesture Handler
  useEffect(() => {
    let animId;

    const renderLoop = (timestamp) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(renderLoop);
        return;
      }

      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas overlay each frame
      ctx.clearRect(0, 0, width, height);

      const enemyCenter = { x: width / 2, y: height / 2 };
      const tracking = latestTrackingRef.current;
      const rawLandmarks = tracking?.landmarks;
      const gesture = tracking?.gesture || { type: 'NONE' };

      // Map normalized landmarks to canvas space (accounting for selfie mirror: x is inverted)
      let screenLandmarks = null;
      let handCenter = null;
      let pinchCenter = null;

      if (rawLandmarks && rawLandmarks.length >= 21) {
        screenLandmarks = rawLandmarks.map((pt) => ({
          x: (1 - pt.x) * width,
          y: pt.y * height,
          z: pt.z,
        }));

        handCenter = {
          x: (1 - gesture.center.x) * width,
          y: gesture.center.y * height,
        };

        if (gesture.pinchCenter) {
          pinchCenter = {
            x: (1 - gesture.pinchCenter.x) * width,
            y: gesture.pinchCenter.y * height,
          };
        }

        // 1. Draw subtle hand tracking skeleton
        drawHandSkeleton(ctx, screenLandmarks, gesture.type);
      }

      // Handle Gestures:
      // a) FIST -> Cast Fireball
      if (gesture.type === 'FIST' && handCenter) {
        if (gameActionsRef.current.canCastFireball()) {
          const castResult = gameActionsRef.current.executeFireballCast();
          if (castResult) {
            fireballsRef.current.push(
              new Fireball(
                handCenter.x,
                handCenter.y,
                enemyCenter.x,
                enemyCenter.y,
                (hitX, hitY) => {
                  gameActionsRef.current.damageEnemy(castResult.damage);
                  floatingTextsRef.current.push(
                    new FloatingText(
                      `-${castResult.damage}`,
                      hitX,
                      hitY - 20,
                      '#f97316',
                      34
                    )
                  );
                }
              )
            );
          }
        }
      }

      // b) OPEN PALM -> Energy Shield
      const isPalmActive = gesture.type === 'OPEN_PALM';
      gameActionsRef.current.setIsShieldActive(isPalmActive);

      if (isPalmActive && screenLandmarks) {
        drawEnergyShield(ctx, screenLandmarks, timestamp);
      }

      // c) PINCH -> Hold 1s to Toggle Inventory
      const now = Date.now();
      if (gesture.type === 'PINCH' && now > pinchDebounceUntilRef.current) {
        if (pinchHoldStartRef.current === 0) {
          pinchHoldStartRef.current = now;
        }

        const elapsed = now - pinchHoldStartRef.current;
        const progress = Math.min(1, elapsed / 1000);
        setPinchHoldProgress((prev) => {
          if (progress === 0 || progress === 1) return progress;
          if (Math.abs(prev - progress) >= 0.1) return Math.round(progress * 10) / 10;
          return prev;
        });

        if (pinchCenter) {
          drawPinchHold(ctx, pinchCenter, progress);
        }

        if (progress >= 1) {
          gameActionsRef.current.toggleInventory();
          if (pinchCenter) {
            floatingTextsRef.current.push(
              new FloatingText('INVENTORY TOGGLED', pinchCenter.x, pinchCenter.y - 40, '#c084fc', 24)
            );
          }
          pinchDebounceUntilRef.current = now + 800; // prevent rapid toggling
          pinchHoldStartRef.current = 0;
          setPinchHoldProgress(0);
        }
      } else {
        pinchHoldStartRef.current = 0;
        setPinchHoldProgress(0);
      }

      // Update & Draw Fireballs
      fireballsRef.current = fireballsRef.current.filter((fireball) => {
        const alive = fireball.update(particlesRef.current);
        if (alive) fireball.draw(ctx);
        return alive;
      });

      // Update & Draw Enemy Attacks (Shadow Bolts)
      enemyAttacksRef.current = enemyAttacksRef.current.filter((attack) => {
        const result = attack.update(
          particlesRef.current,
          isPalmActive,
          handCenter
        );

        if (result === true) {
          attack.draw(ctx);
          return true;
        }

        // If attack was blocked by shield
        if (result && result.blocked) {
          floatingTextsRef.current.push(
            new FloatingText('BLOCKED!', result.x, result.y - 20, '#38bdf8', 28)
          );
        }
        return false;
      });

      // Update & Draw Particles
      particlesRef.current = particlesRef.current.filter((p) => {
        const alive = p.update();
        if (alive) p.draw(ctx);
        return alive;
      });

      // Update & Draw Floating Combat Text
      floatingTextsRef.current = floatingTextsRef.current.filter((txt) => {
        const alive = txt.update();
        if (alive) txt.draw(ctx);
        return alive;
      });

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* Video & Canvas Game Container */}
      <div ref={containerRef} className="relative w-full h-full overflow-hidden">
        {/* Mirrored Webcam Background */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-80"
        />

        {/* Dark Vignette Overlay for Fantasy RPG Atmosphere */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-slate-950/80" />

        {/* Screen Red Flash when taking damage */}
        {screenDamageFlash && (
          <div className="absolute inset-0 pointer-events-none bg-red-600/30 animate-pulse transition-opacity duration-150 z-30" />
        )}

        {/* Transparent Canvas VFX Overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* 2D Enemy Center Target */}
        <EnemyDisplay
          isHit={enemyIsHit}
          isAttacking={enemyIsAttacking}
          enemyHp={enemyHp}
          maxEnemyHp={maxEnemyHp}
          isDefeated={isVictory}
        />

        {/* Game HUD (Player & Enemy HP, Mana, Spell Cooldowns) */}
        <GameHUD
          playerHp={playerHp}
          maxPlayerHp={maxPlayerHp}
          playerMana={playerMana}
          maxPlayerMana={maxPlayerMana}
          enemyHp={enemyHp}
          maxEnemyHp={maxEnemyHp}
          cooldownProgress={cooldownProgress}
          isShieldActive={isShieldActive}
          currentGesture={currentGesture}
          isInventoryOpen={isInventoryOpen}
          onToggleInventory={toggleInventory}
          battleLog={battleLog}
          fireballBonus={fireballDamageBonus}
        />

        {/* Bottom Gesture Guide & Live feedback */}
        <GestureGuide
          currentGesture={currentGesture}
          pinchHoldProgress={pinchHoldProgress}
        />
      </div>

      {/* Inventory Modal (Opened via Pinch Hold 1s or HUD Click) */}
      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={toggleInventory}
        items={inventory}
        onUseItem={useItem}
      />

      {/* Loading Screen / MediaPipe Setup */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-6 text-center">
          <div className="p-4 bg-purple-950/60 border border-purple-500/50 rounded-2xl mb-4 shadow-[0_0_30px_rgba(147,51,234,0.4)]">
            <RefreshCw className="w-10 h-10 text-purple-400 animate-spin" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-purple-200 tracking-wider mb-2">
            INITIALIZING ARCANE VISION
          </h1>
          <p className="text-sm text-slate-400 font-mono max-w-sm mb-4">
            {loadingStatus}
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Camera className="w-4 h-4" />
            <span>Please allow camera access when prompted</span>
          </div>
        </div>
      )}

      {/* Camera / MediaPipe Error Modal */}
      {cameraError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-6 text-center">
          <div className="max-w-md bg-slate-900 border border-red-500/50 rounded-2xl p-6 shadow-2xl">
            <div className="p-3 bg-red-950/80 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-red-400 border border-red-500/40">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-red-200 mb-2">Webcam Error</h2>
            <p className="text-xs text-slate-400 mb-6">{cameraError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
            >
              Retry Access
            </button>
          </div>
        </div>
      )}

      {/* Victory Screen */}
      {isVictory && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-6 text-center">
          <div className="max-w-md bg-slate-900/90 border border-amber-500/60 rounded-2xl p-8 shadow-[0_0_50px_rgba(245,158,11,0.3)]">
            <div className="p-4 bg-amber-950/80 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-amber-400 border border-amber-500">
              <Trophy className="w-8 h-8 animate-bounce" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-amber-300 mb-2">
              VICTORY ACHIEVED!
            </h2>
            <p className="text-sm text-slate-300 mb-6">
              Malakor has been banished by your arcane mastery.
            </p>
            <button
              onClick={restartGame}
              className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-xl text-sm uppercase tracking-wider shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              Play Next Wave
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {isGameOver && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 text-center">
          <div className="max-w-md bg-slate-900/90 border border-red-600/60 rounded-2xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.3)]">
            <div className="p-4 bg-red-950/80 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-red-500 border border-red-600">
              <Skull className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-red-300 mb-2">
              YOU WERE DEFEATED
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              The Void Shaman overcame your defenses.
            </p>
            <button
              onClick={restartGame}
              className="px-8 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl text-sm uppercase tracking-wider shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
