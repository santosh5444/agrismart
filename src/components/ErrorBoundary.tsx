import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col justify-center items-center py-20 min-h-screen text-center px-4 bg-[#0a0f1e]" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass p-8 rounded-3xl border border-red-500/30 max-w-md w-full shadow-2xl" style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 font-bold text-2xl">
              ⚠️
            </div>
            <h2 className="text-xl font-black text-white mb-2">Application Error</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Something went wrong while rendering this page. You can reload the page or clear your browser cache.
            </p>
            <div className="text-[10px] font-mono text-red-400 bg-red-500/5 p-3 rounded-xl border border-red-500/10 text-left overflow-auto max-h-[150px] mb-6 whitespace-pre-wrap">
              {this.state.error?.toString()}
              {this.state.error?.stack}
            </div>
            <button 
              onClick={() => { window.location.reload(); }} 
              className="w-full py-3 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg shadow-red-600/30"
              style={{ background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Reload Website
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
