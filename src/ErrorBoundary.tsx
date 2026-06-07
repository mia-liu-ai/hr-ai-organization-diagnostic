import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('模块渲染失败，已进入中文兜底页', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-100 px-5 py-8 text-slate-900">
        <div className="mx-auto max-w-3xl rounded-lg border border-amber-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-amber-700">演示兜底</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            当前模块暂时不可用，已阻止白屏
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            页面渲染时遇到异常。请刷新页面，或回到首页点击“初始化演示数据”后继续演示。
          </p>
          {this.state.message ? (
            <pre className="mt-4 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              {this.state.message}
            </pre>
          ) : null}
          <button
            className="mt-5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            onClick={() => window.location.reload()}
          >
            刷新页面
          </button>
        </div>
      </div>
    );
  }
}
