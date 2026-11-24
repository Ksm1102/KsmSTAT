import React, { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react';
import { CATEGORY_META, CORE_STAT_MAP, formatLocalDate } from '../data/presets';
import { ActivityCategory, ActivityLog, AppState, SpecialEvent } from '../types/statup';
import { getAllEvents } from '../utils/calculations';

interface CalendarSectionProps {
  appState: AppState;
  onClaimEventAttendance: (event: SpecialEvent) => void;
  onOpenActivityModalForDate: (dateStr: string) => void;
  onPrefillEventDate: (dateStr: string) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const CalendarSection: React.FC<CalendarSectionProps> = ({
  appState,
  onClaimEventAttendance,
  onOpenActivityModalForDate,
  onPrefillEventDate,
}) => {
  const todayStr = formatLocalDate(new Date());
  const [cursorYear, setCursorYear] = useState(() => new Date().getFullYear());
  const [cursorMonth, setCursorMonth] = useState(() => new Date().getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const allEvents = useMemo(() => getAllEvents(appState), [appState]);

  const logsByDate = useMemo(() => {
    const map: Record<string, ActivityLog[]> = {};
    for (const log of appState.logs) {
      if (!map[log.date]) map[log.date] = [];
      map[log.date].push(log);
    }
    return map;
  }, [appState.logs]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, SpecialEvent[]> = {};
    for (const evt of allEvents) {
      if (!map[evt.date]) map[evt.date] = [];
      map[evt.date].push(evt);
    }
    return map;
  }, [allEvents]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(cursorYear, cursorMonth, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(cursorYear, cursorMonth + 1, 0).getDate();

    const cells: { dateStr: string | null; dayNum: number | null }[] = [];
    for (let i = 0; i < startWeekday; i += 1) {
      cells.push({ dateStr: null, dayNum: null });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      const mStr = String(cursorMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      cells.push({ dateStr: `${cursorYear}-${mStr}-${dStr}`, dayNum: d });
    }
    return cells;
  }, [cursorYear, cursorMonth]);

  const monthStats = useMemo(() => {
    const prefix = `${cursorYear}-${String(cursorMonth + 1).padStart(2, '0')}-`;
    const monthLogs = appState.logs.filter((l) => l.date.startsWith(prefix));
    const totalMinutes = monthLogs.reduce((s, l) => s + l.minutes, 0);
    const activeDays = new Set(monthLogs.map((l) => l.date)).size;
    return { count: monthLogs.length, totalMinutes, activeDays };
  }, [appState.logs, cursorYear, cursorMonth]);

  const goPrevMonth = () => {
    if (cursorMonth === 0) {
      setCursorYear((y) => y - 1);
      setCursorMonth(11);
    } else {
      setCursorMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (cursorMonth === 11) {
      setCursorYear((y) => y + 1);
      setCursorMonth(0);
    } else {
      setCursorMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    const now = new Date();
    setCursorYear(now.getFullYear());
    setCursorMonth(now.getMonth());
    setSelectedDate(todayStr);
  };

  const selectedLogs = logsByDate[selectedDate] ?? [];
  const selectedEvents = eventsByDate[selectedDate] ?? [];
  const selectedMinutes = selectedLogs.reduce((s, l) => s + l.minutes, 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 inline-flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            월간 성장 달력 · 일별 활동 & 이벤트
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            날짜를 클릭해 그날의 공부·운동·취미 기록과 스페셜 이벤트를 확인하고 바로 기록을 추가하세요.
          </p>
        </div>

        <div className="text-xs font-mono-num text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-2 self-start sm:self-auto">
          이번 달 출석 <strong className="text-slate-900">{monthStats.activeDays}일</strong> · 총{' '}
          <strong className="text-blue-700">{monthStats.totalMinutes}분</strong> ({monthStats.count}건)
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Month Grid */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-base font-bold font-mono-num text-slate-900">
              {cursorYear}년 {cursorMonth + 1}월
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={goPrevMonth}
                className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="이전 달"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="min-h-[34px] px-3 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                오늘
              </button>
              <button
                type="button"
                onClick={goNextMonth}
                className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="다음 달"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-500">
            {WEEKDAYS.map((w, idx) => (
              <div
                key={w}
                className={`py-1 ${idx === 0 ? 'text-rose-500' : idx === 6 ? 'text-blue-600' : ''}`}
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((cell, idx) => {
              if (!cell.dateStr || cell.dayNum === null) {
                return <div key={`empty-${idx}`} className="h-16 rounded-xl bg-slate-50/40" />;
              }
              const dayLogs = logsByDate[cell.dateStr] ?? [];
              const dayEvents = eventsByDate[cell.dateStr] ?? [];
              const dayTotalMin = dayLogs.reduce((s, l) => s + l.minutes, 0);
              const uniqueCategories = Array.from(
                new Set(dayLogs.map((l) => l.category))
              ) as ActivityCategory[];

              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDate;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateStr!)}
                  className={`h-16 p-1.5 rounded-xl border text-left flex flex-col justify-between transition-colors ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/60'
                      : isToday
                      ? 'border-blue-300 bg-white'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-mono-num font-bold ${
                        isToday ? 'text-blue-600' : 'text-slate-800'
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <Sparkles className="w-3 h-3 text-amber-500 shrink-0" aria-label="이벤트 날짜" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {uniqueCategories.length > 0 && (
                      <div className="flex items-center gap-0.5">
                        {uniqueCategories.slice(0, 4).map((cat) => (
                          <span
                            key={cat}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: CATEGORY_META[cat].color }}
                          />
                        ))}
                      </div>
                    )}
                    {dayTotalMin > 0 && (
                      <div className="text-[10px] font-mono-num font-semibold text-slate-600 truncate">
                        {dayTotalMin}분
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            {(Object.keys(CATEGORY_META) as ActivityCategory[]).map((cat) => (
              <span key={cat} className="inline-flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: CATEGORY_META[cat].color }}
                />
                {CATEGORY_META[cat].shortLabel}
              </span>
            ))}
          </div>
        </div>

        {/* Selected Date Detail Panel */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <div className="text-xs text-slate-500 font-mono-num">
                  선택한 날짜 {selectedDate === todayStr ? '· 오늘' : ''}
                </div>
                <div className="text-lg font-bold font-mono-num text-slate-900">
                  {selectedDate}
                </div>
              </div>
              <span className="text-xs font-mono-num font-semibold text-blue-700">
                총 {selectedMinutes}분 · {selectedLogs.length}건
              </span>
            </div>

            {/* Events on selected date */}
            {selectedEvents.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">이 날의 스페셜 이벤트</div>
                {selectedEvents.map((evt) => {
                  const isToday = evt.date === todayStr;
                  const claimed = appState.claimedEventDates.includes(`${evt.id}_${evt.date}`);
                  return (
                    <div
                      key={evt.id}
                      className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 space-y-2"
                    >
                      <div className="text-xs font-bold text-slate-900">{evt.title}</div>
                      <div className="text-[11px] text-slate-600 font-mono-num">
                        XP {evt.xpMultiplier}x · {CORE_STAT_MAP[evt.bonusStatKey].label} +
                        {evt.bonusStatAmount}
                      </div>
                      {isToday && (
                        <button
                          type="button"
                          disabled={claimed}
                          onClick={() => onClaimEventAttendance(evt)}
                          className={`w-full min-h-[34px] px-3 py-1.5 text-xs font-semibold rounded-lg ${
                            claimed
                              ? 'bg-emerald-100 text-emerald-700 cursor-default'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {claimed ? '오늘 출석 보상 수령 완료' : '오늘 이벤트 보너스 받기'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Logs on selected date */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700">이 날 기록한 활동</div>
              {selectedLogs.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center text-xs text-slate-500">
                  이 날짜에는 아직 기록된 활동이 없습니다.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold" style={{ color: CATEGORY_META[log.category].color }}>
                          {CATEGORY_META[log.category].label} · {log.minutes}분
                        </div>
                        <div className="text-xs font-bold text-slate-900 truncate">{log.title}</div>
                        {log.memo && (
                          <div className="text-[11px] text-slate-500 truncate">{log.memo}</div>
                        )}
                      </div>
                      <div className="text-xs font-mono-num font-bold text-blue-700 shrink-0">
                        +{log.xpEarned} XP
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onOpenActivityModalForDate(selectedDate)}
              className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              이 날짜에 활동 기록
            </button>
            <button
              type="button"
              onClick={() => onPrefillEventDate(selectedDate)}
              className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl whitespace-nowrap"
            >
              이 날 이벤트 추가
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
