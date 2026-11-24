import React, { useMemo, useState } from 'react';
import { Award, Check, Copy, Lock, ShieldCheck, Trophy, Users } from 'lucide-react';
import { CloudLeaderboardPeer } from '../lib/firebase';
import { AppState } from '../types/statup';
import {
  LeaderboardEntry,
  RankingMetric,
  RankingScope,
  buildLeaderboard,
} from '../utils/calculations';

interface RankingViewProps {
  appState: AppState;
  cloudPeers: CloudLeaderboardPeer[];
  currentUserId: string | null;
  isPublicInRanking: boolean;
  onTogglePublicInRanking: (next: boolean) => void;
  onNotifyShare: (msg: string) => void;
}

const METRICS: { key: RankingMetric; label: string; unit: string }[] = [
  { key: 'overall', label: '종합 능력치', unit: 'pt' },
  { key: 'knowledge', label: '지식 스탯', unit: 'pt' },
  { key: 'stamina', label: '체력 스탯', unit: 'pt' },
  { key: 'autonomy', label: '주도력 스탯', unit: 'pt' },
  { key: 'weeklyMinutes', label: '주간 활동시간', unit: '분' },
];

const SCOPES: { key: RankingScope; label: string }[] = [
  { key: 'all', label: '전체 학생' },
  { key: 'grade', label: '같은 학년' },
  { key: 'friends', label: '친구 목록' },
];

