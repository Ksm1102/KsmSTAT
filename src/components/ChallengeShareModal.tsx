import React, { useState } from 'react';
import { Check, Copy, Download, Share2, X } from 'lucide-react';
import { RARE_STATS } from '../data/presets';
import { ChallengeDefinition, ChallengeParticipation } from '../types/statup';

interface ChallengeShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentGrade: string;
  studentLevel: number;
  challenge: ChallengeDefinition | null;
  participation: ChallengeParticipation | null;
  onNotifyShare: (message: string) => void;
}

export const ChallengeShareModal: React.FC<ChallengeShareModalProps> = ({
  isOpen,
  onClose,
  studentName,
  studentGrade,
  studentLevel,
  challenge,
  participation,
  onNotifyShare,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !challenge || !participation) return null;

  const doneDays = participation.completedDates.length;
  const percent = Math.min(100, Math.round((doneDays / challenge.targetDays) * 100));
  const rareStatName = RARE_STATS[challenge.rewardRareStat].label;
  const isCompleted = doneDays >= challenge.targetDays;

  const shareText = [
    `[가능? 챌린지 공유] ${studentName} (${studentGrade} · Lv.${studentLevel})`,
    `도전 중: ${challenge.title}`,
    `진행 현황: ${doneDays}일 / ${challenge.targetDays}일 (${percent}%)${isCompleted ? ' · 완주 달성!' : ''}`,
    `완료 보상: ${challenge.badgeTitle} 뱃지 & 희귀 스탯 [${rareStatName} +${challenge.rewardRareStatAmount}]`,
    `같이 챌린지 도전해볼래? 오늘도 성장 스탯 +1!`,
  ].join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      onNotifyShare('친구에게 보낼 챌린지 공유 문구를 클립보드에 복사했습니다.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onNotifyShare('클립보드 복사를 사용할 수 없어 아래 텍스트를 직접 복사해주세요.');
    }
  };

  const escapeXml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const handleDownloadSvgCard = () => {
    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" rx="24" fill="#0F172A"/>
  <rect x="24" y="24" width="592" height="312" rx="16" fill="#1E293B" stroke="#334155" stroke-width="1"/>
  <text x="52" y="70" fill="#60A5FA" font-family="sans-serif" font-size="14" font-weight="700">가능? · 고등학생 성장 챌린지 카드</text>
  <text x="52" y="114" fill="#F8FAFC" font-family="sans-serif" font-size="24" font-weight="700">${escapeXml(challenge.title)}</text>
  <text x="52" y="146" fill="#94A3B8" font-family="sans-serif" font-size="15">${escapeXml(studentName)} · ${escapeXml(studentGrade)} · Lv.${studentLevel}</text>
  <rect x="52" y="182" width="536" height="16" rx="8" fill="#0F172A"/>
  <rect x="52" y="182" width="${Math.max(16, Math.round((536 * percent) / 100))}" height="16" rx="8" fill="#2563EB"/>
  <text x="52" y="232" fill="#E2E8F0" font-family="monospace" font-size="22" font-weight="700">${doneDays} / ${challenge.targetDays}일 달성 (${percent}%)</text>
  <text x="52" y="276" fill="#CBD5E1" font-family="sans-serif" font-size="14">완주 보상: ${escapeXml(challenge.badgeTitle)} · 희귀 스탯 ${escapeXml(rareStatName)} +${challenge.rewardRareStatAmount}</text>
  <text x="52" y="308" fill="#64748B" font-family="sans-serif" font-size="12">매일 1%씩 성장하는 나의 고교 생활 기록</text>
</svg>`.trim();

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statup-challenge-${challenge.id}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    onNotifyShare('챌린지 인증 카드를 이미지(SVG)로 저장했습니다.');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-blue-600" />
            <h2 id="share-modal-title" className="text-base font-bold text-slate-900">
              친구에게 챌린지 진행 상황 공유
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            aria-label="공유 창 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Preview Share Card */}
          <div className="bg-slate-900 text-white rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>가능? 챌린지 현황</span>
              <span className="font-mono-num">
                {studentName} · {studentGrade} · Lv.{studentLevel}
              </span>
            </div>
            <div className="text-lg font-bold leading-snug">{challenge.title}</div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono-num">
                <span className="text-slate-300">달성률 {percent}%</span>
                <span className="text-blue-400 font-semibold">
                  {doneDays}일 / {challenge.targetDays}일
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <span>보상 뱃지: {challenge.badgeTitle}</span>
              <span className="font-mono-num text-violet-300">
                {rareStatName} +{challenge.rewardRareStatAmount}
              </span>
            </div>
          </div>

          {/* Copyable Message Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              공유 메시지 미리보기
            </label>
            <textarea
              readOnly
              rows={5}
              value={shareText}
              className="w-full text-xs leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors whitespace-nowrap"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? '복사 완료!' : '공유 문구 복사하기'}
            </button>
            <button
              type="button"
              onClick={handleDownloadSvgCard}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              인증 카드 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
