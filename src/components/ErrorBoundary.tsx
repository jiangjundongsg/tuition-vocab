'use client';

import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="font-semibold text-red-700 mb-1">Something went wrong</p>
          <p className="text-sm text-red-500 mb-3">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-sm font-semibold text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