export const RankingView: React.FC<RankingViewProps> = ({
  appState,
  cloudPeers,
  currentUserId,
  isPublicInRanking,
  onTogglePublicInRanking,
  onNotifyShare,
}) => {
  const [metric, setMetric] = useState<RankingMetric>('overall');
  const [scope, setScope] = useState<RankingScope>('all');
  const [copiedRank, setCopiedRank] = useState(false);

  // Merge local peers with real authenticated cloud peers (excluding currentUserId duplicate)
  const mergedLeaderboard: LeaderboardEntry[] = useMemo(() => {
    const baseEntries = buildLeaderboard(appState, metric, scope);
    const extraCloud = cloudPeers
      .filter((p) => p.id !== currentUserId)
      .filter((p) => {
        if (scope === 'grade') return p.grade === appState.profile.grade;
        return true;
      })
      .map((p): LeaderboardEntry => {
        const metricVal =
          metric === 'knowledge'
            ? p.knowledge
            : metric === 'stamina'
            ? p.stamina
            : metric === 'autonomy'
            ? p.autonomy
            : metric === 'weeklyMinutes'
            ? p.weeklyMinutes
            : p.totalPower;
        return {
          id: p.id,
          name: p.name,
          grade: p.grade,
          track: p.track,
          isMe: false,
          isFriend: false,
          level: p.level,
          totalXp: p.totalXp,
          totalPower: p.totalPower,
          knowledge: p.knowledge,
          stamina: p.stamina,
          autonomy: p.autonomy,
          focus: p.focus,
          inquiry: p.inquiry,
          weeklyMinutes: p.weeklyMinutes,
          streak: p.streak,
          rareScore: p.rareScore,
          metricValue: metricVal,
          rank: 0,
        };
      });

    const combined = [...baseEntries, ...extraCloud]
      .sort((a, b) => b.metricValue - a.metricValue || b.totalXp - a.totalXp)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    return combined;
  }, [appState, cloudPeers, currentUserId, metric, scope]);

  const myEntry = mergedLeaderboard.find((e) => e.isMe)!;
  const aheadEntry =
    myEntry && myEntry.rank > 1 ? mergedLeaderboard[myEntry.rank - 2] : null;
  const activeMetricMeta = METRICS.find((m) => m.key === metric)!;

  const handleCopyRank = async () => {
    if (!myEntry) return;
    const text = `[가능? 성장 랭킹] ${myEntry.name} (${myEntry.grade} · Lv.${myEntry.level})\n${activeMetricMeta.label} 기준 ${myEntry.rank}위 (${myEntry.metricValue} ${activeMetricMeta.unit})\n연속 기록 ${myEntry.streak}일 달성 중!`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedRank(true);
      onNotifyShare('내 랭킹 요약을 클립보드에 복사했습니다.');
      setTimeout(() => setCopiedRank(false), 2000);
    } catch {
      onNotifyShare('복사 권한이 제한되어 있습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            고등학생 성장 랭킹
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            공부·운동·자기주도학습으로 쌓은 레벨과 스탯이 실시간으로 반영됩니다. 이메일 등 개인정보는 절대 공개되지 않습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {currentUserId && (
            <button
              type="button"
              onClick={() => onTogglePublicInRanking(!isPublicInRanking)}
              className={`min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap ${
                isPublicInRanking
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {isPublicInRanking ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {isPublicInRanking ? '랭킹 닉네임 공개 중 (비공개 전환)' : '비공개 모드 (클라우드 랭킹 숨김)'}
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyRank}
            className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors whitespace-nowrap"
          >
            {copiedRank ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedRank ? '순위 복사됨' : '내 순위 공유하기'}
          </button>
        </div>
      </div>

      {/* My Live Standing Card */}
      {myEntry && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <div>
            <div className="text-xs font-semibold text-slate-500">나의 현재 순위</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono-num text-blue-600">
                #{myEntry.rank}
              </span>
              <span className="text-xs text-slate-500 font-mono-num">
                / {mergedLeaderboard.length}명 중
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500">{activeMetricMeta.label}</div>
            <div className="mt-1 text-2xl font-bold font-mono-num text-slate-900">
              {myEntry.metricValue}{' '}
              <span className="text-sm font-medium text-slate-500">{activeMetricMeta.unit}</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500">레벨 · 연속 기록</div>
            <div className="mt-1 text-lg font-bold font-mono-num text-slate-900">
              Lv.{myEntry.level} · {myEntry.streak}일 연속
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500">다음 순위까지</div>
            <div className="mt-1 text-sm font-semibold text-slate-800">
              {aheadEntry ? (
                <span className="font-mono-num">
                  {aheadEntry.name}님까지{' '}
                  <strong className="text-blue-600">
                    {Math.max(1, aheadEntry.metricValue - myEntry.metricValue + 1)}{' '}
                    {activeMetricMeta.unit}
                  </strong>
                </span>
              ) : (
                <span className="text-emerald-700 inline-flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  현재 1위 유지 중!
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMetric(m.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                metric === m.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setScope(s.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                scope === s.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                <th className="py-3 px-4 w-16">순위</th>
                <th className="py-3 px-4">학생 (학년 · 트랙)</th>
                <th className="py-3 px-4 text-right">레벨</th>
                <th className="py-3 px-4 text-right">{activeMetricMeta.label}</th>
                <th className="py-3 px-4 text-right hidden sm:table-cell">희귀 스탯</th>
                <th className="py-3 px-4 text-right hidden md:table-cell">연속 기록</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {mergedLeaderboard.map((entry) => (
                <tr
                  key={entry.id}
                  className={
                    entry.isMe
                      ? 'bg-blue-50/60 font-medium'
                      : 'hover:bg-slate-50/70 transition-colors'
                  }
                >
                  <td className="py-3.5 px-4 font-mono-num font-bold text-slate-900">
                    {entry.rank <= 3 ? (
                      <span
                        className={
                          entry.rank === 1
                            ? 'text-amber-600'
                            : entry.rank === 2
                            ? 'text-slate-600'
                            : 'text-amber-800'
                        }
                      >
                        #{entry.rank}
                      </span>
                    ) : (
                      <span className="text-slate-500">#{entry.rank}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {entry.name}
                        {entry.isMe && ' (나)'}
                      </span>
                      {entry.isFriend && !entry.isMe && (
                        <span className="text-[11px] text-blue-600 inline-flex items-center gap-0.5">
                          <Users className="w-3 h-3" /> 친구
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {entry.grade} · {entry.track || '자기주도 성장 트랙'}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-num font-semibold text-slate-800">
                    Lv.{entry.level}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-num font-bold text-blue-700">
                    {entry.metricValue} {activeMetricMeta.unit}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-num text-slate-600 hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-violet-500" />
                      {entry.rareScore}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-num text-slate-600 hidden md:table-cell">
                    {entry.streak}일
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
