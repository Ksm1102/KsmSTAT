import {
  CHALLENGE_CATALOG,
  ITEM_CATALOG,
  MONSTER_CATALOG,
  createInitialAppState,
  formatLocalDate,
  getDefaultSpecialEvents,
} from '../data/presets';
import {
  ActivityCategory,
  ActivityLog,
  AppState,
  ChallengeDefinition,
  CoreStatKey,
  CoreStatsMap,
  SpecialEvent,
  SubStatKey,
  SubStatsMap,
} from '../types/statup';

const STORAGE_KEY = 'statup_highschool_v2';

export const BONUS_POINTS_PER_LEVEL = 3;
export const STAT_POINTS_PER_BONUS = 5;

export function xpRequiredForNextLevel(level: number): number {
  // Lv1->2: 100, Lv2->3: 160, Lv3->4: 220, Lv4->5: 280 ...
  return 100 + (level - 1) * 60;
}

export interface LevelInfo {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
  totalEarnedBonusPoints: number;
}

export function getLevelInfo(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, totalXp);

  while (remaining >= xpRequiredForNextLevel(level)) {
    remaining -= xpRequiredForNextLevel(level);
    level += 1;
  }

  const nextLevelXp = xpRequiredForNextLevel(level);
  const progressPercent = Math.min(100, Math.round((remaining / nextLevelXp) * 100));
  const totalEarnedBonusPoints = (level - 1) * BONUS_POINTS_PER_LEVEL;

  return {
    level,
    currentLevelXp: remaining,
    nextLevelXp,
    progressPercent,
    totalEarnedBonusPoints,
  };
}

export function getStatTierInfo(value: number) {
  const tierSize = 50;
  const statLevel = Math.floor(value / tierSize) + 1;
  const current = value % tierSize;
  const progressPercent = Math.round((current / tierSize) * 100);
  return { statLevel, current, tierSize, progressPercent };
}

