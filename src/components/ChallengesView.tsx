import React, { useState } from 'react';
import { Award, Plus, Share2, Shield, Sparkles, Trophy, CheckCircle2 } from 'lucide-react';
import {
  CATEGORY_META,
  CORE_STAT_MAP,
  RARE_STATS,
  formatLocalDate,
} from '../data/presets';
import {
  ActivityCategory,
  AppState,
  ChallengeDefinition,
  CoreStatKey,
  RareStatKey,
} from '../types/statup';
import { getAllChallenges } from '../utils/calculations';

interface ChallengesViewProps {
  appState: AppState;
  onJoinChallenge: (challengeId: string) => void;
  onCheckInChallenge: (challengeId: string) => void;
  onUseShieldOnChallenge: (challengeId: string) => void;
  onClaimChallengeReward: (challengeId: string) => void;
  onOpenShareModal: (challenge: ChallengeDefinition) => void;
  onCreateCustomChallenge: (challenge: ChallengeDefinition) => void;
}

export const ChallengesView: React.FC<ChallengesViewProps> = ({
  appState,
  onJoinChallenge,
  onCheckInChallenge,
  onUseShieldOnChallenge,
  onClaimChallengeReward,
  onOpenShareModal,
  onCreateCustomChallenge,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<ActivityCategory | 'all'>('study');
  const [newDays, setNewDays] = useState(7);
  const [newMinutes, setNewMinutes] = useState(30);
  const [newRareStat, setNewRareStat] = useState<RareStatKey>('metacognition');

  const today = formatLocalDate(new Date());
  const allChallenges = getAllChallenges(appState);
  const shieldCount = appState.inventory['item-challenge-shield'] ?? 0;

  const activeItems = allChallenges.filter((c) =>
    appState.participations.some((p) => p.challengeId === c.id)
  );
  const availableItems = allChallenges.filter(
    (c) => !appState.participations.some((p) => p.challengeId === c.id)
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const rewardCore: CoreStatKey =
      newCategory === 'exercise'
        ? 'stamina'
        : newCategory === 'self_directed'
        ? 'autonomy'
        : newCategory === 'reading' || newCategory === 'hobby'
        ? 'inquiry'
        : 'knowledge';

    const custom: ChallengeDefinition = {
      id: `custom-chal-${Date.now()}`,
      title: newTitle.trim(),
      description:
        newDesc.trim() || `${newDays}일 동안 매일 ${newMinutes}분 이상 꾸준히 실천하는 나만의 챌린지`,
      category: newCategory,
      targetDays: newDays,
      dailyMinMinutes: newMinutes,
      rewardXp: newDays * 25,
      rewardCoins: newDays * 15,
      rewardRareStat: newRareStat,
      rewardRareStatAmount: Math.max(3, Math.round(newDays / 3)),
      rewardCoreStat: rewardCore,
      rewardCoreStatAmount: Math.max(15, newDays * 2),
      badgeTitle: `${newTitle.trim().slice(0, 10)} 완주자`,
      badgeDescription: `${newDays}일 목표를 스스로 설정하고 완주한 증표`,
      isCustom: true,
    };

    onCreateCustomChallenge(custom);
    setNewTitle('');
    setNewDesc('');
    setShowCreateForm(false);
  };

  return (
    <div className="space-y-8">
      {/* Top Section Header + Rare Stats Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            동기 부여 챌린지 & 희귀 보상
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            목표 기간 동안 공부·운동·자기주도학습을 이어가면 희귀 스탯과 특별 뱃지를 얻습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs">
            {(Object.keys(RARE_STATS) as RareStatKey[]).map((key) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="text-slate-500">{RARE_STATS[key].label}</span>
                <span
                  className="font-mono-num font-bold"
                  style={{ color: RARE_STATS[key].color }}
                >
                  {appState.rareStats[key]}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            나만의 챌린지 만들기
          </button>
        </div>
      </div>

      {/* Custom Challenge Builder */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">새 목표 챌린지 설계하기</h2>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              닫기
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">챌린지 제목</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="예: 10일 동안 매일 영단어 50개 & 복습"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">영역 선택</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ActivityCategory | 'all')}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="study">교과 공부</option>
                <option value="exercise">운동 · 체력</option>
                <option value="self_directed">자기주도학습</option>
                <option value="reading">독서 · 진로탐구</option>
                <option value="hobby">취미 · 창의활동</option>
                <option value="all">전체 영역</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                목표 기간: <span className="font-mono-num text-blue-600">{newDays}일</span>
              </label>
              <input
                type="range"
                min={3}
                max={30}
                value={newDays}
                onChange={(e) => setNewDays(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                하루 최소 시간: <span className="font-mono-num text-blue-600">{newMinutes}분</span>
              </label>
              <input
                type="range"
                min={10}
                max={120}
                step={5}
                value={newMinutes}
                onChange={(e) => setNewMinutes(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                목표 희귀 스탯 보상
              </label>
              <select
                value={newRareStat}
                onChange={(e) => setNewRareStat(e.target.value as RareStatKey)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="metacognition">메타인지 (학습 전략)</option>
                <option value="grit">불굴의 의지 (꾸준함)</option>
                <option value="insight">통찰력 (탐구·사고력)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">한 줄 다짐</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="스스로에게 남기는 목표 메모"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="min-h-[40px] px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
            >
              챌린지 생성 및 바로 참여
            </button>
          </div>
        </form>
      )}

      {/* Active Challenges */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            참여 중인 챌린지 <span className="font-mono-num text-blue-600">{activeItems.length}</span>
          </h2>
          {shieldCount > 0 && (
            <div className="text-xs text-slate-600 inline-flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-violet-600" />
              보유 중인 연속기록 방어권: <span className="font-mono-num font-bold">{shieldCount}개</span>
            </div>
          )}
        </div>

        {activeItems.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
            아직 참여 중인 챌린지가 없습니다. 아래에서 도전하고 싶은 챌린지를 선택해 시작해보세요.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {activeItems.map((chal) => {
              const part = appState.participations.find((p) => p.challengeId === chal.id)!;
              const doneCount = part.completedDates.length;
              const isGoalReached = doneCount >= chal.targetDays;
              const isClaimed = Boolean(part.claimedAt);
              const isDoneToday = part.completedDates.includes(today);
              const progressPct = Math.min(100, Math.round((doneCount / chal.targetDays) * 100));
              const categoryText =
                chal.category === 'all' ? '전체 영역' : CATEGORY_META[chal.category].label;
              const rareDef = RARE_STATS[chal.rewardRareStat];

              return (
                <div
                  key={chal.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-5"
                >
                  <div className="space-y-3">
                    {/* Unboxed clean metadata line */}
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        {categoryText} · 하루 {chal.dailyMinMinutes}분 이상 ·{' '}
                        {isClaimed ? '보상 수령 완료' : isGoalReached ? '완주 성공' : '진행 중'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenShareModal(chal)}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 font-medium whitespace-nowrap"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        친구 공유
                      </button>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{chal.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{chal.description}</p>
                    </div>

                    {/* Progress bar & Day Grid */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs font-mono-num">
                        <span className="font-semibold text-slate-700">
                          달성 일수 {doneCount} / {chal.targetDays}일
                        </span>
                        <span className="font-bold text-blue-600">{progressPct}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isGoalReached ? 'bg-emerald-600' : 'bg-blue-600'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      {/* Visual Day Cells (up to 30 cells cleanly) */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {Array.from({ length: chal.targetDays }).map((_, idx) => {
                          const filled = idx < doneCount;
                          return (
                            <span
                              key={idx}
                              title={`${idx + 1}일차`}
                              className={`w-5 h-5 rounded text-[10px] font-mono-num flex items-center justify-center border ${
                                filled
                                  ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                                  : 'bg-slate-50 border-slate-200 text-slate-400'
                              }`}
                            >
                              {idx + 1}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reward line */}
                    <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                      <span>
                        뱃지: <strong className="text-slate-800">{chal.badgeTitle}</strong>
                      </span>
                      <span className="font-mono-num">
                        희귀 스탯{' '}
                        <strong style={{ color: rareDef.color }}>
                          {rareDef.label} +{chal.rewardRareStatAmount}
                        </strong>
                      </span>
                      <span className="font-mono-num">
                        {CORE_STAT_MAP[chal.rewardCoreStat].label} +{chal.rewardCoreStatAmount} ·{' '}
                        +{chal.rewardXp} XP · +{chal.rewardCoins} 코인
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {isClaimed ? (
                      <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" />
                        챌린지 완주 및 보상 지급 완료
                      </div>
                    ) : isGoalReached ? (
                      <button
                        type="button"
                        onClick={() => onClaimChallengeReward(chal.id)}
                        className="flex-1 min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
                      >
                        <Trophy className="w-4 h-4" />
                        완주 보상 받기 (희귀 스탯 · 뱃지)
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={isDoneToday}
                          onClick={() => onCheckInChallenge(chal.id)}
                          className={`flex-1 min-h-[42px] px-4 py-2 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap ${
                            isDoneToday
                              ? 'bg-slate-100 text-slate-500 cursor-default'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          {isDoneToday ? '오늘 챌린지 출석 완료' : '오늘 실천 체크인 (+1일)'}
                        </button>
                        {shieldCount > 0 && (
                          <button
                            type="button"
                            onClick={() => onUseShieldOnChallenge(chal.id)}
                            className="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl transition-colors whitespace-nowrap"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            방어권 사용 (+1일)
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Available Challenges Catalog */}
      {availableItems.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">새로운 챌린지 도전하기</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableItems.map((chal) => {
              const categoryText =
                chal.category === 'all' ? '전체 영역' : CATEGORY_META[chal.category].label;
              const rareDef = RARE_STATS[chal.rewardRareStat];

              return (
                <div
                  key={chal.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500">
                      {categoryText} · {chal.targetDays}일 목표 · 하루 {chal.dailyMinMinutes}분
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{chal.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{chal.description}</p>
                    <div className="pt-2 text-xs text-slate-600 space-y-1">
                      <div>
                        보상 뱃지: <strong className="text-slate-800">{chal.badgeTitle}</strong>
                      </div>
                      <div className="font-mono-num">
                        희귀 스탯{' '}
                        <strong style={{ color: rareDef.color }}>
                          {rareDef.label} +{chal.rewardRareStatAmount}
                        </strong>{' '}
                        · +{chal.rewardXp} XP
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onJoinChallenge(chal.id)}
                    className="w-full min-h-[40px] px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                  >
                    챌린지 참여하기
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Unlocked Badges Showcase */}
      <section className="space-y-4 pt-2 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 inline-flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            획득한 특별 뱃지 <span className="font-mono-num text-slate-500">{appState.badges.length}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {appState.badges.map((badge) => (
            <div
              key={badge.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-mono-num">
                  {badge.unlockedAt} · {badge.rareStatLabel}
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{badge.title}</div>
                <p className="text-xs text-slate-600 mt-1">{badge.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
