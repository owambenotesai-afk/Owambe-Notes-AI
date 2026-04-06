import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-900 p-4">
          <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
            <h2 className="text-xl font-semibold mb-4 text-red-600">Something went wrong</h2>
            <p className="text-sm text-stone-600 mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <pre className="bg-stone-100 p-4 rounded-xl text-xs overflow-auto max-h-64 mb-4">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#00BFA5] text-white py-2 rounded-xl hover:bg-[#00A892] transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
