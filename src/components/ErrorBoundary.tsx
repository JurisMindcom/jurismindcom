import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  telemetryId: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      telemetryId: this.generateTelemetryId(),
    };
  }

  private generateTelemetryId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const telemetryId = this.generateTelemetryId();
    this.setState({ errorInfo, telemetryId });
    
    // Log error with telemetry
    console.error('ErrorBoundary caught:', {
      telemetryId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 'N/A',
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      telemetryId: this.generateTelemetryId(),
    });
  };

  handleCopyDiagnostics = async () => {
    const diagnostics = {
      telemetryId: this.state.telemetryId,
      error: this.state.error?.message,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    
    await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            
            <h3 className="text-xl font-bold">Something went wrong</h3>
            <p className="text-muted-foreground text-sm">
              An unexpected error occurred. Please try again or contact support.
            </p>
            
            <div className="bg-muted/50 rounded-lg p-3 text-left">
              <p className="text-xs font-mono text-muted-foreground mb-1">
                Telemetry ID: {this.state.telemetryId}
              </p>
              <p className="text-xs text-destructive truncate">
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" size="sm" onClick={this.handleCopyDiagnostics}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Details
              </Button>
              <Button size="sm" onClick={this.handleRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
