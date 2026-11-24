import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  Award,
  Calendar,
  Check,
  CheckCircle2,
  Coins,
  Crown,
  History,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Shuffle,
  ShieldCheck,
  Sparkles,
  Swords,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { ActivityModal } from './components/ActivityModal';
import { ChallengeShareModal } from './components/ChallengeShareModal';
import { ChallengesView } from './components/ChallengesView';
import { DungeonView } from './components/DungeonView';
import { EventsAndItemsView } from './components/EventsAndItemsView';
import { LoginScreen } from './components/LoginScreen';
import { MasteryGoalsSection } from './components/MasteryGoalsSection';
import { RadarChart } from './components/RadarChart';
import { RankingView } from './components/RankingView';
import { TimerAndReportView } from './components/TimerAndReportView';
import { TitleCatalogModal } from './components/TitleCatalogModal';
import { TitleUnlockOverlay } from './components/TitleUnlockOverlay';
import {
  ACTIVITY_PRESETS,
  CATEGORY_META,
  CORE_STATS,
  CORE_STAT_MAP,
  ITEM_CATALOG,
  MASTERY_GOALS,
  MICRO_ACTIVITY_PRESETS,
  RARE_STATS,
  TITLE_CATALOG,
  TITLE_MAP,
  createInitialAppState,
  formatLocalDate,
} from './data/presets';
import {
  CloudLeaderboardPeer,
  auth,
  claimOrFetchFirstTitleHolder,
  deleteAccountDataFromFirestore,
  fetchAllGlobalTitleHolders,
  fetchCloudLeaderboard,
  loadOrCreateUserProfile,
  saveUserStateToFirestore,
  signInWithGoogle,
  signOutAccount,
  testConnection,
} from './lib/firebase';
import {
  ActivityCategory,
  ActivityLog,
  AppState,
  ChallengeDefinition,
  CoreStatKey,
  DailyQuest,
  FeedbackToast,
  GlobalTitleRecord,
  MonsterDefinition,
  RareStatKey,
  SpecialEvent,
  SubStatKey,
  UserProfile,
} from './types/statup';
import {
  STAT_POINTS_PER_BONUS,
  calculateActivityRewards,
  calculateStreakDays,
  computeCoreStats,
  computeSubStats,
  doesLogQualifyForChallenge,
  evaluateNewlyUnlockedTitles,
  getAllChallenges,
  getEventsForDate,
  getLevelInfo,
  getStatTierInfo,
  getTotalCoreStatPower,
  loadAppState,
  saveAppState,
} from './utils/calculations';

type NavTab = 'dashboard' | 'dungeon' | 'challenges' | 'events_items' | 'ranking_records';
type RecordsSubTab = 'ranking' | 'records';

const NAV_ITEMS: { key: NavTab; label: string }[] = [
  { key: 'dashboard', label: '대시보드' },
  { key: 'dungeon', label: '던전 토벌' },
  { key: 'challenges', label: '챌린지' },
  { key: 'events_items', label: '달력 · 상점' },
  { key: 'ranking_records', label: '랭킹 · 기록' },
];

