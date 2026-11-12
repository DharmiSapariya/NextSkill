import { Component, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "./ui";

class RouteErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <section className="rounded-2xl border border-forest/15 bg-cream px-6 py-12 text-center">
        <div role="alert">
          <h1 className="font-display text-xl font-bold text-ink">This page couldn’t load</h1>
          <p className="mt-2 text-sm text-ink/80">Reload the page to try again.</p>
        </div>
        <Button className="mt-5" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      </section>
    );
  }
}

export default function RouteContent({ children }) {
  const { pathname } = useLocation();

  // Changing pages resets a failed boundary without remounting the workspace shell.
  return (
    <RouteErrorBoundary key={pathname}>
      <Suspense
        fallback={(
          <div role="status" className="grid min-h-48 place-items-center text-sm font-semibold text-ink/80">
            Loading page…
          </div>
        )}
      >
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
}
