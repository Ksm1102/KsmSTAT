import React, { useState } from 'react';
import { Award, Lock, ShieldCheck, TrendingUp, Users } from 'lucide-react';

type HighSchoolGrade = '고1' | '고2' | '고3';

const GRADE_OPTIONS: { value: HighSchoolGrade; label: string; hint: string }[] = [
  { value: '고1', label: '고1', hint: '내신 기초 다지기 · 진로 탐색 루틴 추천' },
  { value: '고2', label: '고2', hint: '심화 탐구 · 세특과 모의고사 밸런스 추천' },
  { value: '고3', label: '고3', hint: '수능 실전 집중 · 취약 보완과 체력 관리 추천' },
];

interface LoginScreenProps {
  initialGrade?: HighSchoolGrade;
  initialNickname?: string;
  onGoogleLogin: (grade: HighSchoolGrade, nickname: string) => Promise<void>;
  onContinueGuest: (grade: HighSchoolGrade, nickname: string) => void;
  authError: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  initialGrade = '고2',
  initialNickname = '',
  onGoogleLogin,
  onContinueGuest,
  authError,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<HighSchoolGrade>(initialGrade);
  const [nickname, setNickname] = useState<string>(initialNickname);

  const handleLoginClick = async () => {
    setIsSigningIn(true);
    try {
      await onGoogleLogin(selectedGrade, nickname.trim().slice(0, 40));
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="max-w-4xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Value Proposition */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col justify-between gap-8">
          <div className="space-y-4">
            <div className="text-sm font-bold tracking-tight text-blue-600">
              가능?
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-snug [text-wrap:balance]">
              고등학생의 공부, 운동, 자기주도학습이 나만의 스탯과 레벨로 쌓입니다
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              매일의 교과 학습, 체력 단련, 오답노트와 독서를 기록하면 5대 핵심 능력치와 경험치가 오르고,
              레벨·스탯 조건부 목표와 챌린지에 도전할 수 있습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <div className="text-sm font-bold text-slate-900">레벨 · 스탯 · 아이템 성장</div>
              <p className="text-xs text-slate-600">
                레벨업 보너스 스탯 분배, 특정 날 부스트 이벤트, 학습·운동 장비 장착 지원
              </p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <Award className="w-4 h-4 text-violet-600" />
              <div className="text-sm font-bold text-slate-900">챌린지 · 희귀 스탯 · 랭킹</div>
              <p className="text-xs text-slate-600">
                7일 공부·30일 운동 챌린지 완주 시 희귀 스탯과 뱃지 지급, 친구 공유 및 랭킹
              </p>
            </div>
          </div>
        </div>

        {/* Right Sign-In & Security Card */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">안전한 계정 로그인</h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Google 계정 인증을 통해 본인만 내 학습 기록과 개인정보에 접근할 수 있습니다.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-slate-800">개인정보 철저 격리:</strong> 이메일·활동 메모·상세 기록은 본인 UID 인증 없이는 조회할 수 없습니다.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Users className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-slate-800">선택형 랭킹 공개:</strong> 랭킹에는 닉네임과 수치만 표시되며 언제든 비공개로 전환 가능합니다.
                </span>
              </div>
            </div>

            {authError && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
                {authError}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {/* Nickname & High School Grade Setup */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div>
                <label
                  htmlFor="login-nickname-input"
                  className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5"
                >
                  <span>내 닉네임 정하기</span>
                  <span className="font-normal text-[11px] text-slate-500">랭킹·칭호 표시</span>
                </label>
                <input
                  id="login-nickname-input"
                  type="text"
                  maxLength={40}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="사용할 닉네임을 입력하세요 (예: 불꽃열공러)"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">고등학교 학년 선택</span>
                  <span className="text-[11px] text-slate-500">동학년 랭킹 반영</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {GRADE_OPTIONS.map((opt) => {
                    const active = selectedGrade === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSelectedGrade(opt.value)}
                        className={`min-h-[36px] py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-600">
                  {GRADE_OPTIONS.find((o) => o.value === selectedGrade)?.hint}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isSigningIn}
              onClick={handleLoginClick}
              className="w-full min-h-[46px] inline-flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              {isSigningIn ? 'Google 로그인 연결 중...' : 'Google 계정으로 로그인'}
            </button>

            <button
              type="button"
              onClick={() => onContinueGuest(selectedGrade, nickname.trim().slice(0, 40))}
              className="w-full min-h-[42px] px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              {nickname.trim()
                ? `${nickname.trim()} (${selectedGrade})로 로그인 없이 둘러보기`
                : `${selectedGrade} 학생으로 로그인 없이 먼저 둘러보기`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
