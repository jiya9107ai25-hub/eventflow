import { Component } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

/**
 * Error boundaries must be class components. One wraps the whole app and
 * another wraps each event workspace, so a crash in one module shows a
 * recoverable card instead of a blank page.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[EventFlow] Uncaught UI error', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div role="alert" className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-soft">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10 text-danger">
            <AlertOctagon className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="mt-1 text-sm text-muted-foreground">{this.state.error.message || 'An unexpected error occurred.'}</p>
          <div className="mt-5 flex justify-center gap-2">
            <button onClick={this.reset} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
              <RotateCcw className="h-4 w-4" /> Try again
            </button>
            <a href="/app" className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium">
              Go to dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