export function getAllEvents(state: AppState): SpecialEvent[] {
  return [...getDefaultSpecialEvents(), ...state.customEvents].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

export function getEventsForDate(state: AppState, dateStr: string): SpecialEvent[] {
  return getAllEvents(state).filter((evt) => evt.date === dateStr);
}

export function getAllChallenges(state: AppState): ChallengeDefinition[] {
  return [...CHALLENGE_CATALOG, ...state.customChallenges];
}

export function computeCoreStats(state: AppState): CoreStatsMap {
  const base: CoreStatsMap = {
    knowledge: 0,
    stamina: 0,
    autonomy: 0,
    focus: 0,
    inquiry: 0,
  };

  for (const log of state.logs) {
    for (const [k, v] of Object.entries(log.statGains)) {
      const key = k as CoreStatKey;
      base[key] += v ?? 0;
    }
  }

  // Quest bonuses for today if completed
  const today = formatLocalDate(new Date());
  for (const q of state.quests) {
    if (q.completedDate === today) {
      base[q.statKey] += q.statBonus;
    }
  }

  // Claimed challenge core stat rewards
  const allChallenges = getAllChallenges(state);
  for (const part of state.participations) {
    if (part.claimedAt) {
      const def = allChallenges.find((c) => c.id === part.challengeId);
      if (def) {
        base[def.rewardCoreStat] += def.rewardCoreStatAmount;
      }
    }
  }

  // Level-up allocated bonus points (each point = +5 stat)
  (Object.keys(state.bonusAllocations) as CoreStatKey[]).forEach((key) => {
    base[key] += (state.bonusAllocations[key] ?? 0) * STAT_POINTS_PER_BONUS;
  });

  // Instant item stat boosts
  (Object.keys(state.itemStatBonuses) as CoreStatKey[]).forEach((key) => {
    base[key] += state.itemStatBonuses[key] ?? 0;
  });

  return base;
}

export function getDefaultSubStatForCategory(category: ActivityCategory): SubStatKey {
  switch (category) {
    case 'study':
      return 'math_logic';
    case 'exercise':
      return 'cardio';
    case 'self_directed':
      return 'planning';
    case 'reading':
      return 'reading_literacy';
    case 'hobby':
      return 'hobby_creative';
  }
}

export function computeSubStats(state: AppState): SubStatsMap {
  const subs: SubStatsMap = {
    lang_eng: 0,
    math_logic: 0,
    science_social: 0,
    cardio: 0,
    strength_flex: 0,
    planning: 0,
    wrong_note: 0,
    deep_immersion: 0,
    condition_care: 0,
    reading_literacy: 0,
    career_inquiry: 0,
    hobby_creative: 0,
  };

  for (const log of state.logs) {
    if (log.subStatGains && Object.keys(log.subStatGains).length > 0) {
      for (const [k, v] of Object.entries(log.subStatGains)) {
        const key = k as SubStatKey;
        if (key in subs) {
          subs[key] += v ?? 0;
        }
      }
    } else {
      // Fallback mapping if log has no explicit subStatGains
      const primarySub = getDefaultSubStatForCategory(log.category);
      if (log.category === 'study') {
        subs[primarySub] += log.statGains.knowledge ?? 0;
        subs.deep_immersion += log.statGains.focus ?? 0;
        subs.planning += log.statGains.autonomy ?? 0;
      } else if (log.category === 'exercise') {
        subs.cardio += log.statGains.stamina ?? 0;
        subs.condition_care += log.statGains.focus ?? 0;
      } else if (log.category === 'self_directed') {
        subs.wrong_note += log.statGains.autonomy ?? 0;
        subs.science_social += log.statGains.knowledge ?? 0;
        subs.deep_immersion += log.statGains.focus ?? 0;
      } else if (log.category === 'hobby') {
        subs.hobby_creative += log.statGains.inquiry ?? 0;
        subs.condition_care += log.statGains.focus ?? 0;
        subs.strength_flex += log.statGains.stamina ?? 0;
      } else {
        subs.reading_literacy += log.statGains.inquiry ?? 0;
        subs.lang_eng += log.statGains.knowledge ?? 0;
        subs.planning += log.statGains.autonomy ?? 0;
      }
    }
  }

  // Quest completions today add to primary sub-stats
  const today = formatLocalDate(new Date());
  const corePrimarySub: Record<CoreStatKey, SubStatKey> = {
    knowledge: 'science_social',
    stamina: 'cardio',
    autonomy: 'planning',
    focus: 'deep_immersion',
    inquiry: 'reading_literacy',
  };

  for (const q of state.quests) {
    if (q.completedDate === today) {
      subs[corePrimarySub[q.statKey]] += q.statBonus;
    }
  }

  // Level-up allocated bonus points & item stat boosts reflect in primary sub-stat
  (Object.keys(state.bonusAllocations) as CoreStatKey[]).forEach((key) => {
    subs[corePrimarySub[key]] += (state.bonusAllocations[key] ?? 0) * STAT_POINTS_PER_BONUS;
  });

  (Object.keys(state.itemStatBonuses) as CoreStatKey[]).forEach((key) => {
    subs[corePrimarySub[key]] += state.itemStatBonuses[key] ?? 0;
  });

  // Claimed challenge core rewards
  const allChallenges = getAllChallenges(state);
  for (const part of state.participations) {
    if (part.claimedAt) {
      const def = allChallenges.find((c) => c.id === part.challengeId);
      if (def) {
        subs[corePrimarySub[def.rewardCoreStat]] += def.rewardCoreStatAmount;
      }
    }
  }

  return subs;
}

export function getTotalCoreStatPower(stats: CoreStatsMap): number {
  return stats.knowledge + stats.stamina + stats.autonomy + stats.focus + stats.inquiry;
}

export function calculateStreakDays(logs: ActivityLog[]): number {
  if (logs.length === 0) return 0;
  const dateSet = new Set(logs.map((l) => l.date));
  let streak = 0;
  const cursor = new Date();

  // If today has no logs yet, still allow checking yesterday so streak doesn't look broken mid-day
  const todayStr = formatLocalDate(cursor);
  if (!dateSet.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (dateSet.has(formatLocalDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export interface RewardPreview {
  xpEarned: number;
  coinsEarned: number;
  statGains: Partial<CoreStatsMap>;
  subStatGains: Partial<SubStatsMap>;
  appliedEventTitle?: string;
  appliedItemTags: string[];
}

export function calculateActivityRewards(
  state: AppState,
  category: ActivityCategory,
  minutes: number,
  dateStr: string,
  preferredSubStatKey?: SubStatKey
): RewardPreview {
  const clampedMinutes = Math.max(1, Math.min(360, minutes));
  const baseStatGains: Partial<CoreStatsMap> = {};
  let baseXp = clampedMinutes; // ~1 XP per minute baseline

  if (category === 'study') {
    baseStatGains.knowledge = Math.max(1, Math.round(clampedMinutes * 0.4));
    baseStatGains.focus = Math.max(1, Math.round(clampedMinutes * 0.2));
    if (clampedMinutes >= 10) {
      baseStatGains.autonomy = Math.max(1, Math.round(clampedMinutes * 0.08));
    }
  } else if (category === 'exercise') {
    baseXp = Math.round(clampedMinutes * 1.05);
    baseStatGains.stamina = Math.max(1, Math.round(clampedMinutes * 0.6));
    baseStatGains.focus = Math.max(1, Math.round(clampedMinutes * 0.2));
  } else if (category === 'self_directed') {
    baseXp = Math.round(clampedMinutes * 1.1);
    baseStatGains.autonomy = Math.max(1, Math.round(clampedMinutes * 0.45));
    baseStatGains.knowledge = Math.max(1, Math.round(clampedMinutes * 0.25));
    if (clampedMinutes >= 8) {
      baseStatGains.focus = Math.max(1, Math.round(clampedMinutes * 0.2));
    }
  } else if (category === 'hobby') {
    baseXp = Math.round(clampedMinutes * 0.95);
    baseStatGains.inquiry = Math.max(1, Math.round(clampedMinutes * 0.35));
    baseStatGains.focus = Math.max(1, Math.round(clampedMinutes * 0.3));
    if (clampedMinutes >= 10) {
      baseStatGains.stamina = Math.max(1, Math.round(clampedMinutes * 0.15));
    }
  } else {
    // reading
    baseXp = Math.round(clampedMinutes * 1.05);
    baseStatGains.inquiry = Math.max(1, Math.round(clampedMinutes * 0.45));
    baseStatGains.knowledge = Math.max(1, Math.round(clampedMinutes * 0.18));
    if (clampedMinutes >= 10) {
      baseStatGains.autonomy = Math.max(1, Math.round(clampedMinutes * 0.14));
    }
  }

  // Apply Equipped Gear bonuses
  let gearXpMult = 1;
  const appliedItemTags: string[] = [];
  for (const gearId of state.equippedGearIds) {
    const gear = ITEM_CATALOG.find((i) => i.id === gearId);
    if (!gear) continue;
    const matchesGear =
      gear.gearCategory === 'all' ||
      gear.gearCategory === category ||
      (gear.gearCategory === 'study' && category === 'self_directed');
    if (matchesGear) {
      if (gear.gearXpMultiplier) {
        gearXpMult *= gear.gearXpMultiplier;
      }
      if (gear.gearStatBonus) {
        for (const [k, v] of Object.entries(gear.gearStatBonus)) {
          const key = k as CoreStatKey;
          baseStatGains[key] = (baseStatGains[key] ?? 0) + (v ?? 0);
        }
      }
      appliedItemTags.push(gear.name);
    }
  }

  // Apply Active Consumable Buffs
  let buffXpMult = state.activeBuffs.xpMultiplier || 1;
  let buffStatMult = state.activeBuffs.statMultiplier || 1;
  if (state.activeBuffs.activeBuffNames.length > 0) {
    appliedItemTags.push(...state.activeBuffs.activeBuffNames);
  }

  // Apply Matching Date Event
  const matchingEvents = getEventsForDate(state, dateStr).filter(
    (evt) => evt.targetCategory === 'all' || evt.targetCategory === category
  );
  let eventXpMult = 1;
  let appliedEventTitle: string | undefined;
  if (matchingEvents.length > 0) {
    // Take strongest event multiplier if multiple
    const bestEvent = matchingEvents.reduce((prev, curr) =>
      curr.xpMultiplier >= prev.xpMultiplier ? curr : prev
    );
    eventXpMult = bestEvent.xpMultiplier;
    appliedEventTitle = `${bestEvent.title} (XP ${bestEvent.xpMultiplier}x)`;
    baseStatGains[bestEvent.bonusStatKey] =
      (baseStatGains[bestEvent.bonusStatKey] ?? 0) + bestEvent.bonusStatAmount;
  }

  const finalStatGains: Partial<CoreStatsMap> = {};
  for (const [k, v] of Object.entries(baseStatGains)) {
    const key = k as CoreStatKey;
    finalStatGains[key] = Math.max(1, Math.round((v ?? 0) * buffStatMult));
  }

  // Map finalStatGains directly into SubStats so parent total === sum of its sub-stats
  const chosenSub = preferredSubStatKey ?? getDefaultSubStatForCategory(category);
  const subStatGains: Partial<SubStatsMap> = {};

  if (category === 'study') {
    const kTarget: SubStatKey =
      chosenSub === 'lang_eng' || chosenSub === 'math_logic' || chosenSub === 'science_social'
        ? chosenSub
        : 'math_logic';
    if (finalStatGains.knowledge) subStatGains[kTarget] = finalStatGains.knowledge;
    if (finalStatGains.focus) subStatGains.deep_immersion = finalStatGains.focus;
    if (finalStatGains.autonomy) subStatGains.planning = finalStatGains.autonomy;
  } else if (category === 'exercise') {
    const sTarget: SubStatKey =
      chosenSub === 'cardio' || chosenSub === 'strength_flex' ? chosenSub : 'cardio';
    if (finalStatGains.stamina) subStatGains[sTarget] = finalStatGains.stamina;
    if (finalStatGains.focus) subStatGains.condition_care = finalStatGains.focus;
  } else if (category === 'self_directed') {
    const aTarget: SubStatKey =
      chosenSub === 'planning' || chosenSub === 'wrong_note' ? chosenSub : 'wrong_note';
    if (finalStatGains.autonomy) subStatGains[aTarget] = finalStatGains.autonomy;
    if (finalStatGains.knowledge) subStatGains.science_social = finalStatGains.knowledge;
    if (finalStatGains.focus) subStatGains.deep_immersion = finalStatGains.focus;
  } else if (category === 'hobby') {
    const hTarget: SubStatKey =
      chosenSub === 'hobby_creative' || chosenSub === 'condition_care' || chosenSub === 'deep_immersion'
        ? chosenSub
        : 'hobby_creative';
    if (hTarget === 'hobby_creative') {
      if (finalStatGains.inquiry) subStatGains.hobby_creative = finalStatGains.inquiry;
      if (finalStatGains.focus) subStatGains.condition_care = finalStatGains.focus;
    } else {
      if (finalStatGains.focus) subStatGains[hTarget] = finalStatGains.focus;
      if (finalStatGains.inquiry) subStatGains.hobby_creative = finalStatGains.inquiry;
    }
    if (finalStatGains.stamina) subStatGains.strength_flex = finalStatGains.stamina;
  } else {
    const iTarget: SubStatKey =
      chosenSub === 'reading_literacy' || chosenSub === 'career_inquiry'
        ? chosenSub
        : 'reading_literacy';
    if (finalStatGains.inquiry) subStatGains[iTarget] = finalStatGains.inquiry;
    if (finalStatGains.knowledge) subStatGains.lang_eng = finalStatGains.knowledge;
    if (finalStatGains.autonomy) subStatGains.planning = finalStatGains.autonomy;
  }

  const xpEarned = Math.max(3, Math.round(baseXp * gearXpMult * buffXpMult * eventXpMult));
  const coinsEarned = Math.max(2, Math.round(clampedMinutes * 0.45 * (eventXpMult > 1 ? 1.25 : 1)));

  return {
    xpEarned,
    coinsEarned,
    statGains: finalStatGains,
    subStatGains,
    appliedEventTitle,
    appliedItemTags,
  };
}

export function doesLogQualifyForChallenge(
  logsOnDate: ActivityLog[],
  challenge: ChallengeDefinition
): boolean {
  const matchingMinutes = logsOnDate
    .filter((l) => {
      if (challenge.category === 'all') return true;
      if (challenge.category === 'study') {
        return l.category === 'study' || l.category === 'self_directed';
      }
      return l.category === challenge.category;
    })
    .reduce((sum, l) => sum + l.minutes, 0);

  return matchingMinutes >= challenge.dailyMinMinutes;
}

export type RankingMetric = 'overall' | 'knowledge' | 'stamina' | 'autonomy' | 'weeklyMinutes';
export type RankingScope = 'all' | 'grade' | 'friends';

export interface LeaderboardEntry {
  id: string;
  name: string;
  grade: '고1' | '고2' | '고3';
  track: string;
  isMe: boolean;
  isFriend: boolean;
  level: number;
  totalXp: number;
  totalPower: number;
  knowledge: number;
  stamina: number;
  autonomy: number;
  focus: number;
  inquiry: number;
  weeklyMinutes: number;
  streak: number;
  rareScore: number;
  metricValue: number;
  rank: number;
}

const RIVAL_STUDENTS: Omit<LeaderboardEntry, 'rank' | 'metricValue' | 'isMe'>[] = [
  {
    id: 'rival-1',
    name: '이민준',
    grade: '고2',
    track: '이과 · 컴퓨터공학 지망',
    isFriend: true,
    level: 6,
    totalXp: 890,
    totalPower: 315,
    knowledge: 88,
    stamina: 52,
    autonomy: 72,
    focus: 63,
    inquiry: 40,
    weeklyMinutes: 640,
    streak: 11,
    rareScore: 14,
  },
  {
    id: 'rival-2',
    name: '박하은',
    grade: '고2',
    track: '자연 · 생명과학 지망',
    isFriend: true,
    level: 5,
    totalXp: 670,
    totalPower: 274,
    knowledge: 74,
    stamina: 44,
    autonomy: 65,
    focus: 51,
    inquiry: 40,
    weeklyMinutes: 510,
    streak: 8,
    rareScore: 11,
  },
  {
    id: 'rival-3',
    name: '최도윤',
    grade: '고3',
    track: '수능 집중 · 기계공학',
    isFriend: false,
    level: 8,
    totalXp: 1380,
    totalPower: 392,
    knowledge: 118,
    stamina: 61,
    autonomy: 85,
    focus: 78,
    inquiry: 50,
    weeklyMinutes: 890,
    streak: 19,
    rareScore: 22,
  },
  {
    id: 'rival-4',
    name: '정수아',
    grade: '고2',
    track: '문과 · 경영경제 지망',
    isFriend: true,
    level: 4,
    totalXp: 470,
    totalPower: 228,
    knowledge: 56,
    stamina: 39,
    autonomy: 49,
    focus: 41,
    inquiry: 43,
    weeklyMinutes: 390,
    streak: 5,
    rareScore: 7,
  },
  {
    id: 'rival-5',
    name: '강태오',
    grade: '고1',
    track: '체대입시 · 스포츠과학',
    isFriend: true,
    level: 5,
    totalXp: 610,
    totalPower: 266,
    knowledge: 45,
    stamina: 95,
    autonomy: 46,
    focus: 48,
    inquiry: 32,
    weeklyMinutes: 480,
    streak: 9,
    rareScore: 10,
  },
  {
    id: 'rival-6',
    name: '윤채원',
    grade: '고3',
    track: '인문 · 미디어커뮤니케이션',
    isFriend: false,
    level: 7,
    totalXp: 1120,
    totalPower: 344,
    knowledge: 92,
    stamina: 48,
    autonomy: 77,
    focus: 65,
    inquiry: 62,
    weeklyMinutes: 740,
    streak: 14,
    rareScore: 18,
  },
  {
    id: 'rival-7',
    name: '한지우',
    grade: '고1',
    track: '공통 · 자기주도 루틴 도전',
    isFriend: false,
    level: 3,
    totalXp: 310,
    totalPower: 182,
    knowledge: 42,
    stamina: 38,
    autonomy: 40,
    focus: 33,
    inquiry: 29,
    weeklyMinutes: 270,
    streak: 4,
    rareScore: 4,
  },
];

export function buildLeaderboard(
  state: AppState,
  metric: RankingMetric,
  scope: RankingScope
): LeaderboardEntry[] {
  const stats = computeCoreStats(state);
  const levelInfo = getLevelInfo(state.totalXp);
  const totalPower = getTotalCoreStatPower(stats);
  const streak = calculateStreakDays(state.logs);
  const rareScore =
    state.rareStats.metacognition + state.rareStats.grit + state.rareStats.insight;

  // Weekly minutes (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const startDate = formatLocalDate(sevenDaysAgo);
  const weeklyMinutes = state.logs
    .filter((l) => l.date >= startDate)
    .reduce((sum, l) => sum + l.minutes, 0);

  const me: Omit<LeaderboardEntry, 'rank' | 'metricValue'> = {
    id: 'me',
    name: state.profile.name,
    grade: state.profile.grade,
    track: state.profile.track,
    isMe: true,
    isFriend: true,
    level: levelInfo.level,
    totalXp: state.totalXp,
    totalPower,
    knowledge: stats.knowledge,
    stamina: stats.stamina,
    autonomy: stats.autonomy,
    focus: stats.focus,
    inquiry: stats.inquiry,
    weeklyMinutes,
    streak,
    rareScore,
  };

  const peers = RIVAL_STUDENTS.map((r) => ({ ...r, isMe: false }));
  const filtered = [me, ...peers].filter((entry) => {
    if (entry.isMe) return true;
    if (scope === 'grade') return entry.grade === state.profile.grade;
    if (scope === 'friends') return entry.isFriend;
    return true;
  });

  const getMetricValue = (entry: Omit<LeaderboardEntry, 'rank' | 'metricValue'>): number => {
    switch (metric) {
      case 'knowledge':
        return entry.knowledge;
      case 'stamina':
        return entry.stamina;
      case 'autonomy':
        return entry.autonomy;
      case 'weeklyMinutes':
        return entry.weeklyMinutes;
      case 'overall':
      default:
        return entry.totalPower;
    }
  };

  const sorted = filtered
    .map((entry) => ({
      ...entry,
      metricValue: getMetricValue(entry),
      rank: 0,
    }))
    .sort((a, b) => b.metricValue - a.metricValue || b.totalXp - a.totalXp);

  return sorted.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialAppState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const fallback = createInitialAppState();
    return {
      ...fallback,
      ...parsed,
      profile: { ...fallback.profile, ...(parsed.profile ?? {}) },
      bonusAllocations: { ...fallback.bonusAllocations, ...(parsed.bonusAllocations ?? {}) },
      itemStatBonuses: { ...fallback.itemStatBonuses, ...(parsed.itemStatBonuses ?? {}) },
      rareStats: { ...fallback.rareStats, ...(parsed.rareStats ?? {}) },
      activeBuffs: { ...fallback.activeBuffs, ...(parsed.activeBuffs ?? {}) },
      inventory: parsed.inventory ?? fallback.inventory,
      equippedGearIds: parsed.equippedGearIds ?? fallback.equippedGearIds,
      customChallenges: parsed.customChallenges ?? fallback.customChallenges,
      customEvents: parsed.customEvents ?? fallback.customEvents,
      claimedEventDates: parsed.claimedEventDates ?? fallback.claimedEventDates,
      selectedGoalIds: parsed.selectedGoalIds ?? fallback.selectedGoalIds,
      completedGoalIds: parsed.completedGoalIds ?? fallback.completedGoalIds,
      defeatedMonsters: parsed.defeatedMonsters ?? fallback.defeatedMonsters,
      unlockedTitleIds: Array.isArray(parsed.unlockedTitleIds)
        ? parsed.unlockedTitleIds
        : fallback.unlockedTitleIds,
      equippedTitleId: parsed.equippedTitleId ?? fallback.equippedTitleId,
    };
  } catch {
    return createInitialAppState();
  }
}

export function evaluateNewlyUnlockedTitles(state: AppState): string[] {
  const level = getLevelInfo(state.totalXp).level;
  const core = computeCoreStats(state);
  const sub = computeSubStats(state);
  const streak = calculateStreakDays(state.logs);
  const already = new Set(state.unlockedTitleIds ?? []);

  const maxCoreStat = Math.max(core.knowledge, core.stamina, core.autonomy, core.focus, core.inquiry);
  const minCoreStat = Math.min(core.knowledge, core.stamina, core.autonomy, core.focus, core.inquiry);

  const minutesByDate: Record<string, number> = {};
  let has60MinSingle = false;
  let selfDirectedCount = 0;
  let hobbyCount = 0;
  let readingCount = 0;

  for (const log of state.logs) {
    minutesByDate[log.date] = (minutesByDate[log.date] ?? 0) + log.minutes;
    if (log.minutes >= 60) has60MinSingle = true;
    if (log.category === 'self_directed') selfDirectedCount += 1;
    if (log.category === 'hobby') hobbyCount += 1;
    if (log.category === 'reading') readingCount += 1;
  }
  const maxDayMinutes = Math.max(0, ...Object.values(minutesByDate));
  const bossDefeated = MONSTER_CATALOG.some(
    (m) => m.isBoss && (state.defeatedMonsters[m.id] ?? 0) > 0
  );

  const checks: [string, boolean][] = [
    ['title-first-step', state.logs.length >= 1],
    ['title-one-way', level <= 3 && maxCoreStat >= 25],
    ['title-specialist', level <= 4 && maxCoreStat >= 55],
    ['title-desk-marathoner', maxDayMinutes >= 100],
    ['title-focus-god', has60MinSingle || core.focus >= 35],
    ['title-brawn-scholar', core.knowledge >= 25 && core.stamina >= 25],
    ['title-wrong-slayer', selfDirectedCount >= 3 && sub.wrong_note >= 15],
    ['title-hobby-genius', hobbyCount >= 2 && sub.hobby_creative >= 12],
    ['title-inquiry-seeker', readingCount >= 3 && core.inquiry >= 25],
    ['title-streak-3', streak >= 3],
    ['title-pentagon', minCoreStat >= 20],
    ['title-boss-breaker', bossDefeated],
  ];

  return checks
    .filter(([id, met]) => met && !already.has(id))
    .map(([id]) => id);
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors cleanly
  }
}
