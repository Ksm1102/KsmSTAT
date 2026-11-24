import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BookOpen,
  CheckCircle2,
  Compass,
  Flame,
  Gift,
  Heart,
  Lock,
  MapPin,
  RotateCcw,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Trophy,
  Unlock,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CORE_STAT_MAP,
  DUNGEON_ZONES,
  DUNGEON_ZONE_MAP,
  ITEM_CATALOG,
  MONSTER_CATALOG,
  RARE_STATS,
  SUB_STAT_MAP,
} from '../data/presets';
import {
  AppState,
  CoreStatKey,
  CoreStatsMap,
  DungeonZoneId,
  MonsterDefinition,
  SubStatsMap,
} from '../types/statup';
import { getTotalCoreStatPower } from '../utils/calculations';

interface DungeonViewProps {
  appState: AppState;
  currentLevel: number;
  coreStats: CoreStatsMap;
  subStats: SubStatsMap;
  onDefeatMonster: (monster: MonsterDefinition) => void;
  onGoToActivity: () => void;
}

type BattlePhase = 'MONSTER_SELECT' | 'BATTLE' | 'VICTORY' | 'DEFEAT';

interface CombatLogEntry {
  id: string;
  actor: 'player' | 'monster' | 'system';
  text: string;
}

interface CombatProfile {
  maxHp: number;
  attackPower: number;
  critChance: number;
  guardAndHeal: number;
}

interface BattleSimulationResult {
  monsterId: string;
  winRate: number;
  avgTurnsToWin: number;
  avgRemainingHpPct: number;
  expectedPlayerDmg: number;
  expectedEnemyDmg: number;
  trials: number;
  recommendedStatHint: string;
}

function simulateBattleAgainstMonster(
  monster: MonsterDefinition,
  coreStats: CoreStatsMap,
  subStats: SubStatsMap,
  combatStats: CombatProfile,
  trials = 500
): BattleSimulationResult {
  let wins = 0;
  let winTurnsSum = 0;
  let winHpPctSum = 0;
  let totalPlayerDmg = 0;
  let totalPlayerTurns = 0;
  let totalEnemyDmg = 0;
  let totalEnemyTurns = 0;

  const knowledgeBonus = Math.round((coreStats.knowledge + subStats.math_logic) * 0.25);
  const focusBase = Math.round(
    combatStats.attackPower * 0.92 + (coreStats.focus + coreStats.inquiry) * 0.2
  );
  const focusCritProb = Math.min(1, (combatStats.critChance + 12) / 100);
  const avgKnowledgeDmg = Math.max(10, combatStats.attackPower + knowledgeBonus + 2.5);
  const avgFocusDmg = Math.max(9, focusBase * (1 + 0.7 * focusCritProb));
  const preferFocus = avgFocusDmg > avgKnowledgeDmg;

  for (let t = 0; t < trials; t++) {
    let pHp = combatStats.maxHp;
    let mHp = monster.hp;
    let turns = 0;

    while (pHp > 0 && mHp > 0 && turns < 60) {
      turns++;
      let dmg = 0;
      let heal = 0;
      let guardFlag = false;

      // Smart tactical simulation matching available battle skills
      if (pHp < combatStats.maxHp * 0.42 && mHp > avgKnowledgeDmg) {
        heal = Math.max(12, Math.round(combatStats.guardAndHeal * 1.15));
        dmg = Math.max(7, Math.round(combatStats.attackPower * 0.65));
        guardFlag = true;
      } else if (preferFocus) {
        const isCrit = Math.random() < focusCritProb;
        dmg = Math.max(9, isCrit ? Math.round(focusBase * 1.7) : focusBase);
      } else {
        dmg = Math.max(10, combatStats.attackPower + knowledgeBonus + Math.floor(Math.random() * 6));
      }

      pHp = Math.min(combatStats.maxHp, pHp + heal);
      mHp = Math.max(0, mHp - dmg);
      totalPlayerDmg += dmg;
      totalPlayerTurns++;

      if (mHp <= 0) {
        wins++;
        winTurnsSum += turns;
        winHpPctSum += (pHp / combatStats.maxHp) * 100;
        break;
      }

      const variance = Math.floor(Math.random() * 5) - 2;
      const rawEnemyDamage = Math.max(4, monster.attackPower + variance);
      const mitigated = guardFlag
        ? Math.max(2, Math.round(rawEnemyDamage * 0.45) - Math.round(combatStats.guardAndHeal * 0.25))
        : Math.max(3, rawEnemyDamage - Math.round(combatStats.guardAndHeal * 0.2));

      pHp = Math.max(0, pHp - mitigated);
      totalEnemyDmg += mitigated;
      totalEnemyTurns++;
    }
  }

  const winRate = Math.round((wins / trials) * 100);
  const avgTurnsToWin = wins > 0 ? Math.round((winTurnsSum / wins) * 10) / 10 : 0;
  const avgRemainingHpPct = wins > 0 ? Math.round(winHpPctSum / wins) : 0;
  const expectedPlayerDmg =
    totalPlayerTurns > 0 ? Math.round(totalPlayerDmg / totalPlayerTurns) : combatStats.attackPower;
  const expectedEnemyDmg =
    totalEnemyTurns > 0 ? Math.round(totalEnemyDmg / totalEnemyTurns) : monster.attackPower;

  let recommendedStatHint = '현재 스탯으로도 안정적인 토벌이 가능합니다.';
  if (winRate < 40) {
    recommendedStatHint =
      '생존 턴이 부족합니다. 운동(체력 HP)과 공부(지식 공격력) 활동을 더 쌓은 뒤 도전해보세요.';
  } else if (winRate < 75) {
    recommendedStatHint =
      '접전이 예상됩니다. 집중력(치명타)이나 자기주도(회복반격)를 조금 올리면 승률이 크게 오릅니다.';
  }

  return {
    monsterId: monster.id,
    winRate,
    avgTurnsToWin,
    avgRemainingHpPct,
    expectedPlayerDmg,
    expectedEnemyDmg,
    trials,
    recommendedStatHint,
  };
}

