import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || '알 수 없는 오류가 발생했습니다.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full space-y-4">
            <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">
              데이터 처리 중 문제가 발생했습니다
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              보안 규칙 또는 네트워크 연결 상태를 확인한 뒤 다시 시도해주세요.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
            >
              <RotateCcw className="w-4 h-4" />
              새로고침하여 복구하기
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
