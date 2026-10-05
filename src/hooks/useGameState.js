import { useState, useEffect, useRef, useCallback } from 'react';

const MAX_PLAYER_HP = 100;
const MAX_PLAYER_MANA = 100;
const MAX_ENEMY_HP = 150;
const FIREBALL_COOLDOWN_MS = 1000;
const FIREBALL_MANA_COST = 10;
const FIREBALL_BASE_DAMAGE = 25;

const INITIAL_INVENTORY = [
  {
    id: 'health_potion',
    name: 'Elixir of Vitality',
    icon: 'Heart',
    count: 3,
    description: 'Restores +40 HP immediately.',
    type: 'HEAL',
    amount: 40,
    color: 'from-rose-500 to-red-600',
  },
  {
    id: 'mana_potion',
    name: 'Aether Draught',
    icon: 'Sparkles',
    count: 3,
    description: 'Replenishes +50 Mana immediately.',
    type: 'MANA',
    amount: 50,
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'pyro_crystal',
    name: 'Pyromancer Shard',
    icon: 'Flame',
    count: 2,
    description: 'Imbues fireballs with +15 bonus damage.',
    type: 'FIRE_BUFF',
    amount: 15,
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'aegis_ward',
    name: 'Aegis Talisman',
    icon: 'Shield',
    count: 1,
    description: 'Instantly fully restores health & mana.',
    type: 'FULL_RESTORE',
    amount: 100,
    color: 'from-cyan-500 to-sky-600',
  },
];

export function useGameState() {
  const [playerHp, setPlayerHp] = useState(MAX_PLAYER_HP);
  const [playerMana, setPlayerMana] = useState(MAX_PLAYER_MANA);
  const [enemyHp, setEnemyHp] = useState(MAX_ENEMY_HP);
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [fireballDamageBonus, setFireballDamageBonus] = useState(0);

  // Cooldown tracking
  const [cooldownProgress, setCooldownProgress] = useState(0); // 0 (ready) to 1 (full cooldown)
  const lastFireballCastRef = useRef(0);

  // Combat status
  const [enemyIsHit, setEnemyIsHit] = useState(false);
  const [enemyIsAttacking, setEnemyIsAttacking] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [battleLog, setBattleLog] = useState(['Battle initiated against Malakor the Void Shaman!']);

  const addBattleLog = useCallback((msg) => {
    setBattleLog((prev) => [msg, ...prev.slice(0, 5)]);
  }, []);

  // Cooldown countdown tick
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastFireballCastRef.current;
      if (elapsed < FIREBALL_COOLDOWN_MS) {
        setCooldownProgress(1 - (elapsed / FIREBALL_COOLDOWN_MS));
      } else {
        setCooldownProgress(0);
      }
    }, 40);

    return () => clearInterval(interval);
  }, []);

  // Passive Mana Regeneration: +2 mana every second
  useEffect(() => {
    if (isGameOver || isVictory) return;
    const interval = setInterval(() => {
      setPlayerMana((prev) => Math.min(MAX_PLAYER_MANA, prev + 2));
    }, 1000);
    return () => clearInterval(interval);
  }, [isGameOver, isVictory]);

  // Check if fireball can be cast
  const canCastFireball = useCallback(() => {
    if (isGameOver || isVictory) return false;
    const now = Date.now();
    const cooldownElapsed = now - lastFireballCastRef.current >= FIREBALL_COOLDOWN_MS;
    const hasEnoughMana = playerMana >= FIREBALL_MANA_COST;
    return cooldownElapsed && hasEnoughMana;
  }, [playerMana, isGameOver, isVictory]);

  // Fireball cast execution
  const executeFireballCast = useCallback(() => {
    if (!canCastFireball()) return null;

    lastFireballCastRef.current = Date.now();
    setCooldownProgress(1);
    setPlayerMana((prev) => Math.max(0, prev - FIREBALL_MANA_COST));

    const totalDamage = FIREBALL_BASE_DAMAGE + fireballDamageBonus;
    addBattleLog(`You cast Fireball dealing ${totalDamage} damage!`);
    return { damage: totalDamage };
  }, [canCastFireball, fireballDamageBonus, addBattleLog]);

  // Apply damage to enemy
  const damageEnemy = useCallback((amount) => {
    setEnemyHp((prev) => {
      const nextHp = Math.max(0, prev - amount);
      if (nextHp <= 0) {
        setIsVictory(true);
        addBattleLog('Victory! Malakor has been banished!');
      }
      return nextHp;
    });

    setEnemyIsHit(true);
    setTimeout(() => setEnemyIsHit(false), 300);
  }, [addBattleLog]);

  // Apply damage to player (called when enemy attack hits and not shielded)
  const damagePlayer = useCallback((amount) => {
    setPlayerHp((prev) => {
      const nextHp = Math.max(0, prev - amount);
      if (nextHp <= 0) {
        setIsGameOver(true);
        addBattleLog('You have fallen in battle...');
      } else {
        addBattleLog(`You took ${amount} dark damage!`);
      }
      return nextHp;
    });
  }, [addBattleLog]);

  // Use inventory item
  const useItem = useCallback((itemId) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id !== itemId || item.count <= 0) return item;

        if (item.type === 'HEAL') {
          setPlayerHp((hp) => Math.min(MAX_PLAYER_HP, hp + item.amount));
          addBattleLog(`Consumed ${item.name}: +${item.amount} HP`);
        } else if (item.type === 'MANA') {
          setPlayerMana((mp) => Math.min(MAX_PLAYER_MANA, mp + item.amount));
          addBattleLog(`Consumed ${item.name}: +${item.amount} Mana`);
        } else if (item.type === 'FIRE_BUFF') {
          setFireballDamageBonus((prev) => prev + item.amount);
          addBattleLog(`Activated ${item.name}: +${item.amount} Fireball DMG!`);
        } else if (item.type === 'FULL_RESTORE') {
          setPlayerHp(MAX_PLAYER_HP);
          setPlayerMana(MAX_PLAYER_MANA);
          addBattleLog(`Invoked ${item.name}: Full HP & Mana restored!`);
        }

        return { ...item, count: item.count - 1 };
      })
    );
  }, [addBattleLog]);

  // Toggle inventory modal
  const toggleInventory = useCallback(() => {
    setIsInventoryOpen((prev) => !prev);
  }, []);

  // Restart match
  const restartGame = useCallback(() => {
    setPlayerHp(MAX_PLAYER_HP);
    setPlayerMana(MAX_PLAYER_MANA);
    setEnemyHp(MAX_ENEMY_HP);
    setFireballDamageBonus(0);
    setIsGameOver(false);
    setIsVictory(false);
    setCooldownProgress(0);
    lastFireballCastRef.current = 0;
    setInventory(INITIAL_INVENTORY);
    setBattleLog(['Battle restarted. Slay the Void Shaman!']);
  }, []);

  return {
    playerHp,
    maxPlayerHp: MAX_PLAYER_HP,
    playerMana,
    maxPlayerMana: MAX_PLAYER_MANA,
    enemyHp,
    maxEnemyHp: MAX_ENEMY_HP,
    inventory,
    isInventoryOpen,
    setIsInventoryOpen,
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
  };
}
