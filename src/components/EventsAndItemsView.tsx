import React, { useState } from 'react';
import { Calendar, Coins, Package, Plus, ShoppingBag, Sparkles, Zap } from 'lucide-react';
import {
  CATEGORY_META,
  CORE_STAT_MAP,
  ITEM_CATALOG,
  formatLocalDate,
} from '../data/presets';
import { ActivityCategory, AppState, CoreStatKey, SpecialEvent } from '../types/statup';
import { getAllEvents } from '../utils/calculations';
import { CalendarSection } from './CalendarSection';

interface EventsAndItemsViewProps {
  appState: AppState;
  onClaimEventAttendance: (event: SpecialEvent) => void;
  onCreateCustomEvent: (event: SpecialEvent) => void;
  onBuyItem: (itemId: string) => void;
  onUseConsumable: (itemId: string) => void;
  onToggleEquipGear: (itemId: string) => void;
  onOpenActivityModalForDate: (dateStr: string) => void;
}

export const EventsAndItemsView: React.FC<EventsAndItemsViewProps> = ({
  appState,
  onClaimEventAttendance,
  onCreateCustomEvent,
  onBuyItem,
  onUseConsumable,
  onToggleEquipGear,
  onOpenActivityModalForDate,
}) => {
  const [showEventForm, setShowEventForm] = useState(false);
  const [evtTitle, setEvtTitle] = useState('');
  const [evtDate, setEvtDate] = useState(formatLocalDate(new Date()));
  const [evtCategory, setEvtCategory] = useState<ActivityCategory | 'all'>('study');
  const [evtMultiplier, setEvtMultiplier] = useState(1.5);
  const [evtStatKey, setEvtStatKey] = useState<CoreStatKey>('knowledge');
  const [shopFilter, setShopFilter] = useState<'all' | 'consumable' | 'gear'>('all');

  const today = formatLocalDate(new Date());
  const allEvents = getAllEvents(appState);

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evtTitle.trim()) return;
    const newEvt: SpecialEvent = {
      id: `custom-evt-${Date.now()}`,
      title: evtTitle.trim(),
      description: `${evtDate}에 등록된 나만의 스페셜 성장 데이! 해당 영역 활동 시 경험치 ${evtMultiplier}배가 적용됩니다.`,
      date: evtDate,
      targetCategory: evtCategory,
      xpMultiplier: evtMultiplier,
      bonusStatKey: evtStatKey,
      bonusStatAmount: 4,
      bonusFlatXp: 35,
      bonusCoins: 30,
      isCustom: true,
    };
    onCreateCustomEvent(newEvt);
    setEvtTitle('');
    setShowEventForm(false);
  };

  const filteredShopItems = ITEM_CATALOG.filter((item) =>
    shopFilter === 'all' ? true : item.kind === shopFilter
  );

  const ownedItems = ITEM_CATALOG.filter((item) => (appState.inventory[item.id] ?? 0) > 0);

  return (
    <div className="space-y-10">
      {/* SECTION 0: Interactive Monthly Calendar */}
      <CalendarSection
        appState={appState}
        onClaimEventAttendance={onClaimEventAttendance}
        onOpenActivityModalForDate={onOpenActivityModalForDate}
        onPrefillEventDate={(dateStr) => {
          setEvtDate(dateStr);
          setShowEventForm(true);
          window.setTimeout(() => {
            document.getElementById('special-event-section')?.scrollIntoView({ behavior: 'smooth' });
          }, 40);
        }}
      />

      {/* SECTION 1: Specific-Date Stat & Level Events */}
      <section id="special-event-section" className="space-y-5 pt-6 border-t border-slate-200 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              특정 날 스탯 · 레벨 이벤트 캘린더
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              지정된 날짜에는 경험치 배율과 보너스 스탯이 적용됩니다. 시험일이나 목표 날짜를 직접 등록해보세요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowEventForm((v) => !v)}
            className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            특정 날 이벤트 추가
          </button>
        </div>

        {showEventForm && (
          <form
            onSubmit={handleEventSubmit}
            className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-slate-900">나만의 스페셜 이벤트 날짜 등록</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">이벤트 이름</label>
                <input
                  type="text"
                  required
                  value={evtTitle}
                  onChange={(e) => setEvtTitle(e.target.value)}
                  placeholder="예: 모의고사 집중 대비 데이"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">적용 날짜</label>
                <input
                  type="date"
                  required
                  value={evtDate}
                  onChange={(e) => setEvtDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-mono-num border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">적용 영역</label>
                <select
                  value={evtCategory}
                  onChange={(e) => setEvtCategory(e.target.value as ActivityCategory | 'all')}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                >
                  <option value="all">전체 활동</option>
                  <option value="study">교과 공부</option>
                  <option value="exercise">운동 · 체력</option>
                  <option value="self_directed">자기주도학습</option>
                  <option value="reading">독서 · 진로탐구</option>
                  <option value="hobby">취미 · 창의활동</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  경험치 배율
                </label>
                <select
                  value={evtMultiplier}
                  onChange={(e) => setEvtMultiplier(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm font-mono-num border border-slate-300 rounded-xl bg-white"
                >
                  <option value={1.3}>1.3배 경험치</option>
                  <option value={1.5}>1.5배 경험치</option>
                  <option value={2.0}>2.0배 레벨업 특급</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  추가 상승 스탯
                </label>
                <select
                  value={evtStatKey}
                  onChange={(e) => setEvtStatKey(e.target.value as CoreStatKey)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                >
                  <option value="knowledge">지식 (+4)</option>
                  <option value="stamina">체력 (+4)</option>
                  <option value="autonomy">주도력 (+4)</option>
                  <option value="focus">집중력 (+4)</option>
                  <option value="inquiry">탐구력 (+4)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEventForm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
              >
                이벤트 등록하기
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allEvents.map((evt) => {
            const isToday = evt.date === today;
            const isPast = evt.date < today;
            const claimKey = `${evt.id}_${evt.date}`;
            const isClaimed = appState.claimedEventDates.includes(claimKey);
            const catText =
              evt.targetCategory === 'all' ? '전체 활동' : CATEGORY_META[evt.targetCategory].label;

            return (
              <div
                key={evt.id}
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between gap-4 ${
                  isToday ? 'border-blue-300' : 'border-slate-200'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono-num text-slate-600 inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {evt.date}
                    </span>
                    <span
                      className={`font-semibold ${
                        isToday ? 'text-blue-700' : isPast ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      {isToday ? '오늘 진행 중' : isPast ? '종료됨' : '진행 예정'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">{evt.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{evt.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1 font-mono-num">
                    <div>
                      혜택 영역: <span className="font-sans font-medium text-slate-800">{catText}</span> ·{' '}
                      <strong className="text-blue-700">XP {evt.xpMultiplier}x</strong>
                    </div>
                    <div>
                      출석 특전: +{evt.bonusFlatXp} XP · {CORE_STAT_MAP[evt.bonusStatKey].label} +
                      {evt.bonusStatAmount} · +{evt.bonusCoins} 코인
                    </div>
                  </div>
                </div>

                {isToday ? (
                  <button
                    type="button"
                    disabled={isClaimed}
                    onClick={() => onClaimEventAttendance(evt)}
                    className={`w-full min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
                      isClaimed
                        ? 'bg-emerald-50 text-emerald-700 cursor-default'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isClaimed ? '오늘 이벤트 출석 보상 수령 완료' : '오늘 이벤트 참여 보상 받기'}
                  </button>
                ) : (
                  <div className="w-full min-h-[40px] flex items-center justify-center text-xs font-medium text-slate-500 bg-slate-50 rounded-xl">
                    {isPast ? '지난 이벤트' : `${evt.date} 당일에 활성화됩니다`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: Inventory & Growth Item Shop */}
      <section className="space-y-6 pt-6 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              성장 아이템 가방 & 상점
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              활동과 챌린지로 모은 성장 코인으로 부스터와 학습·운동 장비를 장착해 스탯 효율을 높이세요.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 self-start sm:self-auto">
            <Coins className="w-4 h-4 text-amber-500" />
            보유 성장 코인
            <span className="font-mono-num text-amber-700 font-bold">{appState.coins}</span>
          </div>
        </div>

        {/* Active Buffs & Equipped Gear Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              장착 중인 학습 · 운동 장비 ({appState.equippedGearIds.length} / 2 슬롯)
            </div>
            {appState.equippedGearIds.length === 0 ? (
              <p className="text-sm text-slate-500 mt-2">
                장착한 장비가 없습니다. 아래 내 가방에서 장비를 장착하세요.
              </p>
            ) : (
              <div className="mt-2.5 space-y-2">
                {appState.equippedGearIds.map((gid) => {
                  const gear = ITEM_CATALOG.find((i) => i.id === gid);
                  if (!gear) return null;
                  return (
                    <div
                      key={gid}
                      className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{gear.name}</span>
                        <span className="text-slate-500 ml-2">{gear.effectSummary}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleEquipGear(gid)}
                        className="text-slate-600 hover:text-slate-900 font-medium whitespace-nowrap ml-2"
                      >
                        해제
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              다음 활동 적용 버프
            </div>
            {appState.activeBuffs.activeBuffNames.length === 0 ? (
              <p className="text-sm text-slate-500 mt-2">
                활성화된 일회성 버프가 없습니다. 부스터 아이템을 사용하면 다음 기록에 즉시 적용됩니다.
              </p>
            ) : (
              <div className="mt-2.5 space-y-1.5 text-xs">
                <div className="font-semibold text-blue-700 font-mono-num">
                  경험치 {appState.activeBuffs.xpMultiplier}배 · 스탯 {appState.activeBuffs.statMultiplier}배
                </div>
                <div className="text-slate-600">
                  적용 중: {appState.activeBuffs.activeBuffNames.join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* My Inventory */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-slate-900 inline-flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-700" />
            내 아이템 가방 ({ownedItems.length}종)
          </h3>

          {ownedItems.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-500 text-center">
              가방이 비어 있습니다. 아래 아이템 상점에서 필요한 성장 아이템을 구매해보세요.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ownedItems.map((item) => {
                const count = appState.inventory[item.id] ?? 0;
                const isEquipped = appState.equippedGearIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {item.kind === 'gear' ? '장착 장비' : '소비 아이템'} · {item.rarity}
                        </span>
                        <span className="font-mono-num font-bold text-slate-800">보유 {count}개</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-1">{item.name}</div>
                      <p className="text-xs text-blue-700 font-medium mt-1">{item.effectSummary}</p>
                    </div>

                    {item.kind === 'gear' ? (
                      <button
                        type="button"
                        onClick={() => onToggleEquipGear(item.id)}
                        className={`w-full min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
                          isEquipped
                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        {isEquipped ? '장착 중 (해제하기)' : '장비 장착하기'}
                      </button>
                    ) : item.isChallengeShield ? (
                      <div className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 text-center">
                        챌린지 탭의 진행 중 카드에서 사용할 수 있습니다
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onUseConsumable(item.id)}
                        className="w-full min-h-[38px] px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                      >
                        아이템 사용하기
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Item Shop */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900 inline-flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              성장 아이템 상점
            </h3>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start">
              {(
                [
                  ['all', '전체'],
                  ['consumable', '부스터 · 회복'],
                  ['gear', '장착 장비'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setShopFilter(key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    shopFilter === key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredShopItems.map((item) => {
              const ownedCount = appState.inventory[item.id] ?? 0;
              const alreadyOwnedGear = item.kind === 'gear' && ownedCount > 0;
              const canAfford = appState.coins >= item.price;

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {item.kind === 'gear' ? '장착 장비' : '소비 아이템'} · {item.rarity}
                      </span>
                      <span className="font-mono-num font-bold text-amber-700">
                        {item.price} 코인
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900">{item.name}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                    <div className="text-xs font-semibold text-blue-700 pt-1">
                      {item.effectSummary}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={alreadyOwnedGear || !canAfford}
                    onClick={() => onBuyItem(item.id)}
                    className={`w-full min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
                      alreadyOwnedGear
                        ? 'bg-emerald-50 text-emerald-700 cursor-default'
                        : canAfford
                        ? 'bg-slate-900 hover:bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {alreadyOwnedGear
                      ? '이미 보유 중인 장비'
                      : canAfford
                      ? `${item.price} 코인으로 구매하기`
                      : `코인 ${item.price - appState.coins}개 부족`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
