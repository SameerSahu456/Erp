import { AppProviders } from "./app/providers";
import { AppRouter } from "./app/router";
import { ErrorBoundary } from "@shared/errors/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </ErrorBoundary>
  );
}
