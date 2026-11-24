import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  User,
  getAuth,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { createInitialAppState, formatLocalDate } from '../data/presets';
import { AppState, GlobalTitleRecord, UserProfile } from '../types/statup';
import {
  calculateStreakDays,
  computeCoreStats,
  getLevelInfo,
  getTotalCoreStatPower,
} from '../utils/calculations';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Firebase 연결 오프라인: 설정을 확인해주세요.');
      return false;
    }
    return true;
  }
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutAccount(): Promise<void> {
  await signOut(auth);
}

// Sanitize strings and enforce blueprint volumetric limits before writing to Firestore
function clampString(val: string | undefined, maxLen: number, fallback = ''): string {
  const clean = (val ?? '').trim() || fallback;
  return clean.slice(0, maxLen);
}

function sanitizeLogs(logs: AppState['logs']) {
  return logs.slice(0, 300).map((l) => ({
    id: l.id.slice(0, 64),
    title: clampString(l.title, 80, '활동'),
    category: l.category,
    minutes: Math.max(1, Math.min(360, Math.round(l.minutes))),
    date: l.date.slice(0, 10),
    createdAt: l.createdAt.slice(0, 40),
    memo: clampString(l.memo, 160),
    xpEarned: Math.max(0, Math.round(l.xpEarned)),
    statGains: l.statGains,
    ...(l.subStatGains ? { subStatGains: l.subStatGains } : {}),
    ...(l.eventTag ? { eventTag: l.eventTag.slice(0, 80) } : {}),
    ...(l.itemBonusTag ? { itemBonusTag: l.itemBonusTag.slice(0, 80) } : {}),
  }));
}

function buildPrivatePayload(
  user: User,
  state: AppState,
  isPublicInRanking: boolean,
  isCreate: boolean
) {
  const safeGrade =
    state.profile.grade === '고1' ||
    state.profile.grade === '고2' ||
    state.profile.grade === '고3'
      ? state.profile.grade
      : '고2';

  const base = {
    uid: user.uid,
    email: clampString(user.email ?? 'student@example.com', 200, 'student@example.com'),
    displayName: clampString(state.profile.name || user.displayName || '학생', 40, '학생'),
    grade: safeGrade,
    track: clampString(state.profile.track, 60, '자기주도 성장 트랙'),
    isPublicInRanking,
    totalXp: Math.max(0, Math.round(state.totalXp)),
    coins: Math.max(0, Math.round(state.coins)),
    spentBonusPoints: Math.max(0, Math.round(state.spentBonusPoints)),
    bonusAllocations: state.bonusAllocations,
    itemStatBonuses: state.itemStatBonuses,
    rareStats: state.rareStats,
    logs: sanitizeLogs(state.logs),
    quests: state.quests.slice(0, 30),
    customChallenges: state.customChallenges.slice(0, 30),
    participations: state.participations.slice(0, 50),
    badges: state.badges.slice(0, 100),
    customEvents: state.customEvents.slice(0, 50),
    claimedEventDates: state.claimedEventDates.slice(0, 200),
    inventory: state.inventory,
    equippedGearIds: state.equippedGearIds.slice(0, 2),
    activeBuffs: {
      xpMultiplier: state.activeBuffs.xpMultiplier,
      statMultiplier: state.activeBuffs.statMultiplier,
      activeBuffNames: state.activeBuffs.activeBuffNames.slice(0, 10),
    },
    selectedGoalIds: state.selectedGoalIds.slice(0, 30),
    completedGoalIds: state.completedGoalIds.slice(0, 50),
    defeatedMonsters: state.defeatedMonsters ?? {},
    unlockedTitleIds: (state.unlockedTitleIds ?? []).slice(0, 50),
    equippedTitleId: clampString(state.equippedTitleId ?? '', 64),
    updatedAt: serverTimestamp(),
  };

  if (isCreate) {
    return {
      ...base,
      createdAt: serverTimestamp(),
    };
  }
  return base;
}

export interface LoadedCloudState {
  appState: AppState;
  isPublicInRanking: boolean;
}

