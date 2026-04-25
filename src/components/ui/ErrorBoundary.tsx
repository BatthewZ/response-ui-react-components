import { Component } from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-surface-1">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-fg-secondary mb-6">An unexpected error occurred.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-primary text-fg-on-primary rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
