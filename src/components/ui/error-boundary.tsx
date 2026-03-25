"use client";

import { Button } from "@/components/ui/button";
import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
  readonly onRetry?: () => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-background px-6 text-center"
          role="alert"
        >
          <p className="text-sm text-muted-foreground">
            Something went wrong displaying this content.
          </p>
          <Button type="button" onClick={this.handleRetry}>
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ChatErrorBoundary = ({
  children,
}: {
  readonly children: ReactNode;
}) => (
  <ErrorBoundary
    fallback={
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-background px-6 text-center"
        role="alert"
      >
        <p className="text-sm text-muted-foreground">
          The chat encountered an error. Please refresh the page.
        </p>
        <Button
          type="button"
          onClick={() => {
            window.location.reload();
          }}
        >
          Refresh
        </Button>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);