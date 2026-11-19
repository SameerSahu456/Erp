import { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "@shared/lib/logger";
import { Typography } from "@/components/ui/typography";

interface Props {
  fallback?: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isChunkError: false };

  static getDerivedStateFromError(error: Error): State {
    const isChunkError =
      error.name === "ChunkLoadError" ||
      error.message?.includes("Failed to fetch dynamically imported module") ||
      error.message?.includes("Failed to load module script") ||
      error.message?.includes("Loading chunk");
    return { hasError: true, isChunkError };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error("ErrorBoundary caught", { error, componentStack: info.componentStack });
    // Auto-reload on chunk errors: a stale deployment has removed this chunk.
    if (this.state.isChunkError) {
      console.warn("[ChunkLoad] ErrorBoundary caught stale chunk, reloading...");
      setTimeout(() => window.location.reload(), 500);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        // Show a brief message before the auto-reload kicks in.
        return <StaleChunkFallback />;
      }
      return this.props.fallback ?? <DefaultErrorFallback />;
    }
    return this.props.children;
  }
}

function DefaultErrorFallback() {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 p-10 text-center"
    >
      <Typography variant="subsection-title" tone="danger">Something went wrong</Typography>
      <Typography variant="body" tone="muted">
        Reload the page or contact support if the problem persists.
      </Typography>
      <button
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </div>
  );
}

/** Shown when a lazy-loaded route chunk fails because a stale deployment
 *  invalidated the chunk hash. The page auto-reloads within ~500ms
 *  (componentDidCatch), so we render ONLY the spinner — surfacing an
 *  "App version updated" banner for that split second read as a jarring
 *  flash during normal loads. */
function StaleChunkFallback() {
  return (
    <div
      role="status"
      aria-label="Reloading"
      className="flex items-center justify-center p-10"
    >
      <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

interface ModuleErrorStateProps {
  module: string;
}

export function ModuleErrorState({ module }: ModuleErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 p-10 text-center"
    >
      <Typography variant="subsection-title" tone="danger">{module} module failed to load</Typography>
      <Typography variant="body" tone="muted">Try reloading or navigating away.</Typography>
      <button
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </div>
  );
}