export async function loadOrCreateUserProfile(user: User): Promise<LoadedCloudState> {
  const path = `users/${user.uid}`;
  const docRef = doc(db, 'users', user.uid);

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const fallback = createInitialAppState();
      const appState: AppState = {
        ...fallback,
        profile: {
          name: typeof data.displayName === 'string' ? data.displayName : fallback.profile.name,
          grade:
            data.grade === '고1' || data.grade === '고2' || data.grade === '고3'
              ? data.grade
              : fallback.profile.grade,
          track: typeof data.track === 'string' ? data.track : fallback.profile.track,
        },
        totalXp: typeof data.totalXp === 'number' ? data.totalXp : fallback.totalXp,
        coins: typeof data.coins === 'number' ? data.coins : fallback.coins,
        spentBonusPoints:
          typeof data.spentBonusPoints === 'number'
            ? data.spentBonusPoints
            : fallback.spentBonusPoints,
        bonusAllocations: data.bonusAllocations ?? fallback.bonusAllocations,
        itemStatBonuses: data.itemStatBonuses ?? fallback.itemStatBonuses,
        rareStats: data.rareStats ?? fallback.rareStats,
        logs: Array.isArray(data.logs) ? data.logs : fallback.logs,
        quests: Array.isArray(data.quests) ? data.quests : fallback.quests,
        customChallenges: Array.isArray(data.customChallenges) ? data.customChallenges : [],
        participations: Array.isArray(data.participations)
          ? data.participations
          : fallback.participations,
        badges: Array.isArray(data.badges) ? data.badges : fallback.badges,
        customEvents: Array.isArray(data.customEvents) ? data.customEvents : [],
        claimedEventDates: Array.isArray(data.claimedEventDates) ? data.claimedEventDates : [],
        inventory: data.inventory ?? fallback.inventory,
        equippedGearIds: Array.isArray(data.equippedGearIds)
          ? data.equippedGearIds
          : fallback.equippedGearIds,
        activeBuffs: data.activeBuffs ?? fallback.activeBuffs,
        selectedGoalIds: Array.isArray(data.selectedGoalIds)
          ? data.selectedGoalIds
          : fallback.selectedGoalIds,
        completedGoalIds: Array.isArray(data.completedGoalIds) ? data.completedGoalIds : [],
        defeatedMonsters:
          data.defeatedMonsters && typeof data.defeatedMonsters === 'object'
            ? (data.defeatedMonsters as Record<string, number>)
            : fallback.defeatedMonsters,
        unlockedTitleIds: Array.isArray(data.unlockedTitleIds)
          ? data.unlockedTitleIds
          : fallback.unlockedTitleIds,
        equippedTitleId:
          typeof data.equippedTitleId === 'string' && data.equippedTitleId.length > 0
            ? data.equippedTitleId
            : null,
      };
      return {
        appState,
        isPublicInRanking: data.isPublicInRanking !== false,
      };
    }

    // Create initial private profile for newly authenticated student
    const initial = createInitialAppState();
    initial.profile.name = clampString(user.displayName ?? '김서준', 40, '학생');
    const payload = buildPrivatePayload(user, initial, true, true);
    await setDoc(docRef, payload);
    await syncLeaderboardSummary(user, initial, true);
    return { appState: initial, isPublicInRanking: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveUserStateToFirestore(
  user: User,
  state: AppState,
  isPublicInRanking: boolean
): Promise<void> {
  const path = `users/${user.uid}`;
  const docRef = doc(db, 'users', user.uid);
  try {
    const payload = buildPrivatePayload(user, state, isPublicInRanking, false);
    await updateDoc(docRef, payload);
    await syncLeaderboardSummary(user, state, isPublicInRanking);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function syncLeaderboardSummary(
  user: User,
  state: AppState,
  isPublicInRanking: boolean
): Promise<void> {
  const path = `leaderboard/${user.uid}`;
  const ref = doc(db, 'leaderboard', user.uid);
  try {
    if (!isPublicInRanking) {
      await deleteDoc(ref);
      return;
    }

    const stats = computeCoreStats(state);
    const levelInfo = getLevelInfo(state.totalXp);
    const totalPower = getTotalCoreStatPower(stats);
    const streak = calculateStreakDays(state.logs);
    const rareScore =
      state.rareStats.metacognition + state.rareStats.grit + state.rareStats.insight;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const startDate = formatLocalDate(sevenDaysAgo);
    const weeklyMinutes = state.logs
      .filter((l) => l.date >= startDate)
      .reduce((sum, l) => sum + l.minutes, 0);

    // Strictly NO PII (no email, no logs, no private memos)
    await setDoc(ref, {
      uid: user.uid,
      nickname: clampString(state.profile.name, 40, '학생'),
      grade: state.profile.grade,
      track: clampString(state.profile.track, 60, '자기주도 트랙'),
      level: levelInfo.level,
      totalXp: Math.max(0, Math.round(state.totalXp)),
      totalPower: Math.max(0, Math.round(totalPower)),
      knowledge: Math.max(0, Math.round(stats.knowledge)),
      stamina: Math.max(0, Math.round(stats.stamina)),
      autonomy: Math.max(0, Math.round(stats.autonomy)),
      focus: Math.max(0, Math.round(stats.focus)),
      inquiry: Math.max(0, Math.round(stats.inquiry)),
      weeklyMinutes: Math.max(0, Math.round(weeklyMinutes)),
      streak,
      rareScore,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export interface CloudLeaderboardPeer {
  id: string;
  name: string;
  grade: '고1' | '고2' | '고3';
  track: string;
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
}

export async function fetchCloudLeaderboard(): Promise<CloudLeaderboardPeer[]> {
  const path = 'leaderboard';
  try {
    const q = query(
      collection(db, 'leaderboard'),
      where('totalPower', '>=', 0),
      orderBy('totalPower', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: String(data.nickname ?? '학생'),
        grade:
          data.grade === '고1' || data.grade === '고2' || data.grade === '고3'
            ? data.grade
            : '고2',
        track: String(data.track ?? ''),
        level: Number(data.level ?? 1),
        totalXp: Number(data.totalXp ?? 0),
        totalPower: Number(data.totalPower ?? 0),
        knowledge: Number(data.knowledge ?? 0),
        stamina: Number(data.stamina ?? 0),
        autonomy: Number(data.autonomy ?? 0),
        focus: Number(data.focus ?? 0),
        inquiry: Number(data.inquiry ?? 0),
        weeklyMinutes: Number(data.weeklyMinutes ?? 0),
        streak: Number(data.streak ?? 0),
        rareScore: Number(data.rareScore ?? 0),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteAccountDataFromFirestore(user: User): Promise<void> {
  try {
    await deleteDoc(doc(db, 'leaderboard', user.uid));
    await deleteDoc(doc(db, 'users', user.uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}`);
  }
}

function parseTimestampIso(ts: unknown): string {
  if (ts instanceof Timestamp) {
    return ts.toDate().toISOString();
  }
  return new Date().toISOString();
}

export async function claimOrFetchFirstTitleHolder(
  user: User,
  titleId: string,
  profile: UserProfile
): Promise<GlobalTitleRecord> {
  const path = `global_titles/${titleId}`;
  const titleRef = doc(db, 'global_titles', titleId);
  const safeGrade =
    profile.grade === '고1' || profile.grade === '고2' || profile.grade === '고3'
      ? profile.grade
      : '고2';

  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(titleRef);
      if (snap.exists()) {
        const d = snap.data();
        return {
          titleId: String(d.titleId ?? titleId),
          firstHolderUid: String(d.firstHolderUid ?? ''),
          firstHolderName: String(d.firstHolderName ?? '익명 도전자'),
          firstHolderGrade:
            d.firstHolderGrade === '고1' || d.firstHolderGrade === '고2' || d.firstHolderGrade === '고3'
              ? d.firstHolderGrade
              : '고2',
          achievedAtIso: parseTimestampIso(d.achievedAt),
        };
      }

      const displayName = clampString(profile.name || user.displayName || '학생', 40, '학생');
      tx.set(titleRef, {
        titleId: titleId.slice(0, 64),
        firstHolderUid: user.uid,
        firstHolderName: displayName,
        firstHolderGrade: safeGrade,
        achievedAt: serverTimestamp(),
      });

      return {
        titleId,
        firstHolderUid: user.uid,
        firstHolderName: displayName,
        firstHolderGrade: safeGrade,
        achievedAtIso: new Date().toISOString(),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchAllGlobalTitleHolders(): Promise<Record<string, GlobalTitleRecord>> {
  const path = 'global_titles';
  try {
    const q = query(
      collection(db, 'global_titles'),
      where('firstHolderName', '>=', ''),
      limit(50)
    );
    const snap = await getDocs(q);
    const result: Record<string, GlobalTitleRecord> = {};
    for (const d of snap.docs) {
      const data = d.data();
      result[d.id] = {
        titleId: String(data.titleId ?? d.id),
        firstHolderUid: String(data.firstHolderUid ?? ''),
        firstHolderName: String(data.firstHolderName ?? '학생'),
        firstHolderGrade:
          data.firstHolderGrade === '고1' ||
          data.firstHolderGrade === '고2' ||
          data.firstHolderGrade === '고3'
            ? data.firstHolderGrade
            : '고2',
        achievedAtIso: parseTimestampIso(data.achievedAt),
      };
    }
    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
