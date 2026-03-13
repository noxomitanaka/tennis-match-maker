import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-lg mx-auto p-8 text-center">
          <h2 className="text-xl font-bold mb-2">エラーが発生しました</h2>
          <p className="text-sm text-muted-foreground mb-4">
            予期しないエラーが発生しました。ページをリロードしてください。
          </p>
          {this.state.error && (
            <details className="text-left mb-4 p-3 bg-muted rounded text-xs">
              <summary className="cursor-pointer text-muted-foreground">エラー詳細</summary>
              <pre className="mt-2 whitespace-pre-wrap">{this.state.error.message}</pre>
            </details>
          )}
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.reload()}>リロード</Button>
            <Button variant="outline" onClick={() => this.setState({ hasError: false, error: null })}>
              このまま続行
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
