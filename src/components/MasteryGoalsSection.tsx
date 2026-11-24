import React from 'react';
import { CheckCircle2, Lock, Target, Unlock } from 'lucide-react';
import { CATEGORY_META, CORE_STAT_MAP, MASTERY_GOALS, RARE_STATS } from '../data/presets';
import { AppState, CoreStatKey, CoreStatsMap, MasteryGoal } from '../types/statup';

interface MasteryGoalsSectionProps {
  appState: AppState;
  currentLevel: number;
  currentStats: CoreStatsMap;
  onSelectGoal: (goalId: string) => void;
  onCompleteGoal: (goalId: string) => void;
}

export const MasteryGoalsSection: React.FC<MasteryGoalsSectionProps> = ({
  appState,
  currentLevel,
  currentStats,
  onSelectGoal,
  onCompleteGoal,
}) => {
  const getCategoryMinutes = (goal: MasteryGoal) => {
    return appState.logs
      .filter((l) => (goal.category === 'all' ? true : l.category === goal.category))
      .reduce((sum, l) => sum + l.minutes, 0);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 inline-flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            레벨 · 스탯 조건부 마일스톤 목표
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            레벨이 올라도 요구 스탯이 부족하면 목표를 선택할 수 없습니다. 스탯을 균형 있게 키워 상위 목표를 해금하세요.
          </p>
        </div>
        <div className="text-xs font-mono-num text-slate-600">
          현재 Lv.{currentLevel} · 선택 중 {appState.selectedGoalIds.length}개 · 완료{' '}
          {appState.completedGoalIds.length}개
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MASTERY_GOALS.map((goal) => {
          const isCompleted = appState.completedGoalIds.includes(goal.id);
          const isSelected = appState.selectedGoalIds.includes(goal.id);
          const levelMet = currentLevel >= goal.requiredLevel;

          const statEntries = Object.entries(goal.requiredStats) as [CoreStatKey, number][];
          const lackingStats = statEntries.filter(
            ([key, reqVal]) => (currentStats[key] ?? 0) < reqVal
          );
          const statsMet = lackingStats.length === 0;
          const isUnlocked = levelMet && statsMet;

          const loggedMinutes = getCategoryMinutes(goal);
          const progressPct = Math.min(
            100,
            Math.round((loggedMinutes / goal.targetMinutesToClear) * 100)
          );
          const canClaimClear = isSelected && !isCompleted && loggedMinutes >= goal.targetMinutesToClear;

          const catLabel =
            goal.category === 'all' ? '전체 영역' : CATEGORY_META[goal.category].label;
          const rareDef = RARE_STATS[goal.rewardRareStat];

          // Explicit lock state text (never hue-only)
          let gateStatusText = '해금 완료 · 선택 가능';
          if (isCompleted) gateStatusText = '목표 달성 완료';
          else if (isSelected) gateStatusText = '도전 진행 중';
          else if (!levelMet) gateStatusText = `잠김 · Lv.${goal.requiredLevel} 도달 필요`;
          else if (!statsMet) gateStatusText = '레벨 충족 · 스탯 부족으로 선택 불가';

          return (
            <div
              key={goal.id}
              className={`bg-white border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-colors ${
                isSelected
                  ? 'border-blue-300'
                  : isCompleted
                  ? 'border-emerald-200'
                  : 'border-slate-200'
              }`}
            >
              <div className="space-y-3">
                {/* Clean unboxed status line */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500">
                    {catLabel} · 목표 {goal.targetMinutesToClear}분
                  </span>
                  <span
                    className={`font-semibold inline-flex items-center gap-1 ${
                      isCompleted
                        ? 'text-emerald-700'
                        : isUnlocked
                        ? 'text-blue-700'
                        : levelMet
                        ? 'text-amber-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : isUnlocked ? (
                      <Unlock className="w-3.5 h-3.5" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                    {gateStatusText}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">{goal.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{goal.description}</p>
                </div>

                {/* Explicit Level & Stat Requirements Matrix */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-mono-num">
                    <span className="text-slate-600">필요 레벨</span>
                    <span className={levelMet ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                      Lv.{goal.requiredLevel} {levelMet ? '(충족)' : `(현재 Lv.${currentLevel})`}
                    </span>
                  </div>
                  {statEntries.map(([key, reqVal]) => {
                    const currVal = currentStats[key] ?? 0;
                    const ok = currVal >= reqVal;
                    return (
                      <div key={key} className="flex items-center justify-between font-mono-num">
                        <span className="text-slate-600">{CORE_STAT_MAP[key].label} 스탯</span>
                        <span className={ok ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                          {currVal} / {reqVal} {ok ? '(충족)' : `(${reqVal - currVal} 부족)`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Progress if selected */}
                {isSelected && !isCompleted && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono-num">
                      <span className="text-slate-600">누적 달성</span>
                      <span className="font-semibold text-blue-700">
                        {loggedMinutes} / {goal.targetMinutesToClear}분 ({progressPct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="text-xs text-slate-500 font-mono-num">
                  완료 보상: +{goal.rewardXp} XP · +{goal.rewardCoins} 코인 · {rareDef.label} +
                  {goal.rewardRareStatAmount}
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isCompleted ? (
                  <div className="w-full min-h-[40px] flex items-center justify-center text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl">
                    마일스톤 목표 달성 완료
                  </div>
                ) : isSelected ? (
                  <button
                    type="button"
                    disabled={!canClaimClear}
                    onClick={() => onCompleteGoal(goal.id)}
                    className={`w-full min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
                      canClaimClear
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {canClaimClear
                      ? '목표 달성 보상 수령하기'
                      : `${goal.targetMinutesToClear - loggedMinutes}분 더 기록하면 완료`}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!isUnlocked}
                    onClick={() => onSelectGoal(goal.id)}
                    className={`w-full min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
                      isUnlocked
                        ? 'bg-slate-900 hover:bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isUnlocked
                      ? '이 목표 선택하기'
                      : !levelMet
                      ? `Lv.${goal.requiredLevel} 도달 후 선택 가능`
                      : `스탯 부족으로 잠금 (${lackingStats
                          .map(([k, v]) => `${CORE_STAT_MAP[k].label} +${v - (currentStats[k] ?? 0)}`)
                          .join(', ')})`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
