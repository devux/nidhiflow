interface LoadingScreenProps {
  variant?: "overlay" | "screen";
}

export function LoadingScreen({ variant = "screen" }: LoadingScreenProps) {
  const content = (
    <>
      <span aria-hidden="true" className="loading-spinner" />
      <div className="loading-card">
        <span className="skeleton skeleton--title" />
        <span className="skeleton skeleton--line" />
        <span className="skeleton skeleton--panel" />
        <span className="sr-only">Loading your local guest workspace</span>
      </div>
    </>
  );

  if (variant === "overlay") {
    return (
      <div
        aria-busy="true"
        aria-label="Loading NidhiFlow"
        className="state-screen state-screen--overlay"
        role="status"
      >
        {content}
      </div>
    );
  }

  return (
    <main aria-busy="true" aria-label="Loading NidhiFlow" className="state-screen" role="status">
      {content}
    </main>
  );
}