function playTone(freq: number, durationMs: number, type: OscillatorType = 'triangle', enabled = true) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, durationMs + 50);
  } catch {
    // Ignore audio context restrictions gracefully
  }
}

const MonsterCrest: React.FC<{ monster: MonsterDefinition }> = ({ monster }) => {
  const palette = monster.isBoss
    ? { bg: 'bg-rose-50 border-rose-200', stroke: '#E11D48', fill: '#FFE4E6' }
    : monster.rankLabel === '정예 몬스터'
    ? { bg: 'bg-amber-50 border-amber-200', stroke: '#D97706', fill: '#FEF3C7' }
    : { bg: 'bg-indigo-50 border-indigo-200', stroke: '#4F46E5', fill: '#E0E7FF' };

  return (
    <div
      className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${palette.bg}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" className="w-8 h-8">
        <polygon
          points="20,4 34,12 31,30 20,36 9,30 6,12"
          fill={palette.fill}
          stroke={palette.stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {monster.isBoss ? (
          <>
            <path d="M12 16 L16 12 L20 15 L24 12 L28 16" fill="none" stroke={palette.stroke} strokeWidth="2" strokeLinecap="round" />
            <circle cx="15" cy="21" r="2" fill={palette.stroke} />
            <circle cx="25" cy="21" r="2" fill={palette.stroke} />
            <path d="M15 27 Q20 24 25 27" fill="none" stroke={palette.stroke} strokeWidth="2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="15" cy="19" r="2.2" fill={palette.stroke} />
            <circle cx="25" cy="19" r="2.2" fill={palette.stroke} />
            <path d="M15 26 Q20 29 25 26" fill="none" stroke={palette.stroke} strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </svg>
    </div>
  );
};

export const DungeonView: React.FC<DungeonViewProps> = ({
  appState,
  currentLevel,
  coreStats,
  subStats,
  onDefeatMonster,
  onGoToActivity,
}) => {
  const [phase, setPhase] = useState<BattlePhase>('MONSTER_SELECT');
  const [activeMonster, setActiveMonster] = useState<MonsterDefinition | null>(null);
  const [playerHp, setPlayerHp] = useState(100);
  const [monsterHp, setMonsterHp] = useState(100);
  const [turnNumber, setTurnNumber] = useState(1);
  const [isEnemyTurn, setIsEnemyTurn] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const [victoryRewardNote, setVictoryRewardNote] = useState<string>('');
  const [selectedDungeonId, setSelectedDungeonId] = useState<DungeonZoneId | 'all'>('all');
  const [showDropGuide, setShowDropGuide] = useState(false);
  const [selectedSimMonsterId, setSelectedSimMonsterId] = useState<string | null>(null);
  const [simResults, setSimResults] = useState<Record<string, BattleSimulationResult>>({});
  const enemyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (enemyTimeoutRef.current !== null) {
        window.clearTimeout(enemyTimeoutRef.current);
      }
    };
  }, []);

  const totalPower = getTotalCoreStatPower(coreStats);

  // Combat metrics derived directly from student stats & sub-stats
  const combatStats = useMemo(() => {
    const gearBonusPower = appState.equippedGearIds.length * 4;
    const maxHp = 80 + coreStats.stamina * 3 + currentLevel * 15;
    const attackPower =
      12 +
      Math.round(
        coreStats.knowledge * 0.65 +
          coreStats.inquiry * 0.35 +
          (subStats.math_logic + subStats.lang_eng + subStats.hobby_creative) * 0.25
      ) +
      gearBonusPower;
    const critChance = Math.min(
      55,
      10 + Math.round((coreStats.focus + subStats.deep_immersion) * 0.45)
    );
    const guardAndHeal =
      8 +
      Math.round(
        coreStats.autonomy * 0.5 +
          coreStats.stamina * 0.3 +
          (subStats.wrong_note + subStats.condition_care) * 0.2
      );
    return { maxHp, attackPower, critChance, guardAndHeal };
  }, [appState.equippedGearIds.length, coreStats, currentLevel, subStats]);

  // Default simulation target: boss of selected dungeon, or first boss overall
  const defaultBossTarget = useMemo(() => {
    const pool =
      selectedDungeonId === 'all'
        ? MONSTER_CATALOG
        : MONSTER_CATALOG.filter((m) => m.dungeonId === selectedDungeonId);
    const firstBoss = pool.find((m) => m.isBoss);
    return firstBoss ?? pool[pool.length - 1] ?? MONSTER_CATALOG[0];
  }, [selectedDungeonId]);

  const handleSimulateBattle = (monster: MonsterDefinition) => {
    const result = simulateBattleAgainstMonster(monster, coreStats, subStats, combatStats);
    setSimResults((prev) => ({ ...prev, [monster.id]: result }));
    setSelectedSimMonsterId(monster.id);
    playTone(540, 90, 'sine', soundEnabled);
  };

  // Recompute existing simulation previews automatically if player stats change
  useEffect(() => {
    setSimResults((prev) => {
      const existingIds = Object.keys(prev);
      if (existingIds.length === 0) return prev;
      const updated: Record<string, BattleSimulationResult> = {};
      for (const id of existingIds) {
        const m = MONSTER_CATALOG.find((item) => item.id === id);
        if (m) {
          updated[id] = simulateBattleAgainstMonster(m, coreStats, subStats, combatStats);
        }
      }
      return updated;
    });
  }, [combatStats, coreStats, subStats]);

  const activeSimMonster = selectedSimMonsterId
    ? MONSTER_CATALOG.find((m) => m.id === selectedSimMonsterId) ?? null
    : null;
  const activeSimResult = activeSimMonster ? simResults[activeSimMonster.id] ?? null : null;

  const startBattle = (monster: MonsterDefinition) => {
    if (enemyTimeoutRef.current !== null) {
      window.clearTimeout(enemyTimeoutRef.current);
    }
    setActiveMonster(monster);
    setPlayerHp(combatStats.maxHp);
    setMonsterHp(monster.hp);
    setTurnNumber(1);
    setIsEnemyTurn(false);
    setShieldActive(false);
    setVictoryRewardNote('');
    setCombatLog([
      {
        id: `log-start-${Date.now()}`,
        actor: 'system',
        text: `${monster.name}이(가) 등장했습니다! 내 스탯(총합 ${totalPower} pt)으로 토벌을 시작합니다.`,
      },
    ]);
    setPhase('BATTLE');
    playTone(440, 120, 'triangle', soundEnabled);
  };

  const resolveEnemyTurn = (
    monster: MonsterDefinition,
    currentPlayerHp: number,
    guardFlag: boolean
  ) => {
    setIsEnemyTurn(true);
    enemyTimeoutRef.current = window.setTimeout(() => {
      const variance = Math.floor(Math.random() * 5) - 2; // -2 ~ +2
      const rawEnemyDamage = Math.max(4, monster.attackPower + variance);
      const mitigated = guardFlag
        ? Math.max(2, Math.round(rawEnemyDamage * 0.45) - Math.round(combatStats.guardAndHeal * 0.25))
        : Math.max(3, rawEnemyDamage - Math.round(combatStats.guardAndHeal * 0.2));

      const nextPlayerHp = Math.max(0, currentPlayerHp - mitigated);
      setPlayerHp(nextPlayerHp);
      setShieldActive(false);
      setIsEnemyTurn(false);
      setTurnNumber((t) => t + 1);

      setCombatLog((prev) => [
        {
          id: `log-m-${Date.now()}`,
          actor: 'monster',
          text: guardFlag
            ? `${monster.name}의 공격을 방어 자세로 버텨 ${mitigated} 피해만 입었습니다.`
            : `${monster.name}의 반격! ${mitigated} 피해를 입었습니다.`,
        },
        ...prev.slice(0, 7),
      ]);

      playTone(190, 130, 'sawtooth', soundEnabled);

      if (nextPlayerHp <= 0) {
        setPhase('DEFEAT');
      }
    }, 420);
  };

  const handlePlayerSkill = (skill: 'knowledge_strike' | 'focus_combo' | 'autonomy_counter') => {
    if (!activeMonster || phase !== 'BATTLE' || isEnemyTurn) return;

    let damage = combatStats.attackPower;
    let healAmount = 0;
    let nextGuardFlag = false;
    let actionMsg = '';

    if (skill === 'knowledge_strike') {
      const bonus = Math.round((coreStats.knowledge + subStats.math_logic) * 0.25);
      damage = Math.max(10, combatStats.attackPower + bonus + Math.floor(Math.random() * 6));
      actionMsg = `지식 일격 발동! ${activeMonster.name}에게 ${damage} 데미지!`;
      playTone(520, 110, 'triangle', soundEnabled);
    } else if (skill === 'focus_combo') {
      const isCrit = Math.random() * 100 < combatStats.critChance + 12;
      const base = Math.round(combatStats.attackPower * 0.92 + (coreStats.focus + coreStats.inquiry) * 0.2);
      damage = Math.max(9, isCrit ? Math.round(base * 1.7) : base);
      actionMsg = isCrit
        ? `집중 연타 치명타! 약점을 꿰뚫어 ${damage} 데미지!`
        : `집중 연타 성공! ${damage} 데미지를 입혔습니다.`;
      playTone(isCrit ? 680 : 480, 130, 'sine', soundEnabled);
    } else {
      healAmount = Math.max(12, Math.round(combatStats.guardAndHeal * 1.15));
      damage = Math.max(7, Math.round(combatStats.attackPower * 0.65));
      nextGuardFlag = true;
      setShieldActive(true);
      actionMsg = `자기주도 회복반격! HP +${healAmount} 회복 및 방어 태세 + ${damage} 반격 피해!`;
      playTone(580, 140, 'sine', soundEnabled);
    }

    const healedHp = Math.min(combatStats.maxHp, playerHp + healAmount);
    setPlayerHp(healedHp);

    const nextMonsterHp = Math.max(0, monsterHp - damage);
    setMonsterHp(nextMonsterHp);

    setCombatLog((prev) => [
      { id: `log-p-${Date.now()}`, actor: 'player', text: actionMsg },
      ...prev.slice(0, 7),
    ]);

    if (nextMonsterHp <= 0) {
      const prevDefeats = appState.defeatedMonsters[activeMonster.id] ?? 0;
      const isFirstClear = prevDefeats === 0;
      const dropDef = activeMonster.dropItemId
        ? ITEM_CATALOG.find((i) => i.id === activeMonster.dropItemId)
        : undefined;
      const rewardSummary = isFirstClear
        ? `최초 토벌 성공! +${activeMonster.firstClearXp} XP · +${activeMonster.firstClearCoins} 코인${
            activeMonster.firstClearRareStat
              ? ` · ${RARE_STATS[activeMonster.firstClearRareStat.key].label} +${activeMonster.firstClearRareStat.amount}`
              : ''
          }${dropDef ? ` · 아이템 [${dropDef.name}] 획득` : ''}`
        : `반복 토벌 성공! +${activeMonster.repeatXp} XP · +${activeMonster.repeatCoins} 코인`;
      setVictoryRewardNote(rewardSummary);
      setPhase('VICTORY');
      playTone(784, 200, 'triangle', soundEnabled);
      onDefeatMonster(activeMonster);
      return;
    }

    resolveEnemyTurn(activeMonster, healedHp, nextGuardFlag);
  };

  const defeatedTotal = Object.values(appState.defeatedMonsters).reduce((sum, n) => sum + n, 0);

  return (
    <div id="dungeon-view-container" className="space-y-8">
      {/* Header & Combat Readiness Strip */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight [text-wrap:balance]">
              스탯 던전 토벌전
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              공부·운동·자기주도·독서·취미로 키운 5대 스탯과 세부 스탯으로 시험장 몬스터와 보스를 토벌하세요.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-mono-num text-slate-600 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
              누적 토벌 <strong className="text-slate-900">{defeatedTotal}회</strong>
            </span>
            <button
              type="button"
              data-testid="simulate-battle-btn"
              onClick={() => handleSimulateBattle(activeSimMonster ?? defaultBossTarget)}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl whitespace-nowrap transition-colors"
            >
              <Activity className="w-4 h-4" />
              전투 시뮬레이션
            </button>
            <button
              type="button"
              onClick={() => setSoundEnabled((s) => !s)}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl whitespace-nowrap"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              {soundEnabled ? '효과음 켜짐' : '효과음 꺼짐'}
            </button>
          </div>
        </div>

        {/* 4 Combat Metrics calculated from student's real stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="text-xs text-slate-500">전투 체력 (체력 · 레벨 반영)</div>
            <div className="text-lg font-extrabold font-mono-num text-emerald-700 mt-0.5">
              HP {combatStats.maxHp}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="text-xs text-slate-500">기본 공격력 (지식 · 탐구 반영)</div>
            <div className="text-lg font-extrabold font-mono-num text-indigo-700 mt-0.5">
              ATK {combatStats.attackPower}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="text-xs text-slate-500">치명타 확률 (집중력 반영)</div>
            <div className="text-lg font-extrabold font-mono-num text-amber-700 mt-0.5">
              CRIT {combatStats.critChance}%
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="text-xs text-slate-500">회복 · 방어 (주도력 반영)</div>
            <div className="text-lg font-extrabold font-mono-num text-blue-700 mt-0.5">
              DEF {combatStats.guardAndHeal}
            </div>
          </div>
        </div>

        {/* Battle Simulation Forecast Panel */}
        {activeSimMonster && activeSimResult && (
          <div
            data-testid="battle-simulation-panel"
            className="mt-4 bg-indigo-50/70 border border-indigo-200 rounded-xl p-5 space-y-4"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <MonsterCrest monster={activeSimMonster} />
                <div>
                  <div className="text-xs font-semibold text-indigo-700">
                    전투 시뮬레이션 예측 ({activeSimResult.trials}회 모의 전투 기준)
                  </div>
                  <h2 className="text-base font-bold text-slate-900">
                    {activeSimMonster.name} ({activeSimMonster.rankLabel})
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="시뮬레이션 대상 선택"
                  value={activeSimMonster.id}
                  onChange={(e) => {
                    const target = MONSTER_CATALOG.find((m) => m.id === e.target.value);
                    if (target) handleSimulateBattle(target);
                  }}
                  className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {MONSTER_CATALOG.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{DUNGEON_ZONE_MAP[m.dungeonId].shortLabel}] {m.name} ({m.rankLabel} · Lv.{m.requiredLevel}+)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleSimulateBattle(activeSimMonster)}
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-100 rounded-xl whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  다시 계산
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSimMonsterId(null)}
                  className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl whitespace-nowrap"
                >
                  닫기
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white border border-indigo-100 rounded-xl p-3.5">
                <div className="text-xs text-slate-500">예상 승률</div>
                <div
                  className={`text-2xl font-extrabold font-mono-num mt-0.5 ${
                    activeSimResult.winRate >= 75
                      ? 'text-emerald-700'
                      : activeSimResult.winRate >= 45
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }`}
                >
                  {activeSimResult.winRate}%
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {activeSimResult.winRate >= 80
                    ? '안정적 승리 구간'
                    : activeSimResult.winRate >= 50
                    ? '접전 예상 구간'
                    : activeSimResult.winRate >= 20
                    ? '고전 주의 구간'
                    : '스탯 보충 권장'}
                </div>
              </div>

              <div className="bg-white border border-indigo-100 rounded-xl p-3.5">
                <div className="text-xs text-slate-500">예상 승리 턴 · 잔여 체력</div>
                <div className="text-base font-bold font-mono-num text-slate-900 mt-1">
                  {activeSimResult.winRate > 0
                    ? `${activeSimResult.avgTurnsToWin}턴 · HP ${activeSimResult.avgRemainingHpPct}%`
                    : '승리 불가 구간'}
                </div>
              </div>

              <div className="bg-white border border-indigo-100 rounded-xl p-3.5">
                <div className="text-xs text-slate-500">내 평균 데미지 vs 적 반격</div>
                <div className="text-base font-bold font-mono-num text-slate-900 mt-1">
                  {activeSimResult.expectedPlayerDmg} vs {activeSimResult.expectedEnemyDmg}
                </div>
              </div>

              <div className="bg-white border border-indigo-100 rounded-xl p-3.5 flex flex-col justify-between gap-2">
                <div className="text-xs text-slate-600 leading-snug">
                  {activeSimResult.recommendedStatHint}
                </div>
              </div>
            </div>

            <div className="w-full h-2.5 bg-white border border-indigo-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  activeSimResult.winRate >= 75
                    ? 'bg-emerald-500'
                    : activeSimResult.winRate >= 45
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(4, activeSimResult.winRate)}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Active Battle Arena */}
      {phase !== 'MONSTER_SELECT' && activeMonster && (
        <section className="bg-slate-900 text-white rounded-2xl p-6 space-y-6 border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="text-xs text-slate-300 font-mono-num">
              {activeMonster.rankLabel} · Turn {turnNumber} ·{' '}
              {phase === 'BATTLE'
                ? isEnemyTurn
                  ? '몬스터 공격 차례'
                  : '내 행동 선택'
                : phase === 'VICTORY'
                ? '토벌 승리'
                : '전투 패배'}
            </div>
            <button
              type="button"
              onClick={() => setPhase('MONSTER_SELECT')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg whitespace-nowrap"
            >
              던전 목록으로 돌아가기
            </button>
          </div>

          {/* Combatants Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Student Side */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-blue-300 font-mono-num">Lv.{currentLevel} 도전자</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {appState.profile.name}
                  </div>
                </div>
                <span className="text-xs font-mono-num text-emerald-300 inline-flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5" />
                  HP {playerHp} / {combatStats.maxHp}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-200"
                    style={{ width: `${Math.round((playerHp / combatStats.maxHp) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono-num text-slate-400">
                  <span>
                    상태: {shieldActive ? '방어 태세 활성' : playerHp < combatStats.maxHp * 0.3 ? '체력 주의' : '안정'}
                  </span>
                  <span>총합 스탯 {totalPower} pt</span>
                </div>
              </div>
            </div>

            {/* Monster / Boss Side */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <MonsterCrest monster={activeMonster} />
                  <div>
                    <div className="text-xs text-rose-300 font-mono-num">
                      {activeMonster.rankLabel} · ATK {activeMonster.attackPower}
                    </div>
                    <div className="text-lg font-bold text-white mt-0.5">{activeMonster.name}</div>
                  </div>
                </div>
                <span className="text-xs font-mono-num text-rose-300 inline-flex items-center gap-1 shrink-0">
                  <Flame className="w-3.5 h-3.5" />
                  HP {monsterHp} / {activeMonster.hp}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-200"
                    style={{ width: `${Math.round((monsterHp / activeMonster.hp) * 100)}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {activeMonster.description}
                </div>
              </div>
            </div>
          </div>

          {/* Action Deck / End-state Banner */}
          {phase === 'BATTLE' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                disabled={isEnemyTurn}
                onClick={() => handlePlayerSkill('knowledge_strike')}
                className="min-h-[56px] p-3.5 text-left bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition-colors flex flex-col justify-between"
              >
                <div className="text-sm font-bold text-white inline-flex items-center gap-1.5">
                  <Swords className="w-4 h-4" />
                  지식 일격
                </div>
                <div className="text-[11px] text-indigo-100 mt-1">
                  지식·수리 스탯 기반 안정적인 주력 공격
                </div>
              </button>

              <button
                type="button"
                disabled={isEnemyTurn}
                onClick={() => handlePlayerSkill('focus_combo')}
                className="min-h-[56px] p-3.5 text-left bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-xl transition-colors flex flex-col justify-between"
              >
                <div className="text-sm font-bold text-white inline-flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  집중 연타 (치명타 {combatStats.critChance + 12}%)
                </div>
                <div className="text-[11px] text-amber-100 mt-1">
                  집중·탐구력 기반 1.7배 치명타 노리기
                </div>
              </button>

              <button
                type="button"
                disabled={isEnemyTurn}
                onClick={() => handlePlayerSkill('autonomy_counter')}
                className="min-h-[56px] p-3.5 text-left bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl transition-colors flex flex-col justify-between"
              >
                <div className="text-sm font-bold text-white inline-flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  자기주도 회복반격
                </div>
                <div className="text-[11px] text-emerald-100 mt-1">
                  체력 회복 + 피해 경감 + 반격 데미지
                </div>
              </button>
            </div>
          )}

          {phase === 'VICTORY' && (
            <div className="bg-emerald-950/60 border border-emerald-700/70 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-base font-bold text-emerald-300 inline-flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  {activeMonster.name} 토벌 완료!
                </div>
                <p className="text-xs text-emerald-100 font-mono-num">{victoryRewardNote}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => startBattle(activeMonster)}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  다시 도전하기
                </button>
                <button
                  type="button"
                  onClick={() => setPhase('MONSTER_SELECT')}
                  className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl whitespace-nowrap"
                >
                  목록으로
                </button>
              </div>
            </div>
          )}

          {phase === 'DEFEAT' && (
            <div className="bg-rose-950/60 border border-rose-700/70 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-base font-bold text-rose-300 inline-flex items-center gap-2">
                  <Skull className="w-5 h-5" />
                  토벌 실패 — 스탯을 조금 더 키워보세요!
                </div>
                <p className="text-xs text-rose-100">
                  공부·운동·취미 활동을 기록해 체력과 공격력을 높인 뒤 재도전하면 쉽게 승리할 수 있습니다.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onGoToActivity}
                  className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl whitespace-nowrap"
                >
                  활동 기록해서 스탯 키우기
                </button>
                <button
                  type="button"
                  onClick={() => startBattle(activeMonster)}
                  className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl whitespace-nowrap"
                >
                  다시 도전
                </button>
              </div>
            </div>
          )}

          {/* Combat Log */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-400">전투 기록</div>
            <div className="space-y-1 max-h-36 overflow-y-auto text-xs font-mono-num">
              {combatLog.map((entry) => (
                <div
                  key={entry.id}
                  className={
                    entry.actor === 'player'
                      ? 'text-blue-300'
                      : entry.actor === 'monster'
                      ? 'text-rose-300'
                      : 'text-slate-300'
                  }
                >
                  {entry.text}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Dungeon Zones & Detailed Monster Appearance Guide */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 inline-flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-600" />
              던전 상세 정보 · 구역별 출현 몬스터
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              국어·수학·자습 등 각 던전을 선택하면 해당 던전에 등장하는 몬스터·보스와 공략 스탯을 확인할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedDungeonId('all')}
              className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap ${
                selectedDungeonId === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              전체 던전 ({MONSTER_CATALOG.length})
            </button>
            {DUNGEON_ZONES.map((zone) => {
              const count = MONSTER_CATALOG.filter((m) => m.dungeonId === zone.id).length;
              const active = selectedDungeonId === zone.id;
              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setSelectedDungeonId(zone.id)}
                  className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {zone.shortLabel} ({count})
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowDropGuide((v) => !v)}
              className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap ${
                showDropGuide
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Gift className="w-3.5 h-3.5 text-amber-600" />
              {showDropGuide ? '드랍·난이도 표 닫기' : '드랍 목록·난이도 표'}
            </button>
          </div>
        </div>

        {/* Consolidated Monster Drops & Dungeon Difficulty Guide Table */}
        {showDropGuide && (
          <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  던전 난이도 & 몬스터 드랍 보상 전체 도감
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  아이템 및 희귀 스탯은 최초 토벌 시 100% 확정 드랍되며, 반복 토벌 시 XP·코인을 계속 획득할 수 있습니다.
                </p>
              </div>
              <span className="text-xs font-mono-num text-slate-600">
                내 현재 스탯 총합: <strong className="text-slate-900">{totalPower} pt</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {DUNGEON_ZONES.map((zone) => {
                const stars = '★'.repeat(zone.difficultyStars) + '☆'.repeat(5 - zone.difficultyStars);
                return (
                  <div
                    key={zone.id}
                    className="bg-white border border-slate-200 rounded-xl p-3 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-900">{zone.shortLabel}</span>
                      <span className="font-mono-num text-amber-600 font-semibold">{stars}</span>
                    </div>
                    <div className="text-slate-600 font-mono-num">
                      난이도: <strong>{zone.difficultyTier}</strong> · {zone.difficultyLabel}
                    </div>
                    <div className="text-slate-500 font-mono-num">
                      권장 스탯: {zone.recommendedPowerRange}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">던전 / 몬스터</th>
                    <th className="py-2.5 px-3 font-semibold">난이도 · 권장 스탯</th>
                    <th className="py-2.5 px-3 font-semibold">최초 토벌 보상</th>
                    <th className="py-2.5 px-3 font-semibold">확정 드랍 아이템 · 특전</th>
                    <th className="py-2.5 px-3 font-semibold">반복 토벌</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono-num">
                  {MONSTER_CATALOG.filter(
                    (m) => selectedDungeonId === 'all' || m.dungeonId === selectedDungeonId
                  ).map((m) => {
                    const drop = m.dropItemId
                      ? ITEM_CATALOG.find((i) => i.id === m.dropItemId)
                      : undefined;
                    const zone = DUNGEON_ZONE_MAP[m.dungeonId];
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{m.name}</div>
                          <div className="text-[11px] text-slate-500 font-sans">
                            {zone.shortLabel} · {m.rankLabel}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          Lv.{m.requiredLevel}+ · 권장 {m.recommendedPower} pt
                        </td>
                        <td className="py-2.5 px-3 text-blue-700 font-semibold">
                          +{m.firstClearXp} XP · +{m.firstClearCoins} 코인
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          {drop || m.firstClearRareStat ? (
                            <div className="space-y-0.5">
                              {drop && (
                                <div className="font-semibold text-indigo-700">
                                  [{drop.name}] ({drop.effectSummary})
                                </div>
                              )}
                              {m.firstClearRareStat && (
                                <div className="text-amber-700 font-semibold">
                                  희귀 스탯 {RARE_STATS[m.firstClearRareStat.key].label} +{m.firstClearRareStat.amount}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">경험치·코인 전용</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          +{m.repeatXp} XP · +{m.repeatCoins} 코인
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedDungeonId === 'all' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DUNGEON_ZONES.map((zone) => {
              const zoneMonsters = MONSTER_CATALOG.filter((m) => m.dungeonId === zone.id);
              const clearedCount = zoneMonsters.filter(
                (m) => (appState.defeatedMonsters[m.id] ?? 0) > 0
              ).length;
              const stars = '★'.repeat(zone.difficultyStars) + '☆'.repeat(5 - zone.difficultyStars);
              return (
                <div
                  key={zone.id}
                  className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-indigo-700">{zone.subjectTag}</span>
                      <span className="font-mono-num">
                        난이도 {stars} ({zone.difficultyTier}) · 토벌 {clearedCount}/{zoneMonsters.length}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{zone.name}</h3>
                      <div className="text-[11px] font-mono-num text-slate-500 mt-0.5">
                        {zone.difficultyLabel} · 권장 스탯 총합 {zone.recommendedPowerRange}
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                        {zone.description}
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-500">
                        이 던전에 출현하는 몬스터 · 보스 ({zoneMonsters.length}종)
                      </div>
                      <ul className="space-y-1">
                        {zoneMonsters.map((m) => {
                          const defeated = (appState.defeatedMonsters[m.id] ?? 0) > 0;
                          return (
                            <li
                              key={m.id}
                              className="flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="text-slate-800 font-medium truncate">
                                <span className="text-slate-400 font-mono-num mr-1.5">
                                  {m.appearanceFloor}
                                </span>
                                · {m.name}
                              </span>
                              <span
                                className={`shrink-0 text-[11px] font-mono-num font-semibold ${
                                  m.isBoss
                                    ? 'text-rose-600'
                                    : defeated
                                    ? 'text-emerald-700'
                                    : 'text-slate-500'
                                }`}
                              >
                                {m.rankLabel} (Lv.{m.requiredLevel}+)
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-700">추천 스탯:</span>{' '}
                      {zone.recommendedStatsText}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedDungeonId(zone.id)}
                      className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      {zone.shortLabel} 상세 공략 보기
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          (() => {
            const zone = DUNGEON_ZONE_MAP[selectedDungeonId];
            const zoneMonsters = MONSTER_CATALOG.filter((m) => m.dungeonId === zone.id);
            const bossTarget = zoneMonsters.find((m) => m.isBoss) ?? zoneMonsters[zoneMonsters.length - 1];

            return (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-indigo-700 font-mono-num">
                      {zone.subjectTag} · 난이도 {'★'.repeat(zone.difficultyStars)}
                      {'☆'.repeat(5 - zone.difficultyStars)} ({zone.difficultyTier}) · 권장 스탯 {zone.recommendedPowerRange}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{zone.name}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
                      {zone.description}
                    </p>
                  </div>
                  {bossTarget && (
                    <button
                      type="button"
                      onClick={() => handleSimulateBattle(bossTarget)}
                      className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl whitespace-nowrap shrink-0"
                    >
                      <Activity className="w-4 h-4" />
                      {bossTarget.name} 승률 시뮬레이션
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-bold text-slate-800">추천 스탯 & 내 현재 세부 스탯</div>
                    <p className="text-xs text-slate-600">{zone.recommendedStatsText}</p>
                    <div className="pt-1 space-y-1">
                      {zone.recommendedSubStats.map((subKey) => (
                        <div
                          key={subKey}
                          className="flex items-center justify-between text-xs font-mono-num"
                        >
                          <span className="text-slate-600">{SUB_STAT_MAP[subKey].label}</span>
                          <span className="font-bold text-indigo-700">{subStats[subKey] ?? 0} pt</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-bold text-slate-800">추천 성장 활동 & 공략 팁</div>
                    <p className="text-xs text-slate-700 font-medium">{zone.recommendedActivities}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{zone.strategyTip}</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-bold text-slate-800">
                      층별 출현 몬스터 ({zoneMonsters.length}종)
                    </div>
                    <ul className="space-y-1.5">
                      {zoneMonsters.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between gap-2 text-xs border-b border-slate-100 last:border-0 pb-1 last:pb-0"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900">{m.name}</span>
                            <div className="text-[11px] text-slate-500 truncate">
                              {m.appearanceFloor}
                            </div>
                          </div>
                          <span
                            className={`text-[11px] font-mono-num font-semibold shrink-0 ${
                              m.isBoss ? 'text-rose-600' : 'text-slate-600'
                            }`}
                          >
                            HP {m.hp} · ATK {m.attackPower}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </section>

      {/* Monster & Boss Catalog */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">
            {selectedDungeonId === 'all'
              ? '전체 던전 몬스터 & 보스 목록'
              : `${DUNGEON_ZONE_MAP[selectedDungeonId].shortLabel} 출현 몬스터 & 보스`}
          </h2>
          <span className="text-xs font-mono-num text-slate-500">
            내 레벨 Lv.{currentLevel} · 내 스탯 총합 {totalPower} pt
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MONSTER_CATALOG.filter(
            (monster) => selectedDungeonId === 'all' || monster.dungeonId === selectedDungeonId
          ).map((monster) => {
            const levelOk = currentLevel >= monster.requiredLevel;
            const reqEntries = Object.entries(monster.requiredStats) as [CoreStatKey, number][];
            const lackingStats = reqEntries.filter(
              ([k, req]) => (coreStats[k] ?? 0) < req
            );
            const statsOk = lackingStats.length === 0;
            const unlocked = levelOk && statsOk;
            const defeatCount = appState.defeatedMonsters[monster.id] ?? 0;
            const dropItem = monster.dropItemId
              ? ITEM_CATALOG.find((i) => i.id === monster.dropItemId)
              : undefined;

            return (
              <div
                key={monster.id}
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between gap-4 ${
                  monster.isBoss && unlocked
                    ? 'border-rose-200'
                    : unlocked
                    ? 'border-slate-200'
                    : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                <div className="space-y-3">
                  {/* Quiet metadata row (zero pills) */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {monster.rankLabel} · Lv.{monster.requiredLevel}+ · HP {monster.hp}
                    </span>
                    <span
                      className={`font-semibold inline-flex items-center gap-1 ${
                        unlocked ? 'text-blue-700' : 'text-slate-500'
                      }`}
                    >
                      {unlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {defeatCount > 0 ? `${defeatCount}회 토벌` : unlocked ? '입장 가능' : '조건 잠김'}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <MonsterCrest monster={monster} />
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-indigo-700 inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {DUNGEON_ZONE_MAP[monster.dungeonId].shortLabel} · {monster.appearanceFloor}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">{monster.name}</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {monster.description}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        공략 포인트: {monster.weaknessNote}
                      </p>
                    </div>
                  </div>

                  {/* Requirement Checklist */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 text-xs font-mono-num">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">입장 레벨</span>
                      <span className={levelOk ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                        Lv.{monster.requiredLevel} {levelOk ? '(충족)' : `(현재 Lv.${currentLevel})`}
                      </span>
                    </div>
                    {reqEntries.map(([k, req]) => {
                      const cur = coreStats[k] ?? 0;
                      const ok = cur >= req;
                      return (
                        <div key={k} className="flex items-center justify-between">
                          <span className="text-slate-600">{CORE_STAT_MAP[k].label}</span>
                          <span className={ok ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                            {cur} / {req} {ok ? '(충족)' : `(${req - cur} 부족)`}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Rewards & Drops */}
                  <div className="text-xs text-slate-600 space-y-1 font-mono-num">
                    <div className="text-[11px] text-slate-500">
                      권장 스탯 총합 {monster.recommendedPower} pt (내 스탯 {totalPower} pt)
                    </div>
                    <div>
                      {defeatCount === 0 ? (
                        <span className="text-blue-700 font-semibold">
                          최초 토벌: +{monster.firstClearXp} XP · +{monster.firstClearCoins} 코인
                        </span>
                      ) : (
                        <span>
                          반복 토벌: +{monster.repeatXp} XP · +{monster.repeatCoins} 코인
                        </span>
                      )}
                    </div>
                    {(monster.firstClearRareStat || dropItem) && (
                      <div className={defeatCount === 0 ? 'text-indigo-700 font-semibold' : 'text-slate-400'}>
                        {defeatCount === 0 ? '최초 드랍:' : '최초 드랍 완료:'}{' '}
                        {monster.firstClearRareStat
                          ? `${RARE_STATS[monster.firstClearRareStat.key].label} +${monster.firstClearRareStat.amount}`
                          : ''}
                        {monster.firstClearRareStat && dropItem ? ' · ' : ''}
                        {dropItem ? `[${dropItem.name}]` : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Simulation Win Rate Preview */}
                {simResults[monster.id] && (
                  <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs font-mono-num">
                    <span className="text-indigo-800 font-semibold">현재 스탯 예상 승률</span>
                    <span
                      className={`font-extrabold ${
                        simResults[monster.id].winRate >= 75
                          ? 'text-emerald-700'
                          : simResults[monster.id].winRate >= 45
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {simResults[monster.id].winRate}%{' '}
                      {simResults[monster.id].winRate > 0
                        ? `(${simResults[monster.id].avgTurnsToWin}턴 예상)`
                        : '(스탯 부족)'}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulateBattle(monster)}
                    className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors whitespace-nowrap shrink-0"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    시뮬레이션
                  </button>
                  <button
                    type="button"
                    disabled={!unlocked}
                    onClick={() => startBattle(monster)}
                    className={`flex-1 min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors ${
                      unlocked
                        ? monster.isBoss
                          ? 'bg-rose-600 hover:bg-rose-700 text-white whitespace-nowrap'
                          : 'bg-slate-900 hover:bg-slate-800 text-white whitespace-nowrap'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed leading-tight text-center'
                    }`}
                  >
                    {unlocked ? (
                      <>
                        <Swords className="w-4 h-4" />
                        {defeatCount > 0 ? '다시 토벌 도전' : '던전 전투 시작'}
                      </>
                    ) : !levelOk ? (
                      `Lv.${monster.requiredLevel} 달성 시 해금`
                    ) : (
                      `${lackingStats.map(([k, v]) => `${CORE_STAT_MAP[k].label} +${v - (coreStats[k] ?? 0)}`).join(', ')} 필요`
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick summary of defeated bosses */}
      {Object.keys(appState.defeatedMonsters).length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="font-bold text-slate-900 inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            토벌 도감 달성:
          </span>
          {MONSTER_CATALOG.filter((m) => (appState.defeatedMonsters[m.id] ?? 0) > 0).map((m) => (
            <span key={m.id} className="font-mono-num">
              {m.name} ({appState.defeatedMonsters[m.id]}회)
            </span>
          ))}
        </section>
      )}
    </div>
  );
};
