import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  LogIn,
  LogOut,
  Pause,
  Play,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { CATEGORY_META, CORE_STAT_MAP, formatLocalDate, getOffsetDate } from '../data/presets';
import { ActivityCategory, AppState, CoreStatKey, UserProfile } from '../types/statup';

interface TimerAndReportViewProps {
  appState: AppState;
  userEmail: string | null;
  isPublicInRanking: boolean;
  onCompleteTimerSession: (payload: {
    title: string;
    category: ActivityCategory;
    minutes: number;
  }) => void;
  onDeleteLog: (logId: string) => void;
  onUpdateProfile: (profile: UserProfile, isPublic: boolean) => void;
  onResetSampleData: () => void;
  onDeleteCloudData?: () => void;
  onLogout?: () => void;
  onExitGuest?: () => void;
  onGoogleLogin?: () => void;
}

const TIMER_PRESETS = [
  { label: '초단기 틈새 3분', minutes: 3 },
  { label: '초집중 스프린트 5분', minutes: 5 },
  { label: '미니 집중 10분', minutes: 10 },
  { label: '짧은 집중 15분', minutes: 15 },
  { label: '포모도로 25분', minutes: 25 },
  { label: '수능 탐구 40분', minutes: 40 },
  { label: '모의고사 집중 50분', minutes: 50 },
];

