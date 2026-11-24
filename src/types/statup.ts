export type ActivityCategory = 'study' | 'exercise' | 'self_directed' | 'reading' | 'hobby';

export type CoreStatKey = 'knowledge' | 'stamina' | 'autonomy' | 'focus' | 'inquiry';

export type SubStatKey =
  | 'lang_eng'
  | 'math_logic'
  | 'science_social'
  | 'cardio'
  | 'strength_flex'
  | 'planning'
  | 'wrong_note'
  | 'deep_immersion'
  | 'condition_care'
  | 'reading_literacy'
  | 'career_inquiry'
  | 'hobby_creative';

export type RareStatKey = 'metacognition' | 'grit' | 'insight';

export type CoreStatsMap = Record<CoreStatKey, number>;

export type SubStatsMap = Record<SubStatKey, number>;

export type RareStatsMap = Record<RareStatKey, number>;

export interface SubStatDefinition {
  key: SubStatKey;
  parentKey: CoreStatKey;
  label: string;
  description: string;
}

export interface StatDefinition {
  key: CoreStatKey;
  label: string;
  englishLabel: string;
  description: string;
  color: string;
  bgTint: string;
  textColor: string;
  borderColor: string;
  subStats: SubStatDefinition[];
}

export interface RareStatDefinition {
  key: RareStatKey;
  label: string;
  description: string;
  color: string;
}

export interface ActivityPreset {
  id: string;
  title: string;
  category: ActivityCategory;
  defaultMinutes: number;
  subStatKey: SubStatKey;
  description: string;
}

export interface ActivityLog {
  id: string;
  title: string;
  category: ActivityCategory;
  minutes: number;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO string
  memo?: string;
  xpEarned: number;
  statGains: Partial<CoreStatsMap>;
  subStatGains?: Partial<SubStatsMap>;
  eventTag?: string;
  itemBonusTag?: string;
}

export interface DailyQuest {
  id: string;
  title: string;
  category: ActivityCategory;
  bonusXp: number;
  statKey: CoreStatKey;
  statBonus: number;
  completedDate: string | null; // YYYY-MM-DD
}

export interface ChallengeDefinition {
  id: string;
  title: string;
  description: string;
  category: ActivityCategory | 'all';
  targetDays: number;
  dailyMinMinutes: number;
  rewardXp: number;
  rewardCoins: number;
  rewardRareStat: RareStatKey;
  rewardRareStatAmount: number;
  rewardCoreStat: CoreStatKey;
  rewardCoreStatAmount: number;
  badgeTitle: string;
  badgeDescription: string;
  isCustom?: boolean;
}

export interface ChallengeParticipation {
  challengeId: string;
  joinedAt: string; // YYYY-MM-DD
  completedDates: string[]; // array of YYYY-MM-DD
  claimedAt: string | null; // ISO string when reward was claimed
}

export interface UnlockedBadge {
  id: string;
  title: string;
  description: string;
  challengeTitle: string;
  rareStatLabel: string;
  unlockedAt: string;
}

export interface SpecialEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD (exact specific day)
  targetCategory: ActivityCategory | 'all';
  xpMultiplier: number; // e.g. 1.5 or 2.0
  bonusStatKey: CoreStatKey;
  bonusStatAmount: number;
  bonusFlatXp: number;
  bonusCoins: number;
  isCustom?: boolean;
}

export type ItemKind = 'consumable' | 'gear';

export interface ItemDefinition {
  id: string;
  name: string;
  kind: ItemKind;
  description: string;
  effectSummary: string;
  price: number;
  rarity: '일반' | '고급' | '희귀';
  // For instant consumables
  instantStats?: Partial<CoreStatsMap>;
  instantXp?: number;
  // For next-activity buff consumables
  nextActivityXpMultiplier?: number;
  nextActivityStatMultiplier?: number;
  // For challenge shield
  isChallengeShield?: boolean;
  // For equipable gear
  gearCategory?: ActivityCategory | 'all';
  gearStatBonus?: Partial<CoreStatsMap>;
  gearXpMultiplier?: number;
}

export interface ActiveBuffs {
  xpMultiplier: number; // 1 = normal, 2 = 2x next activity
  statMultiplier: number; // 1 = normal, 1.5 = +50% stats next activity
  activeBuffNames: string[];
}

export interface MasteryGoal {
  id: string;
  title: string;
  description: string;
  category: ActivityCategory | 'all';
  requiredLevel: number;
  requiredStats: Partial<CoreStatsMap>;
  targetMinutesToClear: number;
  rewardXp: number;
  rewardCoins: number;
  rewardRareStat: RareStatKey;
  rewardRareStatAmount: number;
}

export type DungeonZoneId =
  | 'korean'
  | 'math_science'
  | 'self_stamina'
  | 'final_mock';

export interface DungeonZoneDefinition {
  id: DungeonZoneId;
  name: string;
  shortLabel: string;
  subjectTag: string;
  description: string;
  difficultyLabel: string;
  difficultyTier: '입문 · 초급' | '중급' | '상급' | '최상급';
  difficultyStars: number;
  recommendedPowerRange: string;
  recommendedStatsText: string;
  recommendedActivities: string;
  recommendedSubStats: SubStatKey[];
  strategyTip: string;
}

export interface MonsterDefinition {
  id: string;
  dungeonId: DungeonZoneId;
  appearanceFloor: string;
  weaknessNote: string;
  name: string;
  rankLabel: '일반 몬스터' | '정예 몬스터' | '중간 보스' | '최종 보스';
  isBoss: boolean;
  description: string;
  hp: number;
  attackPower: number;
  requiredLevel: number;
  requiredStats: Partial<CoreStatsMap>;
  recommendedPower: number;
  firstClearXp: number;
  firstClearCoins: number;
  repeatXp: number;
  repeatCoins: number;
  firstClearRareStat?: { key: RareStatKey; amount: number };
  dropItemId?: string;
}

export type TitleRarity = '일반' | '고급' | '희귀' | '전설';

export interface TitleDefinition {
  id: string;
  name: string;
  flavorText: string;
  conditionText: string;
  rarity: TitleRarity;
}

export interface GlobalTitleRecord {
  titleId: string;
  firstHolderUid: string;
  firstHolderName: string;
  firstHolderGrade: '고1' | '고2' | '고3';
  achievedAtIso: string;
}

export interface UserProfile {
  name: string;
  grade: '고1' | '고2' | '고3';
  track: string;
}

export interface AppState {
  profile: UserProfile;
  totalXp: number;
  coins: number;
  spentBonusPoints: number;
  bonusAllocations: CoreStatsMap;
  itemStatBonuses: CoreStatsMap;
  rareStats: RareStatsMap;
  logs: ActivityLog[];
  quests: DailyQuest[];
  customChallenges: ChallengeDefinition[];
  participations: ChallengeParticipation[];
  badges: UnlockedBadge[];
  customEvents: SpecialEvent[];
  claimedEventDates: string[]; // eventId_date keys for one-time special day bonus
  inventory: Record<string, number>; // itemId -> count
  equippedGearIds: string[]; // up to 2 equipped gear items
  activeBuffs: ActiveBuffs;
  selectedGoalIds: string[];
  completedGoalIds: string[];
  defeatedMonsters: Record<string, number>; // monsterId -> defeat count
  unlockedTitleIds: string[];
  equippedTitleId: string | null;
}

export interface FeedbackToast {
  id: string;
  title: string;
  subtitle: string;
  type: 'xp' | 'levelup' | 'challenge' | 'share' | 'event' | 'item' | 'battle';
}
