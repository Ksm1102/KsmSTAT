import React, { useEffect, useMemo, useState } from 'react';
import { X, Sparkles, Clock, Calendar } from 'lucide-react';
import {
  ACTIVITY_PRESETS,
  CATEGORY_META,
  CORE_STAT_MAP,
  MICRO_ACTIVITY_PRESETS,
  SUB_STAT_MAP,
  formatLocalDate,
} from '../data/presets';
import { ActivityCategory, AppState, CoreStatKey, SubStatKey } from '../types/statup';
import {
  calculateActivityRewards,
  getDefaultSubStatForCategory,
} from '../utils/calculations';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  initialCategory?: ActivityCategory;
  initialTitle?: string;
  initialMinutes?: number;
  initialDate?: string;
  onSubmit: (payload: {
    title: string;
    category: ActivityCategory;
    minutes: number;
    date: string;
    memo: string;
    subStatKey?: SubStatKey;
  }) => void;
}

const CATEGORIES: ActivityCategory[] = ['study', 'exercise', 'self_directed', 'reading', 'hobby'];
const QUICK_MINUTES = [3, 5, 10, 15, 30, 45, 60];

const CATEGORY_SUBSTATS: Record<ActivityCategory, SubStatKey[]> = {
  study: ['math_logic', 'lang_eng', 'science_social'],
  exercise: ['cardio', 'strength_flex'],
  self_directed: ['wrong_note', 'planning'],
  reading: ['reading_literacy', 'career_inquiry'],
  hobby: ['hobby_creative', 'condition_care', 'deep_immersion'],
};

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  appState,
  initialCategory = 'study',
  initialTitle = '',
  initialMinutes = 40,
  initialDate,
  onSubmit,
}) => {
  const [category, setCategory] = useState<ActivityCategory>(initialCategory);
  const [subStatKey, setSubStatKey] = useState<SubStatKey>(
    getDefaultSubStatForCategory(initialCategory)
  );
  const [title, setTitle] = useState<string>(initialTitle);
  const [minutes, setMinutes] = useState<number>(initialMinutes);
  const [date, setDate] = useState<string>(initialDate || formatLocalDate(new Date()));
  const [memo, setMemo] = useState<string>('');
  const [presetMode, setPresetMode] = useState<'normal' | 'micro'>(
    initialMinutes <= 10 ? 'micro' : 'normal'
  );

  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory);
      setSubStatKey(getDefaultSubStatForCategory(initialCategory));
      setTitle(initialTitle);
      setMinutes(initialMinutes);
      setDate(initialDate || formatLocalDate(new Date()));
      setMemo('');
      setPresetMode(initialMinutes <= 10 ? 'micro' : 'normal');
    }
  }, [isOpen, initialCategory, initialTitle, initialMinutes, initialDate]);

  const preview = useMemo(
    () => calculateActivityRewards(appState, category, minutes, date, subStatKey),
    [appState, category, minutes, date, subStatKey]
  );

  if (!isOpen) return null;

  const presetSource = presetMode === 'micro' ? MICRO_ACTIVITY_PRESETS : ACTIVITY_PRESETS;
  const filteredPresets = presetSource.filter((p) => p.category === category);
  const availableSubStats = CATEGORY_SUBSTATS[category];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || `${CATEGORY_META[category].label} 활동`;
    onSubmit({
      title: finalTitle,
      category,
      minutes,
      date,
      memo: memo.trim(),
      subStatKey,
    });
    setTitle('');
    setMemo('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 id="activity-modal-title" className="text-lg font-bold text-slate-900">
              성장 활동 기록하기
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              공부, 운동, 자기주도학습, 독서, 취미 활동을 기록하면 관련 스탯과 경험치가 즉시 오릅니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="창 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Category Segmented Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              활동 영역 선택
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-100 rounded-xl">
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      setSubStatKey(getDefaultSubStatForCategory(cat));
                    }}
                    className={`min-h-[40px] px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {CATEGORY_META[cat].shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-stat Focus Selector */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-2">
              집중 육성할 세부 스탯
            </span>
            <div className="flex flex-wrap gap-2">
              {availableSubStats.map((subKey) => {
                const subDef = SUB_STAT_MAP[subKey];
                const active = subStatKey === subKey;
                return (
                  <button
                    key={subKey}
                    type="button"
                    onClick={() => setSubStatKey(subKey)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {subDef?.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preset Quick Fill */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-700">추천 활동 빠른 선택</span>
              <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setPresetMode('normal')}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    presetMode === 'normal'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  일반 루틴
                </button>
                <button
                  type="button"
                  onClick={() => setPresetMode('micro')}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    presetMode === 'micro'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  초단기 3·5분
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setTitle(preset.title);
                    setMinutes(preset.defaultMinutes);
                    setSubStatKey(preset.subStatKey);
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-lg transition-colors"
                >
                  {preset.title} · {preset.defaultMinutes}분
                </button>
              ))}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label htmlFor="act-title" className="block text-xs font-semibold text-slate-700 mb-1.5">
              활동 내용
            </label>
            <input
              id="act-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`예: ${filteredPresets[0]?.title ?? '수학 문제집 2단원 풀이'}`}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Duration & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="act-minutes"
                className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  진행 시간
                </span>
                <span className="font-mono-num text-blue-600">{minutes}분</span>
              </label>
              <input
                id="act-minutes"
                type="range"
                min={3}
                max={180}
                step={1}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex flex-wrap items-center gap-1 mt-2">
                {QUICK_MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinutes(m)}
                    className={`flex-1 min-w-[40px] py-1 text-xs font-mono-num rounded-md border transition-colors ${
                      minutes === m
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {m}분
                  </button>
                ))}
              </div>
              {minutes <= 5 && (
                <p className="text-[11px] text-blue-600 font-medium mt-1.5">
                  시간 없는 날 초단기 틈새 모드 적용 중 ({minutes}분도 스탯·경험치가 쌓입니다!)
                </p>
              )}
            </div>

            <div>
              <label htmlFor="act-date" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                실천 날짜
              </label>
              <input
                id="act-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono-num border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                해당 날짜의 스페셜 이벤트 보너스가 자동 적용됩니다.
              </p>
            </div>
          </div>

          {/* Memo */}
          <div>
            <label htmlFor="act-memo" className="block text-xs font-semibold text-slate-700 mb-1.5">
              오늘의 배움 · 회고 메모 (선택)
            </label>
            <input
              id="act-memo"
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 오답 원인 정리 완료, 내일은 심화 유형 5문제 도전"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Live Reward Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                예상 획득 보상
              </span>
              <div className="flex items-center gap-3 text-xs font-mono-num font-bold">
                <span className="text-blue-700">+{preview.xpEarned} XP</span>
                <span className="text-amber-700">+{preview.coinsEarned} 코인</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {(Object.entries(preview.statGains) as [CoreStatKey, number][]).map(([key, val]) => (
                <span key={key} className="font-medium text-slate-700 font-mono-num">
                  {CORE_STAT_MAP[key].label}{' '}
                  <span style={{ color: CORE_STAT_MAP[key].color }} className="font-bold">
                    +{val}
                  </span>
                </span>
              ))}
            </div>
            <div className="text-[11px] text-slate-500 font-mono-num">
              세부 스탯 반영:{' '}
              {(Object.entries(preview.subStatGains) as [SubStatKey, number][])
                .map(([sk, val]) => `${SUB_STAT_MAP[sk]?.label ?? sk} +${val}`)
                .join(' · ')}
            </div>

            {(preview.appliedEventTitle || preview.appliedItemTags.length > 0) && (
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 space-y-0.5">
                {preview.appliedEventTitle && (
                  <div>적용 이벤트: {preview.appliedEventTitle}</div>
                )}
                {preview.appliedItemTags.length > 0 && (
                  <div>적용 아이템·장비: {preview.appliedItemTags.join(', ')}</div>
                )}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="min-h-[42px] px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors whitespace-nowrap"
            >
              활동 저장 및 스탯 올리기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