function getIsoWeekLabel(date: Date): { key: string; label: string } {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const year = tmp.getUTCFullYear();
  return {
    key: `${year}-W${String(weekNo).padStart(2, '0')}`,
    label: `${year}년 ${weekNo}주차`,
  };
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);

  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [isPublicInRanking, setIsPublicInRanking] = useState(true);
  const [cloudPeers, setCloudPeers] = useState<CloudLeaderboardPeer[]>([]);

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [recordsSubTab, setRecordsSubTab] = useState<RecordsSubTab>('ranking');
  const [weeklyRerollOffset, setWeeklyRerollOffset] = useState(0);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [modalPreset, setModalPreset] = useState<{
    category: ActivityCategory;
    title: string;
    minutes: number;
    date?: string;
  }>({ category: 'study', title: '', minutes: 40 });

  const [shareTarget, setShareTarget] = useState<ChallengeDefinition | null>(null);
  const [toasts, setToasts] = useState<FeedbackToast[]>([]);
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestCategory, setNewQuestCategory] = useState<ActivityCategory>('self_directed');
  const [quickLogMode, setQuickLogMode] = useState<'normal' | 'micro'>('normal');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');

  // Titles & Global First Discoverer state
  const [globalTitles, setGlobalTitles] = useState<Record<string, GlobalTitleRecord>>({});
  const [titleUnlockQueue, setTitleUnlockQueue] = useState<string[]>([]);
  const [loadingGlobalTitleId, setLoadingGlobalTitleId] = useState<string | null>(null);
  const [isTitleCatalogOpen, setIsTitleCatalogOpen] = useState(false);

  const skipNextCloudSaveRef = useRef(false);
  const scrollToHistoryRef = useRef(false);
  const pendingGradeRef = useRef<'고1' | '고2' | '고3' | null>(null);
  const pendingNicknameRef = useRef<string>('');

  const pushToast = useCallback(
    (title: string, subtitle: string, type: FeedbackToast['type'] = 'xp') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { id, title, subtitle, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    []
  );

  // Initial Firestore connectivity verification + Firebase Auth listener
  useEffect(() => {
    testConnection();
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setGuestMode(false);
        setCloudLoading(true);
        try {
          const loaded = await loadOrCreateUserProfile(user);
          skipNextCloudSaveRef.current = true;
          const chosenGrade = pendingGradeRef.current;
          const chosenNickname = pendingNicknameRef.current.trim().slice(0, 40);
          if (
            (chosenGrade || chosenNickname) &&
            loaded.appState.logs.length === 0 &&
            loaded.appState.totalXp === 0
          ) {
            setAppState({
              ...loaded.appState,
              profile: {
                ...loaded.appState.profile,
                ...(chosenGrade ? { grade: chosenGrade } : {}),
                ...(chosenNickname ? { name: chosenNickname } : {}),
              },
            });
          } else {
            setAppState(loaded.appState);
          }
          pendingGradeRef.current = null;
          pendingNicknameRef.current = '';
          setIsPublicInRanking(loaded.isPublicInRanking);
          const [peers, titlesMap] = await Promise.all([
            fetchCloudLeaderboard(),
            fetchAllGlobalTitleHolders(),
          ]);
          setCloudPeers(peers);
          setGlobalTitles(titlesMap);
        } catch (err) {
          console.error(err);
          setAuthError('클라우드 프로필을 불러오는 중 문제가 발생했습니다.');
        } finally {
          setCloudLoading(false);
          setAuthReady(true);
        }
      } else {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // Persist locally always; sync to Firestore when authenticated
  useEffect(() => {
    saveAppState(appState);

    if (!currentUser) return;
    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      saveUserStateToFirestore(currentUser, appState, isPublicInRanking).catch((e) =>
        console.error(e)
      );
    }, 350);

    return () => window.clearTimeout(timer);
  }, [appState, currentUser, isPublicInRanking]);

  // Automatic Title Unlock Detection + Server First-Discoverer Claim
  useEffect(() => {
    if (!authReady || cloudLoading) return;
    const newlyUnlocked = evaluateNewlyUnlockedTitles(appState);
    if (newlyUnlocked.length === 0) return;

    setAppState((prev) => {
      const merged = Array.from(new Set([...(prev.unlockedTitleIds ?? []), ...newlyUnlocked]));
      return { ...prev, unlockedTitleIds: merged };
    });

    setTitleUnlockQueue((q) => [...q, ...newlyUnlocked.filter((id) => !q.includes(id))]);

    if (currentUser) {
      newlyUnlocked.forEach((titleId) => {
        setLoadingGlobalTitleId(titleId);
        claimOrFetchFirstTitleHolder(currentUser, titleId, appState.profile)
          .then((record) => {
            setGlobalTitles((prev) => ({ ...prev, [titleId]: record }));
          })
          .catch((err) => console.error(err))
          .finally(() => {
            setLoadingGlobalTitleId((cur) => (cur === titleId ? null : cur));
          });
      });
    }
  }, [appState, authReady, cloudLoading, currentUser]);

  const handleGoogleLogin = async (
    selectedGrade?: '고1' | '고2' | '고3',
    selectedNickname?: string
  ) => {
    setAuthError(null);
    if (selectedGrade) {
      pendingGradeRef.current = selectedGrade;
    }
    if (selectedNickname && selectedNickname.trim()) {
      pendingNicknameRef.current = selectedNickname.trim().slice(0, 40);
    }
    try {
      await signInWithGoogle();
      pushToast('Google 로그인 완료', '내 학습 기록과 개인정보가 안전하게 보호됩니다.', 'xp');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      if (msg.includes('popup-closed-by-user')) {
        setAuthError('로그인 창이 닫혔습니다. 다시 시도해주세요.');
      } else {
        setAuthError('Google 로그인 연결 중 문제가 발생했습니다. 팝업 차단을 해제 후 다시 시도해주세요.');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOutAccount();
    } catch (err) {
      console.error(err);
    }
    setGuestMode(false);
    setCloudPeers([]);
    setAppState(createInitialAppState());
    setActiveTab('dashboard');
    setIsEditingNickname(false);
    setIsTitleCatalogOpen(false);
    setIsActivityModalOpen(false);
    setTitleUnlockQueue([]);
    pushToast('로그아웃 완료', '안전하게 계정이 로그아웃되었습니다.', 'share');
  };

  const handleExitGuest = () => {
    setGuestMode(false);
    setActiveTab('dashboard');
    setIsEditingNickname(false);
    setIsTitleCatalogOpen(false);
    setIsActivityModalOpen(false);
    setTitleUnlockQueue([]);
    pushToast('체험 모드 종료', '로그인 화면으로 돌아왔습니다.', 'share');
  };

  const levelInfo = useMemo(() => getLevelInfo(appState.totalXp), [appState.totalXp]);
  const coreStats = useMemo(() => computeCoreStats(appState), [appState]);
  const subStats = useMemo(() => computeSubStats(appState), [appState]);
  const totalPower = useMemo(() => getTotalCoreStatPower(coreStats), [coreStats]);
  const streakDays = useMemo(() => calculateStreakDays(appState.logs), [appState.logs]);
  const availableBonusPoints = Math.max(
    0,
    levelInfo.totalEarnedBonusPoints - appState.spentBonusPoints
  );

  const today = formatLocalDate(new Date());
  const todayEvents = useMemo(() => getEventsForDate(appState, today), [appState, today]);
  const todayMinutes = useMemo(
    () => appState.logs.filter((l) => l.date === today).reduce((s, l) => s + l.minutes, 0),
    [appState.logs, today]
  );

  // Weekly 1-per-week random activity highlight (seeded deterministically by ISO week)
  const weeklySpotlight = useMemo(() => {
    const weekInfo = getIsoWeekLabel(new Date());
    if (appState.logs.length === 0) {
      return { weekLabel: weekInfo.label, activity: null as ActivityLog | null };
    }
    let hash = 0;
    for (let i = 0; i < weekInfo.key.length; i += 1) {
      hash = (hash * 31 + weekInfo.key.charCodeAt(i)) >>> 0;
    }
    const idx = (hash + weeklyRerollOffset) % appState.logs.length;
    return { weekLabel: weekInfo.label, activity: appState.logs[idx] };
  }, [appState.logs, weeklyRerollOffset]);

  useEffect(() => {
    if (activeTab === 'ranking_records' && recordsSubTab === 'records' && scrollToHistoryRef.current) {
      scrollToHistoryRef.current = false;
      window.setTimeout(() => {
        document.getElementById('activity-history-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    }
  }, [activeTab, recordsSubTab]);

  const openFullActivityArchive = useCallback(() => {
    scrollToHistoryRef.current = true;
    setActiveTab('ranking_records');
    setRecordsSubTab('records');
  }, []);

  // Log an activity (shared by Modal, Quick Presets, and Focus Timer)
  const recordActivity = useCallback(
    (payload: {
      title: string;
      category: ActivityCategory;
      minutes: number;
      date: string;
      memo?: string;
      subStatKey?: SubStatKey;
    }) => {
      setAppState((prev) => {
        const prevLevel = getLevelInfo(prev.totalXp).level;
        const reward = calculateActivityRewards(
          prev,
          payload.category,
          payload.minutes,
          payload.date,
          payload.subStatKey
        );

        const newLog: ActivityLog = {
          id: `log-${Date.now()}`,
          title: payload.title,
          category: payload.category,
          minutes: payload.minutes,
          date: payload.date,
          createdAt: new Date().toISOString(),
          memo: payload.memo,
          xpEarned: reward.xpEarned,
          statGains: reward.statGains,
          subStatGains: reward.subStatGains,
          eventTag: reward.appliedEventTitle,
          itemBonusTag:
            reward.appliedItemTags.length > 0 ? reward.appliedItemTags.join(', ') : undefined,
        };

        const updatedLogs = [newLog, ...prev.logs];
        const nextTotalXp = prev.totalXp + reward.xpEarned;
        const nextLevel = getLevelInfo(nextTotalXp).level;

        // Auto-update active challenges matching this date
        const allChallenges = getAllChallenges(prev);
        const logsOnDate = updatedLogs.filter((l) => l.date === payload.date);
        const updatedParticipations = prev.participations.map((part) => {
          const def = allChallenges.find((c) => c.id === part.challengeId);
          if (!def) return part;
          if (part.completedDates.includes(payload.date)) return part;
          if (part.completedDates.length >= def.targetDays) return part;
          if (doesLogQualifyForChallenge(logsOnDate, def)) {
            return {
              ...part,
              completedDates: [...part.completedDates, payload.date],
            };
          }
          return part;
        });

        const statSummary = (Object.entries(reward.statGains) as [CoreStatKey, number][])
          .map(([k, v]) => `${CORE_STAT_MAP[k].label} +${v}`)
          .join(' · ');

        if (nextLevel > prevLevel) {
          pushToast(
            `레벨 업! Lv.${prevLevel} → Lv.${nextLevel}`,
            `${statSummary} · 보너스 스탯 +${(nextLevel - prevLevel) * 3}pt 지급!`,
            'levelup'
          );
        } else {
          pushToast(
            `+${reward.xpEarned} XP · +${reward.coinsEarned} 코인`,
            statSummary,
            'xp'
          );
        }

        return {
          ...prev,
          totalXp: nextTotalXp,
          coins: prev.coins + reward.coinsEarned,
          logs: updatedLogs,
          participations: updatedParticipations,
          // Consume one-time next-activity buffs
          activeBuffs: {
            xpMultiplier: 1,
            statMultiplier: 1,
            activeBuffNames: [],
          },
        };
      });
    },
    [pushToast]
  );

  // Allocate Level-Up Bonus Stat Point
  const handleAllocateBonusPoint = (statKey: CoreStatKey) => {
    if (availableBonusPoints <= 0) return;
    setAppState((prev) => ({
      ...prev,
      spentBonusPoints: prev.spentBonusPoints + 1,
      bonusAllocations: {
        ...prev.bonusAllocations,
        [statKey]: (prev.bonusAllocations[statKey] ?? 0) + 1,
      },
    }));
    pushToast(
      `${CORE_STAT_MAP[statKey].label} +${STAT_POINTS_PER_BONUS} 스탯 상승`,
      '레벨업 보너스 포인트 1pt를 투자했습니다.',
      'levelup'
    );
  };

  // Daily Quest toggle
  const handleToggleQuest = (questId: string) => {
    setAppState((prev) => {
      const target = prev.quests.find((q) => q.id === questId);
      if (!target) return prev;
      const wasDoneToday = target.completedDate === today;
      const prevLevel = getLevelInfo(prev.totalXp).level;
      const nextXp = Math.max(
        0,
        prev.totalXp + (wasDoneToday ? -target.bonusXp : target.bonusXp)
      );
      const nextCoins = Math.max(0, prev.coins + (wasDoneToday ? -15 : 15));
      const nextLevel = getLevelInfo(nextXp).level;

      if (!wasDoneToday) {
        if (nextLevel > prevLevel) {
          pushToast(
            `루틴 달성 & 레벨 업! Lv.${nextLevel}`,
            `${CORE_STAT_MAP[target.statKey].label} +${target.statBonus} · +${target.bonusXp} XP`,
            'levelup'
          );
        } else {
          pushToast(
            `오늘의 루틴 완료 (+${target.bonusXp} XP)`,
            `${CORE_STAT_MAP[target.statKey].label} +${target.statBonus} · +15 코인`,
            'xp'
          );
        }
      }

      return {
        ...prev,
        totalXp: nextXp,
        coins: nextCoins,
        quests: prev.quests.map((q) =>
          q.id === questId ? { ...q, completedDate: wasDoneToday ? null : today } : q
        ),
      };
    });
  };

  const handleAddQuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestTitle.trim()) return;
    const statMap: Record<ActivityCategory, CoreStatKey> = {
      study: 'knowledge',
      exercise: 'stamina',
      self_directed: 'autonomy',
      reading: 'inquiry',
      hobby: 'inquiry',
    };
    const newQuest: DailyQuest = {
      id: `quest-${Date.now()}`,
      title: newQuestTitle.trim(),
      category: newQuestCategory,
      bonusXp: 25,
      statKey: statMap[newQuestCategory],
      statBonus: 6,
      completedDate: null,
    };
    setAppState((prev) => ({ ...prev, quests: [...prev.quests, newQuest] }));
    setNewQuestTitle('');
  };

  // Challenges handlers
  const handleJoinChallenge = (challengeId: string) => {
    setAppState((prev) => {
      if (prev.participations.some((p) => p.challengeId === challengeId)) return prev;
      return {
        ...prev,
        participations: [
          ...prev.participations,
          {
            challengeId,
            joinedAt: today,
            completedDates: [],
            claimedAt: null,
          },
        ],
      };
    });
    pushToast('챌린지 참여 시작!', '매일 목표를 실천하고 희귀 스탯과 뱃지를 획득하세요.', 'challenge');
  };

  const handleCheckInChallenge = (challengeId: string) => {
    setAppState((prev) => ({
      ...prev,
      participations: prev.participations.map((p) => {
        if (p.challengeId !== challengeId) return p;
        if (p.completedDates.includes(today)) return p;
        return { ...p, completedDates: [...p.completedDates, today] };
      }),
    }));
    pushToast('오늘 챌린지 출석 완료 (+1일)', '꾸준함이 가장 강력한 스탯입니다.', 'challenge');
  };

  const handleUseShieldOnChallenge = (challengeId: string) => {
    const shieldCount = appState.inventory['item-challenge-shield'] ?? 0;
    if (shieldCount <= 0) return;

    setAppState((prev) => {
      const part = prev.participations.find((p) => p.challengeId === challengeId);
      if (!part) return prev;
      const syntheticDate = `shield-${part.completedDates.length + 1}-${Date.now()}`;
      return {
        ...prev,
        inventory: {
          ...prev.inventory,
          'item-challenge-shield': Math.max(0, (prev.inventory['item-challenge-shield'] ?? 1) - 1),
        },
        participations: prev.participations.map((p) =>
          p.challengeId === challengeId
            ? { ...p, completedDates: [...p.completedDates, syntheticDate] }
            : p
        ),
      };
    });
    pushToast('연속기록 방어권 사용!', '챌린지 달성 일수가 +1일 보충되었습니다.', 'item');
  };

  const handleClaimChallengeReward = (challengeId: string) => {
    const allChallenges = getAllChallenges(appState);
    const def = allChallenges.find((c) => c.id === challengeId);
    if (!def) return;

    setAppState((prev) => {
      const part = prev.participations.find((p) => p.challengeId === challengeId);
      if (!part || part.claimedAt || part.completedDates.length < def.targetDays) return prev;

      const rareDef = RARE_STATS[def.rewardRareStat];
      return {
        ...prev,
        totalXp: prev.totalXp + def.rewardXp,
        coins: prev.coins + def.rewardCoins,
        rareStats: {
          ...prev.rareStats,
          [def.rewardRareStat]: (prev.rareStats[def.rewardRareStat] ?? 0) + def.rewardRareStatAmount,
        },
        participations: prev.participations.map((p) =>
          p.challengeId === challengeId ? { ...p, claimedAt: new Date().toISOString() } : p
        ),
        badges: [
          {
            id: `badge-${def.id}-${Date.now()}`,
            title: def.badgeTitle,
            description: def.badgeDescription,
            challengeTitle: def.title,
            rareStatLabel: `${rareDef.label} +${def.rewardRareStatAmount}`,
            unlockedAt: today,
          },
          ...prev.badges,
        ],
      };
    });

    pushToast(
      `챌린지 완주 보상 획득! [${def.badgeTitle}]`,
      `${RARE_STATS[def.rewardRareStat].label} +${def.rewardRareStatAmount} · +${def.rewardXp} XP · +${def.rewardCoins} 코인`,
      'challenge'
    );
  };

  const handleCreateCustomChallenge = (challenge: ChallengeDefinition) => {
    setAppState((prev) => ({
      ...prev,
      customChallenges: [challenge, ...prev.customChallenges],
      participations: [
        ...prev.participations,
        {
          challengeId: challenge.id,
          joinedAt: today,
          completedDates: [],
          claimedAt: null,
        },
      ],
    }));
    pushToast('새 챌린지 생성 & 참여 완료', challenge.title, 'challenge');
  };

  // Mastery Goals (Level + Stat gated)
  const handleSelectMasteryGoal = (goalId: string) => {
    const goal = MASTERY_GOALS.find((g) => g.id === goalId);
    if (!goal) return;
    if (levelInfo.level < goal.requiredLevel) return;
    const statsOk = (Object.entries(goal.requiredStats) as [CoreStatKey, number][]).every(
      ([k, req]) => (coreStats[k] ?? 0) >= req
    );
    if (!statsOk) return;

    setAppState((prev) => ({
      ...prev,
      selectedGoalIds: prev.selectedGoalIds.includes(goalId)
        ? prev.selectedGoalIds
        : [...prev.selectedGoalIds, goalId],
    }));
    pushToast('마일스톤 목표 선택!', `${goal.title} 도전을 시작했습니다.`, 'challenge');
  };

  const handleCompleteMasteryGoal = (goalId: string) => {
    const goal = MASTERY_GOALS.find((g) => g.id === goalId);
    if (!goal) return;
    setAppState((prev) => {
      if (prev.completedGoalIds.includes(goalId)) return prev;
      return {
        ...prev,
        totalXp: prev.totalXp + goal.rewardXp,
        coins: prev.coins + goal.rewardCoins,
        rareStats: {
          ...prev.rareStats,
          [goal.rewardRareStat]:
            (prev.rareStats[goal.rewardRareStat] ?? 0) + goal.rewardRareStatAmount,
        },
        selectedGoalIds: prev.selectedGoalIds.filter((id) => id !== goalId),
        completedGoalIds: [...prev.completedGoalIds, goalId],
      };
    });
    pushToast(
      `마일스톤 목표 달성!`,
      `+${goal.rewardXp} XP · +${goal.rewardCoins} 코인 · ${RARE_STATS[goal.rewardRareStat].label} +${goal.rewardRareStatAmount}`,
      'levelup'
    );
  };

  // Events & Items handlers
  const handleClaimEventAttendance = (event: SpecialEvent) => {
    const key = `${event.id}_${event.date}`;
    if (appState.claimedEventDates.includes(key)) return;
    setAppState((prev) => ({
      ...prev,
      totalXp: prev.totalXp + event.bonusFlatXp,
      coins: prev.coins + event.bonusCoins,
      itemStatBonuses: {
        ...prev.itemStatBonuses,
        [event.bonusStatKey]:
          (prev.itemStatBonuses[event.bonusStatKey] ?? 0) + event.bonusStatAmount,
      },
      claimedEventDates: [...prev.claimedEventDates, key],
    }));
    pushToast(
      `스페셜 데이 보상 수령!`,
      `${CORE_STAT_MAP[event.bonusStatKey].label} +${event.bonusStatAmount} · +${event.bonusFlatXp} XP · +${event.bonusCoins} 코인`,
      'event'
    );
  };

  const handleCreateCustomEvent = (event: SpecialEvent) => {
    setAppState((prev) => ({
      ...prev,
      customEvents: [...prev.customEvents, event],
    }));
    pushToast('특정 날 이벤트 등록 완료', `${event.date} · ${event.title}`, 'event');
  };

  const handleBuyItem = (itemId: string) => {
    const item = ITEM_CATALOG.find((i) => i.id === itemId);
    if (!item || appState.coins < item.price) return;
    setAppState((prev) => ({
      ...prev,
      coins: prev.coins - item.price,
      inventory: {
        ...prev.inventory,
        [itemId]: (prev.inventory[itemId] ?? 0) + 1,
      },
    }));
    pushToast('아이템 구매 완료', `${item.name}이(가) 가방에 추가되었습니다.`, 'item');
  };

  const handleUseConsumable = (itemId: string) => {
    const item = ITEM_CATALOG.find((i) => i.id === itemId);
    const count = appState.inventory[itemId] ?? 0;
    if (!item || count <= 0 || item.kind !== 'consumable') return;

    setAppState((prev) => {
      const nextInventory = { ...prev.inventory, [itemId]: count - 1 };
      const nextItemStats = { ...prev.itemStatBonuses };
      if (item.instantStats) {
        (Object.entries(item.instantStats) as [CoreStatKey, number][]).forEach(([k, v]) => {
          nextItemStats[k] = (nextItemStats[k] ?? 0) + v;
        });
      }

      const nextBuffs = { ...prev.activeBuffs };
      if (item.nextActivityXpMultiplier) {
        nextBuffs.xpMultiplier = Math.max(nextBuffs.xpMultiplier, item.nextActivityXpMultiplier);
        nextBuffs.activeBuffNames = [...nextBuffs.activeBuffNames, item.name];
      }
      if (item.nextActivityStatMultiplier) {
        nextBuffs.statMultiplier = Math.max(
          nextBuffs.statMultiplier,
          item.nextActivityStatMultiplier
        );
        nextBuffs.activeBuffNames = [...nextBuffs.activeBuffNames, item.name];
      }

      return {
        ...prev,
        totalXp: prev.totalXp + (item.instantXp ?? 0),
        itemStatBonuses: nextItemStats,
        inventory: nextInventory,
        activeBuffs: nextBuffs,
      };
    });
    pushToast(`${item.name} 사용!`, item.effectSummary, 'item');
  };

  const handleToggleEquipGear = (itemId: string) => {
    const item = ITEM_CATALOG.find((i) => i.id === itemId);
    if (!item || item.kind !== 'gear') return;
    setAppState((prev) => {
      const isEquipped = prev.equippedGearIds.includes(itemId);
      if (isEquipped) {
        return {
          ...prev,
          equippedGearIds: prev.equippedGearIds.filter((id) => id !== itemId),
        };
      }
      const nextEquipped = [...prev.equippedGearIds, itemId].slice(-2);
      return {
        ...prev,
        equippedGearIds: nextEquipped,
      };
    });
    pushToast(
      appState.equippedGearIds.includes(itemId) ? '장비 해제됨' : '장비 장착 완료!',
      item.effectSummary,
      'item'
    );
  };

  // RPG Dungeon Monster & Boss Victory Handler
  const handleDefeatMonster = useCallback(
    (monster: MonsterDefinition) => {
      setAppState((prev) => {
        const prevLevel = getLevelInfo(prev.totalXp).level;
        const prevCount = prev.defeatedMonsters[monster.id] ?? 0;
        const isFirstClear = prevCount === 0;
        const gainedXp = isFirstClear ? monster.firstClearXp : monster.repeatXp;
        const gainedCoins = isFirstClear ? monster.firstClearCoins : monster.repeatCoins;
        const nextTotalXp = prev.totalXp + gainedXp;
        const nextLevel = getLevelInfo(nextTotalXp).level;

        const nextRareStats = { ...prev.rareStats };
        if (isFirstClear && monster.firstClearRareStat) {
          nextRareStats[monster.firstClearRareStat.key] =
            (nextRareStats[monster.firstClearRareStat.key] ?? 0) +
            monster.firstClearRareStat.amount;
        }

        const nextInventory = { ...prev.inventory };
        if (isFirstClear && monster.dropItemId) {
          nextInventory[monster.dropItemId] = (nextInventory[monster.dropItemId] ?? 0) + 1;
        }

        if (nextLevel > prevLevel) {
          pushToast(
            `${monster.name} 토벌 & 레벨 업! Lv.${nextLevel}`,
            `+${gainedXp} XP · +${gainedCoins} 코인 · 보너스 스탯 +${(nextLevel - prevLevel) * 3}pt`,
            'levelup'
          );
        } else {
          pushToast(
            `${monster.name} ${isFirstClear ? '최초 토벌 성공!' : '토벌 완료!'}`,
            `+${gainedXp} XP · +${gainedCoins} 코인`,
            'battle'
          );
        }

        return {
          ...prev,
          totalXp: nextTotalXp,
          coins: prev.coins + gainedCoins,
          rareStats: nextRareStats,
          inventory: nextInventory,
          defeatedMonsters: {
            ...prev.defeatedMonsters,
            [monster.id]: prevCount + 1,
          },
        };
      });
    },
    [pushToast]
  );

  const handleDeleteLog = (logId: string) => {
    setAppState((prev) => ({
      ...prev,
      logs: prev.logs.filter((l) => l.id !== logId),
    }));
  };

  const handleUpdateProfile = (profile: UserProfile, nextPublic: boolean) => {
    setAppState((prev) => ({ ...prev, profile }));
    setIsPublicInRanking(nextPublic);
    pushToast('프로필 및 개인정보 설정 저장', '변경 사항이 안전하게 반영되었습니다.', 'share');
  };

  const handleChangeGrade = (nextGrade: '고1' | '고2' | '고3') => {
    if (appState.profile.grade === nextGrade) return;
    setAppState((prev) => ({
      ...prev,
      profile: { ...prev.profile, grade: nextGrade },
    }));
    pushToast(
      `고등학교 학년 변경: ${nextGrade}`,
      '동학년 랭킹 비교와 칭호 기록에 즉시 반영됩니다.',
      'xp'
    );
  };

  const handleSaveNickname = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleaned = nicknameDraft.trim().slice(0, 40);
    if (!cleaned) {
      setIsEditingNickname(false);
      return;
    }
    setAppState((prev) => ({
      ...prev,
      profile: { ...prev.profile, name: cleaned },
    }));
    setIsEditingNickname(false);
    pushToast(
      `닉네임 변경 완료: ${cleaned}`,
      '랭킹·던전·칭호 도감에 새 닉네임이 반영됩니다.',
      'share'
    );
  };

  const handleResetSampleData = () => {
    const fresh = createInitialAppState();
    setAppState(fresh);
    pushToast('초기 샘플 데이터 복원', '기본 고등학생 성장 데이터로 복원되었습니다.', 'xp');
  };

  const handleDeleteCloudData = async () => {
    if (!currentUser) return;
    await deleteAccountDataFromFirestore(currentUser);
    await signOutAccount();
    setGuestMode(false);
    setCloudPeers([]);
    setAppState(createInitialAppState());
    setActiveTab('dashboard');
    setIsEditingNickname(false);
    setTitleUnlockQueue([]);
    pushToast('클라우드 데이터 영구 삭제 완료', '안전하게 계정이 로그아웃되었습니다.', 'share');
  };

  // Loading state while verifying Firebase Auth session
  if (!authReady || cloudLoading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl px-8 py-6 text-center space-y-2">
          <div className="text-base font-bold text-slate-900">가능?</div>
          <p className="text-xs text-slate-500">안전한 계정 세션과 성장 데이터를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  // Show LoginScreen if not authenticated and not in explicit guest preview mode
  if (!currentUser && !guestMode) {
    return (
      <LoginScreen
        initialGrade={appState.profile.grade}
        onGoogleLogin={(grade, nickname) => handleGoogleLogin(grade, nickname)}
        onContinueGuest={(grade, nickname) => {
          setAppState((prev) => ({
            ...prev,
            profile: {
              ...prev.profile,
              grade,
              ...(nickname ? { name: nickname } : {}),
            },
          }));
          setGuestMode(true);
        }}
        authError={authError}
      />
    );
  }

  const shareParticipation = shareTarget
    ? appState.participations.find((p) => p.challengeId === shareTarget.id) ?? null
    : null;

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900 pb-20 md:pb-12">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            가능?
          </button>

          {/* Zone 2: 5 concise single-line text nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    active
                      ? 'text-blue-600 border-blue-600 font-semibold'
                      : 'text-slate-600 border-transparent hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary CTA Action + Account Logout */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={currentUser ? handleLogout : handleExitGuest}
              aria-label={currentUser ? '로그아웃' : '게스트 모드 나가기'}
              title={currentUser ? '로그아웃' : '로그인 화면으로 돌아가기'}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{currentUser ? '로그아웃' : '나가기'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setModalPreset({ category: 'study', title: '', minutes: 45 });
                setIsActivityModalOpen(true);
              }}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              활동 기록하기
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation (within 15% sticky height cap) */}
      <nav
        aria-label="모바일 메뉴"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-slate-200 grid grid-cols-5 h-14"
      >
        {NAV_ITEMS.map((item) => {
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              className={`text-[11px] font-semibold px-1 truncate ${
                active ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-8">
        {activeTab === 'dashboard' && (
          <>
            {/* Hero Student Growth Summary + Level & XP + Bonus Stat Points */}
            <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <div
                      className="inline-flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg"
                      role="group"
                      aria-label="고등학교 학년 선택"
                    >
                      {(['고1', '고2', '고3'] as const).map((g) => {
                        const active = appState.profile.grade === g;
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => handleChangeGrade(g)}
                            className={`px-2 py-0.5 text-xs font-bold rounded-md transition-colors ${
                              active
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {g}
                          </button>
                        );
                      })}
                    </div>
                    <span aria-hidden="true">·</span>
                    <span>{appState.profile.track}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">연속 {streakDays}일 기록 중</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {currentUser ? 'Google 보안 클라우드 동기화' : '브라우저 체험 모드'}
                    </span>
                  </div>
                  {isEditingNickname ? (
                    <form onSubmit={handleSaveNickname} className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        maxLength={40}
                        autoFocus
                        value={nicknameDraft}
                        onChange={(e) => setNicknameDraft(e.target.value)}
                        placeholder="새 닉네임 입력 (최대 40자)"
                        className="px-3 py-1.5 text-base font-bold text-slate-900 bg-white border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <button
                        type="submit"
                        className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                      >
                        <Check className="w-3.5 h-3.5" />
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingNickname(false)}
                        className="min-h-[36px] inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                      >
                        <X className="w-3.5 h-3.5" />
                        취소
                      </button>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight [text-wrap:balance]">
                        {appState.equippedTitleId && TITLE_MAP[appState.equippedTitleId] ? (
                          <span className="text-amber-600 mr-2">
                            「{TITLE_MAP[appState.equippedTitleId].name}」
                          </span>
                        ) : null}
                        {appState.profile.name}님의 성장 스탯
                      </h1>
                      <button
                        type="button"
                        onClick={() => {
                          setNicknameDraft(appState.profile.name);
                          setIsEditingNickname(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Pencil className="w-3 h-3" />
                        닉네임 변경
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-slate-500">
                    {appState.profile.grade === '고1'
                      ? '고1 맞춤 포커스: 내신 기본기와 꾸준한 자기주도·진로 탐색 루틴을 쌓는 시기입니다.'
                      : appState.profile.grade === '고2'
                      ? '고2 맞춤 포커스: 과목별 심화 탐구(세특)와 모의고사·체력 균형을 맞추는 시기입니다.'
                      : '고3 맞춤 포커스: 수능 실전 집중력과 1교시~전 영역 멘탈·체력 관리가 핵심입니다.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                      <Coins className="w-4 h-4 text-amber-500" />
                      <span className="font-mono-num font-bold text-slate-900">{appState.coins}</span> 코인
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="font-mono-num text-slate-700">
                      오늘 <strong className="text-slate-900">{todayMinutes}분</strong> 실천
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsTitleCatalogOpen(true)}
                    className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl whitespace-nowrap"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    칭호 도감 ({appState.unlockedTitleIds.length}/{TITLE_CATALOG.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('events_items')}
                    className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl whitespace-nowrap"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    성장 달력
                  </button>

                  {currentUser ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl whitespace-nowrap"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      로그아웃
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleGoogleLogin()}
                        className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl whitespace-nowrap"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        Google 로그인 연결
                      </button>
                      <button
                        type="button"
                        onClick={handleExitGuest}
                        className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl whitespace-nowrap"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        게스트 나가기
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Character Level & XP Bar */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-4 border-t border-slate-100">
                <div className="lg:col-span-7 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-2xl font-extrabold font-mono-num text-blue-600">
                        Lv.{levelInfo.level}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        총합 능력치 <span className="font-mono-num text-slate-900">{totalPower} pt</span> · 누적{' '}
                        <span className="font-mono-num text-slate-900">{appState.totalXp} XP</span>
                      </span>
                    </div>
                    <span className="text-xs font-mono-num text-slate-500">
                      다음 레벨까지 {levelInfo.nextLevelXp - levelInfo.currentLevelXp} XP
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${levelInfo.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono-num text-slate-500">
                    <span>
                      현재 레벨 진행도 {levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} XP
                    </span>
                    <span>{levelInfo.progressPercent}%</span>
                  </div>
                </div>

                {/* Level-Up Stat Bonus Allocator */}
                <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 inline-flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                      레벨업 스탯 보너스 분배
                    </span>
                    <span className="font-mono-num font-bold text-blue-700">
                      남은 포인트 {availableBonusPoints} pt
                    </span>
                  </div>
                  {availableBonusPoints > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {CORE_STATS.map((stat) => (
                        <button
                          key={stat.key}
                          type="button"
                          onClick={() => handleAllocateBonusPoint(stat.key)}
                          className="px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg transition-colors whitespace-nowrap font-mono-num"
                        >
                          {stat.label} +{STAT_POINTS_PER_BONUS}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      다음 레벨에 도달하면 원하는 능력치에 투자할 보너스 포인트 3pt가 지급됩니다.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Today's Active Special Event Strip */}
            {todayEvents.length > 0 && (
              <section className="bg-white border border-blue-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-blue-700 inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    오늘 진행 중인 특정 날 이벤트 · {today}
                  </div>
                  <div className="text-base font-bold text-slate-900">{todayEvents[0].title}</div>
                  <p className="text-xs text-slate-600">{todayEvents[0].description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {(() => {
                    const evt = todayEvents[0];
                    const claimed = appState.claimedEventDates.includes(`${evt.id}_${evt.date}`);
                    return (
                      <button
                        type="button"
                        disabled={claimed}
                        onClick={() => handleClaimEventAttendance(evt)}
                        className={`min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap ${
                          claimed
                            ? 'bg-emerald-50 text-emerald-700 cursor-default'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {claimed ? '오늘 이벤트 보너스 수령 완료' : '오늘 이벤트 보너스 받기'}
                      </button>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => setActiveTab('events_items')}
                    className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl whitespace-nowrap"
                  >
                    전체 이벤트 · 상점 보기
                  </button>
                </div>
              </section>
            )}

            {/* Core Stats Radar + 5 Stat Progress Bars */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">5대 핵심 능력치 밸런스</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    공부·운동·자기주도·독서 활동이 실시간으로 능력치에 반영됩니다.
                  </p>
                </div>
                <div className="my-4">
                  <RadarChart stats={coreStats} />
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">챌린지 희귀 스탯</span>
                  <div className="flex items-center gap-3 font-mono-num">
                    {(['metacognition', 'grit', 'insight'] as RareStatKey[]).map((rk) => (
                      <span key={rk} className="font-semibold" style={{ color: RARE_STATS[rk].color }}>
                        {RARE_STATS[rk].label} {appState.rareStats[rk]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">세부 스탯 현황</h2>
                  {(appState.equippedGearIds.length > 0 ||
                    appState.activeBuffs.activeBuffNames.length > 0) && (
                    <span className="text-xs text-blue-700 font-medium inline-flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" />
                      장비 {appState.equippedGearIds.length}개 · 버프{' '}
                      {appState.activeBuffs.activeBuffNames.length}개 활성
                    </span>
                  )}
                </div>

                <div className="space-y-4 my-auto">
                  {CORE_STATS.map((stat) => {
                    const value = coreStats[stat.key];
                    const tier = getStatTierInfo(value);
                    return (
                      <div key={stat.key} className="space-y-2 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="flex items-baseline gap-2 min-w-0">
                            <span className="text-sm font-bold text-slate-900">{stat.label}</span>
                            <span className="text-xs text-slate-500 truncate">
                              {stat.description}
                            </span>
                          </div>
                          <div className="shrink-0 font-mono-num text-sm font-bold text-slate-900">
                            <span className="text-xs font-medium text-slate-500 mr-2">
                              Tier {tier.statLevel}
                            </span>
                            {value} pt
                          </div>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${value === 0 ? 0 : Math.max(4, tier.progressPercent)}%`,
                              backgroundColor: stat.color,
                            }}
                          />
                        </div>
                        {/* Sub-stats breakdown for this core stat */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                          {stat.subStats.map((sub) => (
                            <span key={sub.key} className="inline-flex items-center gap-1.5" title={sub.description}>
                              <span className="text-slate-500">{sub.label}</span>
                              <span className="font-mono-num font-semibold text-slate-800">
                                {subStats[sub.key] ?? 0}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>각 스탯은 50 pt 단위로 숙련 티어가 상승합니다.</span>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setActiveTab('dungeon')}
                      className="font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      스탯으로 던전 보스 잡기
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('ranking_records');
                        setRecordsSubTab('ranking');
                      }}
                      className="font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      내 스탯 랭킹 확인하기
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Weekly Random Activity Reminder + Quick Full Archive Access */}
            <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-2 min-w-0">
                <div className="text-xs font-semibold text-violet-700 inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  이번 주 랜덤 활동 리마인더 · {weeklySpotlight.weekLabel}
                </div>
                {weeklySpotlight.activity ? (
                  <>
                    <div className="text-base font-bold text-slate-900">
                      {weeklySpotlight.activity.title}
                    </div>
                    <div className="text-xs text-slate-600 font-mono-num flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{weeklySpotlight.activity.date}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className="font-sans font-semibold"
                        style={{ color: CATEGORY_META[weeklySpotlight.activity.category].color }}
                      >
                        {CATEGORY_META[weeklySpotlight.activity.category].label}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{weeklySpotlight.activity.minutes}분</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-blue-700 font-semibold">
                        +{weeklySpotlight.activity.xpEarned} XP
                      </span>
                    </div>
                    {weeklySpotlight.activity.memo && (
                      <p className="text-xs text-slate-500">
                        메모: {weeklySpotlight.activity.memo}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-base font-bold text-slate-900">
                      매주 한 번, 내가 해낸 지난 활동을 랜덤으로 다시 보여드려요
                    </div>
                    <p className="text-xs text-slate-500">
                      첫 공부·운동·취미 활동을 기록하면 이번 주부터 랜덤 추억 리마인더가 자동으로 뽑힙니다.
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {appState.logs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setWeeklyRerollOffset((n) => n + 1)}
                    className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl whitespace-nowrap"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    다른 활동 랜덤 보기
                  </button>
                )}
                <button
                  type="button"
                  onClick={openFullActivityArchive}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl whitespace-nowrap"
                >
                  <History className="w-3.5 h-3.5" />
                  지금까지 한 활동 전체 보기 ({appState.logs.length}건)
                </button>
              </div>
            </section>

            {/* Quick-Log Activity Presets + Today's Daily Quests */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Quick Log */}
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">원클릭 빠른 활동 기록</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {quickLogMode === 'micro'
                        ? '시간이 없는 날에도 3분·5분 초단기 틈새 활동으로 스탯을 쌓아보세요.'
                        : '클릭 즉시 오늘 활동으로 기록되어 스탯과 경험치가 올라갑니다.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setQuickLogMode('normal')}
                        className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                          quickLogMode === 'normal'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        일반 루틴
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickLogMode('micro')}
                        className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                          quickLogMode === 'micro'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        3·5분 틈새 모드
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(quickLogMode === 'micro' ? MICRO_ACTIVITY_PRESETS : ACTIVITY_PRESETS.slice(0, 8)).map((preset) => {
                    const cat = CATEGORY_META[preset.category];
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          recordActivity({
                            title: preset.title,
                            category: preset.category,
                            minutes: preset.defaultMinutes,
                            date: today,
                            subStatKey: preset.subStatKey,
                          })
                        }
                        className={`text-left p-4 border rounded-xl transition-colors flex flex-col justify-between gap-2 ${
                          quickLogMode === 'micro'
                            ? 'bg-blue-50/40 hover:bg-blue-50 border-blue-200 hover:border-blue-300'
                            : 'bg-slate-50 hover:bg-blue-50/60 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold" style={{ color: cat.color }}>
                            {cat.label}
                          </span>
                          <span className="font-mono-num font-bold text-slate-600">
                            {preset.defaultMinutes}분
                          </span>
                        </div>
                        <div className="text-sm font-bold text-slate-900">{preset.title}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Daily Quests */}
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">오늘의 성장 루틴</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        체크 시 보너스 경험치와 스탯이 즉시 반영됩니다.
                      </p>
                    </div>
                    <span className="text-xs font-mono-num font-bold text-blue-700">
                      {appState.quests.filter((q) => q.completedDate === today).length} /{' '}
                      {appState.quests.length} 완료
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {appState.quests.map((quest) => {
                      const done = quest.completedDate === today;
                      return (
                        <button
                          key={quest.id}
                          type="button"
                          onClick={() => handleToggleQuest(quest.id)}
                          className="w-full min-h-[48px] py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 px-2 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <CheckCircle2
                              className={`w-5 h-5 shrink-0 ${
                                done ? 'text-emerald-600' : 'text-slate-300'
                              }`}
                            />
                            <span
                              className={`text-sm font-medium truncate ${
                                done ? 'line-through text-slate-400' : 'text-slate-800'
                              }`}
                            >
                              {quest.title}
                            </span>
                          </div>
                          <span className="text-xs font-mono-num text-slate-500 shrink-0">
                            {CORE_STAT_MAP[quest.statKey].label} +{quest.statBonus} · +{quest.bonusXp} XP
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <form onSubmit={handleAddQuest} className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
                  <select
                    value={newQuestCategory}
                    onChange={(e) => setNewQuestCategory(e.target.value as ActivityCategory)}
                    className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="self_directed">자기주도</option>
                    <option value="study">공부</option>
                    <option value="exercise">운동</option>
                    <option value="reading">독서</option>
                    <option value="hobby">취미</option>
                  </select>
                  <input
                    type="text"
                    value={newQuestTitle}
                    onChange={(e) => setNewQuestTitle(e.target.value)}
                    placeholder="나만의 오늘 루틴 추가..."
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                  <button
                    type="submit"
                    className="min-h-[38px] px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl whitespace-nowrap"
                  >
                    추가
                  </button>
                </form>
              </div>
            </section>

            {/* Level- and Stat-Gated Mastery Goals */}
            <MasteryGoalsSection
              appState={appState}
              currentLevel={levelInfo.level}
              currentStats={coreStats}
              onSelectGoal={handleSelectMasteryGoal}
              onCompleteGoal={handleCompleteMasteryGoal}
            />
          </>
        )}

        {activeTab === 'dungeon' && (
          <DungeonView
            appState={appState}
            currentLevel={levelInfo.level}
            coreStats={coreStats}
            subStats={subStats}
            onDefeatMonster={handleDefeatMonster}
            onGoToActivity={() => {
              setModalPreset({ category: 'study', title: '', minutes: 40 });
              setIsActivityModalOpen(true);
            }}
          />
        )}

        {activeTab === 'challenges' && (
          <ChallengesView
            appState={appState}
            onJoinChallenge={handleJoinChallenge}
            onCheckInChallenge={handleCheckInChallenge}
            onUseShieldOnChallenge={handleUseShieldOnChallenge}
            onClaimChallengeReward={handleClaimChallengeReward}
            onOpenShareModal={(chal) => setShareTarget(chal)}
            onCreateCustomChallenge={handleCreateCustomChallenge}
          />
        )}

        {activeTab === 'events_items' && (
          <EventsAndItemsView
            appState={appState}
            onClaimEventAttendance={handleClaimEventAttendance}
            onCreateCustomEvent={handleCreateCustomEvent}
            onBuyItem={handleBuyItem}
            onUseConsumable={handleUseConsumable}
            onToggleEquipGear={handleToggleEquipGear}
            onOpenActivityModalForDate={(dateStr) => {
              setModalPreset({ category: 'study', title: '', minutes: 40, date: dateStr });
              setIsActivityModalOpen(true);
            }}
          />
        )}

        {activeTab === 'ranking_records' && (
          <div className="space-y-6">
            {/* Segmented Sub-Tab Switcher for Ranking vs Timer/Report/Full Activity History */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRecordsSubTab('ranking')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    recordsSubTab === 'ranking'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  학생 성장 랭킹
                </button>
                <button
                  type="button"
                  onClick={() => setRecordsSubTab('records')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    recordsSubTab === 'records'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  타이머 · 리포트 · 전체 활동 ({appState.logs.length})
                </button>
              </div>
            </div>

            {recordsSubTab === 'ranking' ? (
              <RankingView
                appState={appState}
                cloudPeers={cloudPeers}
                currentUserId={currentUser?.uid ?? null}
                isPublicInRanking={isPublicInRanking}
                onTogglePublicInRanking={(next) => {
                  setIsPublicInRanking(next);
                  pushToast(
                    next ? '랭킹 닉네임 공개 전환' : '랭킹 비공개 모드 전환',
                    next
                      ? '이제 다른 학생들에게 닉네임과 성장 수치가 표시됩니다.'
                      : '클라우드 랭킹 목록에서 내 기록을 즉시 숨겼습니다.',
                    'share'
                  );
                }}
                onNotifyShare={(msg) => pushToast('공유 알림', msg, 'share')}
              />
            ) : (
              <TimerAndReportView
                appState={appState}
                userEmail={currentUser?.email ?? null}
                isPublicInRanking={isPublicInRanking}
                onCompleteTimerSession={({ title, category, minutes }) =>
                  recordActivity({ title, category, minutes, date: today })
                }
                onDeleteLog={handleDeleteLog}
                onUpdateProfile={handleUpdateProfile}
                onResetSampleData={handleResetSampleData}
                onDeleteCloudData={currentUser ? handleDeleteCloudData : undefined}
                onLogout={currentUser ? handleLogout : undefined}
                onExitGuest={!currentUser ? handleExitGuest : undefined}
                onGoogleLogin={!currentUser ? () => handleGoogleLogin() : undefined}
              />
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        appState={appState}
        initialCategory={modalPreset.category}
        initialTitle={modalPreset.title}
        initialMinutes={modalPreset.minutes}
        initialDate={modalPreset.date}
        onSubmit={recordActivity}
      />

      <ChallengeShareModal
        isOpen={Boolean(shareTarget)}
        onClose={() => setShareTarget(null)}
        studentName={appState.profile.name}
        studentGrade={appState.profile.grade}
        studentLevel={levelInfo.level}
        challenge={shareTarget}
        participation={shareParticipation}
        onNotifyShare={(msg) => pushToast('공유 완료', msg, 'share')}
      />

      <TitleCatalogModal
        isOpen={isTitleCatalogOpen}
        onClose={() => setIsTitleCatalogOpen(false)}
        unlockedTitleIds={appState.unlockedTitleIds}
        equippedTitleId={appState.equippedTitleId}
        globalTitles={globalTitles}
        currentUserId={currentUser?.uid ?? null}
        onEquipTitle={(titleId) => {
          setAppState((prev) => ({ ...prev, equippedTitleId: titleId }));
          pushToast(
            titleId ? `칭호 장착: 「${TITLE_MAP[titleId]?.name}」` : '칭호 장착 해제',
            titleId ? '내 대표 칭호가 변경되었습니다.' : '대표 칭호를 해제했습니다.',
            'challenge'
          );
        }}
      />

      <TitleUnlockOverlay
        titleQueue={titleUnlockQueue}
        globalTitles={globalTitles}
        loadingGlobalTitleId={loadingGlobalTitleId}
        currentUserId={currentUser?.uid ?? null}
        isAuthenticated={Boolean(currentUser)}
        onEquipAndContinue={(titleId) => {
          setAppState((prev) => ({ ...prev, equippedTitleId: titleId }));
          setTitleUnlockQueue((q) => q.slice(1));
          pushToast('대표 칭호 장착!', `「${TITLE_MAP[titleId]?.name}」 칭호를 장착했습니다.`, 'challenge');
        }}
        onContinue={() => {
          setTitleUnlockQueue((q) => q.slice(1));
        }}
      />

      {/* Non-intrusive Feedback Toasts */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-16 md:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto bg-slate-900 text-white border border-slate-800 rounded-xl px-4 py-3 shadow-lg flex items-start gap-3"
            >
              <div className="mt-0.5 shrink-0">
                {toast.type === 'levelup' ? (
                  <Trophy className="w-4 h-4 text-amber-400" />
                ) : toast.type === 'challenge' ? (
                  <Award className="w-4 h-4 text-emerald-400" />
                ) : toast.type === 'battle' ? (
                  <Swords className="w-4 h-4 text-rose-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-blue-400" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold">{toast.title}</div>
                <div className="text-[11px] text-slate-300 mt-0.5">{toast.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
