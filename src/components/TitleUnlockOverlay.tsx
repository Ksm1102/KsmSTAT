import React, { useEffect, useState } from 'react';
import { Award, Check, Crown, Sparkles, UserCheck } from 'lucide-react';
import { TITLE_MAP } from '../data/presets';
import { GlobalTitleRecord } from '../types/statup';

interface TitleUnlockOverlayProps {
  titleQueue: string[];
  globalTitles: Record<string, GlobalTitleRecord>;
  loadingGlobalTitleId: string | null;
  currentUserId: string | null;
  isAuthenticated: boolean;
  onEquipAndContinue: (titleId: string) => void;
  onContinue: (titleId: string) => void;
}

export const TitleUnlockOverlay: React.FC<TitleUnlockOverlayProps> = ({
  titleQueue,
  globalTitles,
  loadingGlobalTitleId,
  currentUserId,
  isAuthenticated,
  onEquipAndContinue,
  onContinue,
}) => {
  const [revealed, setRevealed] = useState(false);
  const currentTitleId = titleQueue[0] ?? null;

  useEffect(() => {
    if (!currentTitleId) {
      setRevealed(false);
      return;
    }
    setRevealed(false);
    const timer = window.setTimeout(() => {
      setRevealed(true);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [currentTitleId]);

  if (!currentTitleId) return null;
  const def = TITLE_MAP[currentTitleId];
  if (!def) return null;

  const globalRecord = globalTitles[currentTitleId];
  const isChecking = loadingGlobalTitleId === currentTitleId && !globalRecord;
  const isCurrentUserFirst =
    Boolean(globalRecord && currentUserId && globalRecord.firstHolderUid === currentUserId);

  const rarityColor =
    def.rarity === '전설'
      ? 'text-amber-300'
      : def.rarity === '희귀'
      ? 'text-violet-300'
      : def.rarity === '고급'
      ? 'text-blue-300'
      : 'text-slate-300';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-sm p-4 transition-opacity duration-300 motion-reduce:transition-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="title-unlock-heading"
    >
      <div
        className={`w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl p-7 text-center text-white shadow-2xl space-y-6 transition-all duration-300 motion-reduce:transition-none ${
          revealed ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
        }`}
      >
        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center">
          <Crown className="w-7 h-7 text-amber-400" />
        </div>

        <div className="space-y-2">
          <div className={`text-xs font-semibold tracking-wide ${rarityColor}`}>
            새로운 칭호 획득 · {def.rarity} 등급
            {titleQueue.length > 1 ? ` (대기 ${titleQueue.length}개)` : ''}
          </div>
          <h2
            id="title-unlock-heading"
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white [text-wrap:balance]"
          >
            「 {def.name} 」
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed pt-1">{def.flavorText}</p>
          <div className="text-xs text-slate-400 font-mono-num">
            달성 조건: {def.conditionText}
          </div>
        </div>

        {/* Global First Discoverer Box */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-left space-y-1.5">
          <div className="text-xs font-semibold text-amber-300 inline-flex items-center gap-1.5">
            <Award className="w-4 h-4" />
            이 칭호의 최초 달성자
          </div>
          {isChecking ? (
            <p className="text-xs text-slate-400">
              전체 사용자 최초 달성 기록을 확인하고 있습니다...
            </p>
          ) : globalRecord ? (
            <div className="space-y-1">
              <div className="text-sm font-bold text-white flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  {globalRecord.firstHolderName} ({globalRecord.firstHolderGrade})
                </span>
                <span className="text-xs font-mono-num text-slate-400">
                  {globalRecord.achievedAtIso.slice(0, 10)}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isCurrentUserFirst
                  ? '축하합니다! 전체 사용자 중 가장 먼저 이 칭호를 개척한 최초 달성자입니다.'
                  : `${globalRecord.firstHolderName}님이 가장 먼저 이 칭호의 문을 열었습니다.`}
              </p>
            </div>
          ) : isAuthenticated ? (
            <p className="text-xs text-slate-400">
              최초 달성자 정보를 불러오지 못했습니다. 칭호 도감에서 다시 확인할 수 있습니다.
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              게스트 체험 모드에서는 로컬에서만 칭호가 저장됩니다. Google 로그인 시 서버 최초 달성자를 확인하고 기록할 수 있습니다.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => onEquipAndContinue(currentTitleId)}
            className="w-full sm:flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            이 칭호 바로 장착하기
          </button>
          <button
            type="button"
            onClick={() => onContinue(currentTitleId)}
            className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors whitespace-nowrap"
          >
            <Check className="w-4 h-4" />
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
