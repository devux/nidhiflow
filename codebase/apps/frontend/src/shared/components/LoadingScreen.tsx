export function LoadingScreen() {
  return (
    <main aria-busy="true" aria-label="Loading NidhiFlow" className="state-screen">
      <div className="loading-card">
        <span className="skeleton skeleton--title" />
        <span className="skeleton skeleton--line" />
        <span className="skeleton skeleton--panel" />
        <span className="sr-only">Loading your local guest workspace</span>
      </div>
    </main>
  );
}