export const TimerAndReportView: React.FC<TimerAndReportViewProps> = ({
  appState,
  userEmail,
  isPublicInRanking,
  onCompleteTimerSession,
  onDeleteLog,
  onUpdateProfile,
  onResetSampleData,
  onDeleteCloudData,
  onLogout,
  onExitGuest,
  onGoogleLogin,
}) => {
  // Focus Timer State
  const [selectedMinutes, setSelectedMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [timerCategory, setTimerCategory] = useState<ActivityCategory>('study');
  const [timerTitle, setTimerTitle] = useState('집중 타이머 학습 세션');

  // History Search & Filter
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<ActivityCategory | 'all'>('all');

  // Profile Editor
  const [editName, setEditName] = useState(appState.profile.name);
  const [editGrade, setEditGrade] = useState<'고1' | '고2' | '고3'>(appState.profile.grade);
  const [editTrack, setEditTrack] = useState(appState.profile.track);
  const [editPublic, setEditPublic] = useState(isPublicInRanking);
  const [confirmDeleteCloud, setConfirmDeleteCloud] = useState(false);

  useEffect(() => {
    setEditName(appState.profile.name);
    setEditGrade(appState.profile.grade);
    setEditTrack(appState.profile.track);
  }, [appState.profile]);

  useEffect(() => {
    setEditPublic(isPublicInRanking);
  }, [isPublicInRanking]);

  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isRunning]);

  const handleSelectTimerMinutes = (mins: number) => {
    setIsRunning(false);
    setSelectedMinutes(mins);
    setSecondsLeft(mins * 60);
  };

  const handleFinishNow = () => {
    const elapsedSeconds = selectedMinutes * 60 - secondsLeft;
    const creditMinutes =
      secondsLeft === 0
        ? selectedMinutes
        : Math.max(1, Math.round(elapsedSeconds / 60) || selectedMinutes);

    onCompleteTimerSession({
      title: timerTitle.trim() || `${CATEGORY_META[timerCategory].label} 집중 세션`,
      category: timerCategory,
      minutes: creditMinutes,
    });
    setIsRunning(false);
    setSecondsLeft(selectedMinutes * 60);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const timerProgress =
    selectedMinutes > 0
      ? Math.round(((selectedMinutes * 60 - secondsLeft) / (selectedMinutes * 60)) * 100)
      : 0;

  // Weekly 7-day stacked data
  const weeklyDays = useMemo(() => {
    const days = [];
    const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
    for (let offset = -6; offset <= 0; offset += 1) {
      const dStr = getOffsetDate(offset);
      const dateObj = new Date(`${dStr}T00:00:00`);
      const dayLogs = appState.logs.filter((l) => l.date === dStr);
      const study = dayLogs
        .filter((l) => l.category === 'study')
        .reduce((s, l) => s + l.minutes, 0);
      const self = dayLogs
        .filter((l) => l.category === 'self_directed')
        .reduce((s, l) => s + l.minutes, 0);
      const exercise = dayLogs
        .filter((l) => l.category === 'exercise')
        .reduce((s, l) => s + l.minutes, 0);
      const reading = dayLogs
        .filter((l) => l.category === 'reading')
        .reduce((s, l) => s + l.minutes, 0);
      const hobby = dayLogs
        .filter((l) => l.category === 'hobby')
        .reduce((s, l) => s + l.minutes, 0);
      const total = study + self + exercise + reading + hobby;
      days.push({
        date: dStr,
        label: offset === 0 ? '오늘' : `${dateObj.getMonth() + 1}/${dateObj.getDate()} (${dayLabels[dateObj.getDay()]})`,
        study,
        self,
        exercise,
        reading,
        hobby,
        total,
      });
    }
    return days;
  }, [appState.logs]);

  const maxWeeklyMinutes = Math.max(60, ...weeklyDays.map((d) => d.total));

  const filteredLogs = useMemo(() => {
    return appState.logs.filter((l) => {
      if (filterCategory !== 'all' && l.category !== filterCategory) return false;
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        return (
          l.title.toLowerCase().includes(q) ||
          (l.memo ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [appState.logs, filterCategory, searchText]);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(
      {
        name: editName.trim() || appState.profile.name,
        grade: editGrade,
        track: editTrack.trim() || '자기주도 성장 트랙',
      },
      editPublic
    );
  };

  return (
    <div className="space-y-10">
      {/* SECTION 1: Focus Timer + Weekly Report */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Focus Timer */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">몰입 스톱워치 타이머</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              집중 시간 측정을 마치고 완료 버튼을 누르면 스탯과 경험치가 즉시 반영됩니다.
            </p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={timerCategory}
                onChange={(e) => setTimerCategory(e.target.value as ActivityCategory)}
                className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white"
              >
                <option value="study">교과 공부</option>
                <option value="self_directed">자기주도학습</option>
                <option value="exercise">운동 · 체력</option>
                <option value="reading">독서 · 탐구</option>
                <option value="hobby">취미 · 창의활동</option>
              </select>
              <input
                type="text"
                value={timerTitle}
                onChange={(e) => setTimerTitle(e.target.value)}
                placeholder="세션 목표 입력"
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {TIMER_PRESETS.map((p) => (
                <button
                  key={p.minutes}
                  type="button"
                  onClick={() => handleSelectTimerMinutes(p.minutes)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    selectedMinutes === p.minutes
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clock Display */}
          <div className="flex flex-col items-center justify-center py-4">
            <div className="text-5xl font-extrabold font-mono-num tracking-tight text-slate-900">
              {mm}:{ss}
            </div>
            <div className="w-full max-w-xs h-2 bg-slate-100 rounded-full overflow-hidden mt-4">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${timerProgress}%` }}
              />
            </div>
            <div className="text-xs font-mono-num text-slate-500 mt-2">
              진행률 {timerProgress}% · 목표 {selectedMinutes}분
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRunning((r) => !r)}
              className="flex-1 min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRunning ? '일시정지' : '타이머 시작'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRunning(false);
                setSecondsLeft(selectedMinutes * 60);
              }}
              className="min-h-[42px] px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              초기화
            </button>
            <button
              type="button"
              onClick={handleFinishNow}
              className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              완료하고 스탯 · 경험치 받기
            </button>
          </div>
        </section>

        {/* Weekly 7-Day Report */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">최근 7일 성장 리포트</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                최근 일주일 동안의 영역별 누적 시간(분)입니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" /> 공부
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" /> 자기주도
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" /> 운동
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-teal-600" /> 독서·탐구
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-violet-600" /> 취미
              </span>
            </div>
          </div>

          {/* Clean Stacked Horizontal/Vertical Bars */}
          <div className="space-y-3 my-auto">
            {weeklyDays.map((day) => {
              const pctStudy = (day.study / maxWeeklyMinutes) * 100;
              const pctSelf = (day.self / maxWeeklyMinutes) * 100;
              const pctEx = (day.exercise / maxWeeklyMinutes) * 100;
              const pctRead = (day.reading / maxWeeklyMinutes) * 100;
              const pctHobby = (day.hobby / maxWeeklyMinutes) * 100;

              return (
                <div key={day.date} className="grid grid-cols-12 items-center gap-3 text-xs">
                  <div className="col-span-3 sm:col-span-2 font-mono-num text-slate-600 whitespace-nowrap">
                    {day.label}
                  </div>
                  <div className="col-span-7 sm:col-span-8 h-5 bg-slate-100 rounded-md overflow-hidden flex">
                    {pctStudy > 0 && (
                      <div
                        className="h-full bg-indigo-600"
                        style={{ width: `${pctStudy}%` }}
                        title={`교과 공부 ${day.study}분`}
                      />
                    )}
                    {pctSelf > 0 && (
                      <div
                        className="h-full bg-blue-600"
                        style={{ width: `${pctSelf}%` }}
                        title={`자기주도 ${day.self}분`}
                      />
                    )}
                    {pctEx > 0 && (
                      <div
                        className="h-full bg-emerald-600"
                        style={{ width: `${pctEx}%` }}
                        title={`운동 ${day.exercise}분`}
                      />
                    )}
                    {pctRead > 0 && (
                      <div
                        className="h-full bg-teal-600"
                        style={{ width: `${pctRead}%` }}
                        title={`독서·탐구 ${day.reading}분`}
                      />
                    )}
                    {pctHobby > 0 && (
                      <div
                        className="h-full bg-violet-600"
                        style={{ width: `${pctHobby}%` }}
                        title={`취미 ${day.hobby}분`}
                      />
                    )}
                  </div>
                  <div className="col-span-2 text-right font-mono-num font-semibold text-slate-800">
                    {day.total}분
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono-num">
            <span>
              7일 총합:{' '}
              <strong className="text-slate-900">
                {weeklyDays.reduce((s, d) => s + d.total, 0)}분
              </strong>
            </span>
            <span>기준 날짜: {formatLocalDate(new Date())}</span>
          </div>
        </section>
      </div>

      {/* SECTION 2: Activity History Log */}
      <section id="activity-history-section" className="space-y-4 scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              지금까지 한 전체 활동 기록 <span className="font-mono-num text-slate-500">{filteredLogs.length}</span>
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="활동 내용, 메모 검색..."
                className="pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white w-full sm:w-56 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
              {(['all', 'study', 'exercise', 'self_directed', 'reading', 'hobby'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    filterCategory === cat
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat === 'all' ? '전체' : CATEGORY_META[cat].shortLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              조건에 맞는 활동 기록이 없습니다. 상단의 활동 기록 버튼으로 첫 활동을 남겨보세요.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono-num">{log.date}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold" style={{ color: CATEGORY_META[log.category].color }}>
                      {CATEGORY_META[log.category].label}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">{log.minutes}분</span>
                    {log.eventTag && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-blue-700 font-medium">{log.eventTag}</span>
                      </>
                    )}
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate">{log.title}</div>
                  {log.memo && <div className="text-xs text-slate-600">{log.memo}</div>}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-right text-xs font-mono-num">
                    <div className="font-bold text-blue-700">+{log.xpEarned} XP</div>
                    <div className="text-slate-500">
                      {(Object.entries(log.statGains) as [CoreStatKey, number][])
                        .map(([k, v]) => `${CORE_STAT_MAP[k].label}+${v}`)
                        .join(' · ')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteLog(log.id)}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    aria-label="활동 기록 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* SECTION 3: Profile & Privacy Settings */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 inline-flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              프로필 · 개인정보 보호 및 데이터 관리
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {userEmail
                ? `로그인된 계정(${userEmail})의 활동 기록과 메모는 본인 외 누구도 열람할 수 없습니다.`
                : '현재 브라우저 로컬 체험 모드입니다. Google 로그인을 연결하면 안전하게 클라우드에 저장됩니다.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {userEmail ? (
              onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  로그아웃
                </button>
              )
            ) : (
              <>
                {onGoogleLogin && (
                  <button
                    type="button"
                    onClick={onGoogleLogin}
                    className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl whitespace-nowrap"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Google 로그인 연결
                  </button>
                )}
                {onExitGuest && (
                  <button
                    type="button"
                    onClick={onExitGuest}
                    className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl whitespace-nowrap"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    게스트 나가기
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <form onSubmit={handleProfileSave} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              학생 닉네임 (랭킹 표시명)
            </label>
            <input
              type="text"
              maxLength={40}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">학년</label>
            <select
              value={editGrade}
              onChange={(e) => setEditGrade(e.target.value as '고1' | '고2' | '고3')}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white"
            >
              <option value="고1">고등학교 1학년 (고1)</option>
              <option value="고2">고등학교 2학년 (고2)</option>
              <option value="고3">고등학교 3학년 (고3)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              목표 트랙 / 관심 계열
            </label>
            <input
              type="text"
              maxLength={60}
              value={editTrack}
              onChange={(e) => setEditTrack(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl"
            />
          </div>

          <div className="md:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <label className="inline-flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={editPublic}
                onChange={(e) => setEditPublic(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded"
              />
              <span>
                <strong>랭킹에 닉네임과 스탯 요약 공개하기</strong> (이메일과 학습 메모는 항상 비공개)
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onResetSampleData}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                0부터 새로 초기화
              </button>
              {userEmail && onDeleteCloudData && !confirmDeleteCloud && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteCloud(true)}
                  className="min-h-[40px] px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl"
                >
                  내 클라우드 데이터 영구 삭제
                </button>
              )}
              {userEmail && onDeleteCloudData && confirmDeleteCloud && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteCloudData();
                    setConfirmDeleteCloud(false);
                  }}
                  className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
                >
                  정말 삭제합니다 (확인)
                </button>
              )}
              <button
                type="submit"
                className="min-h-[40px] inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
              >
                <UserCheck className="w-3.5 h-3.5" />
                설정 저장
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
};
