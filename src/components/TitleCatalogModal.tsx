import React from 'react';
import { Award, CheckCircle2, Crown, Lock, X } from 'lucide-react';
import { TITLE_CATALOG } from '../data/presets';
import { GlobalTitleRecord } from '../types/statup';

interface TitleCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedTitleIds: string[];
  equippedTitleId: string | null;
  globalTitles: Record<string, GlobalTitleRecord>;
  currentUserId: string | null;
  onEquipTitle: (titleId: string | null) => void;
}

export const TitleCatalogModal: React.FC<TitleCatalogModalProps> = ({
  isOpen,
  onClose,
  unlockedTitleIds,
  equippedTitleId,
  globalTitles,
  currentUserId,
  onEquipTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="title-catalog-heading"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 id="title-catalog-heading" className="text-lg font-bold text-slate-900 inline-flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              칭호 도감 · 최초 달성자 현황 ({unlockedTitleIds.length} / {TITLE_CATALOG.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              특정 스탯·레벨·활동 조건을 만족하면 칭호가 해금되며, 획득한 칭호를 내 프로필에 장착할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            aria-label="창 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {TITLE_CATALOG.map((title) => {
            const isUnlocked = unlockedTitleIds.includes(title.id);
            const isEquipped = equippedTitleId === title.id;
            const global = globalTitles[title.id];
            const isMineFirst = Boolean(global && currentUserId && global.firstHolderUid === currentUserId);

            return (
              <div
                key={title.id}
                className={`border rounded-xl p-4 flex flex-col justify-between gap-3 ${
                  isEquipped
                    ? 'border-amber-300 bg-amber-50/40'
                    : isUnlocked
                    ? 'border-slate-200 bg-white'
                    : 'border-slate-200 bg-slate-50/70'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">
                      {title.rarity} 등급
                    </span>
                    <span
                      className={`font-semibold inline-flex items-center gap-1 ${
                        isEquipped
                          ? 'text-amber-700'
                          : isUnlocked
                          ? 'text-emerald-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {isUnlocked ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <Lock className="w-3.5 h-3.5" />
                      )}
                      {isEquipped ? '장착 중' : isUnlocked ? '해금됨' : '미해금'}
                    </span>
                  </div>

                  <div className="text-base font-bold text-slate-900">「 {title.name} 」</div>
                  <p className="text-xs text-slate-600 leading-relaxed">{title.flavorText}</p>
                  <div className="text-[11px] text-slate-500 font-mono-num">
                    조건: {title.conditionText}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
                  <div className="text-[11px] text-slate-600 inline-flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    {global ? (
                      <span>
                        최초 달성: <strong className="text-slate-900">{global.firstHolderName}</strong> ({global.firstHolderGrade})
                        {isMineFirst ? ' · 내가 최초!' : ''}
                      </span>
                    ) : (
                      <span className="text-slate-400">아직 서버 최초 달성자 없음 (도전 가능!)</span>
                    )}
                  </div>

                  {isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => onEquipTitle(isEquipped ? null : title.id)}
                      className={`w-full min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        isEquipped
                          ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {isEquipped ? '장착 해제하기' : '대표 칭호로 장착하기'}
                    </button>
                  ) : (
                    <div className="text-[11px] text-slate-400 text-center py-1">
                      조건 달성 시 자동 해금
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
