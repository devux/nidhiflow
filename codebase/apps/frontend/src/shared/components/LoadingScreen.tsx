interface LoadingScreenProps {
  routePath?: string;
  variant?: "overlay" | "screen";
}

type SkeletonPage =
  | "activity"
  | "auth"
  | "budget"
  | "flow"
  | "home"
  | "profile"
  | "reports"
  | "transaction";

function getSkeletonPage(routePath = "/"): SkeletonPage {
  if (routePath.startsWith("/activity")) return "activity";
  if (routePath.startsWith("/reports")) return "reports";
  if (routePath.startsWith("/flow")) return "flow";
  if (routePath.startsWith("/budget") || routePath.startsWith("/plan")) return "budget";
  if (routePath.startsWith("/you")) return "profile";
  if (routePath.startsWith("/login") || routePath.startsWith("/signup")) return "auth";
  if (routePath.startsWith("/transactions/")) return "transaction";
  return "home";
}

function SkeletonLine({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "skeleton skeleton--line-compact" : "skeleton skeleton--line"} />
  );
}

function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="page-loading__rows">
      {Array.from({ length: count }, (_, index) => (
        <div className="page-loading__row" key={index}>
          <span className="skeleton page-loading__avatar" />
          <span className="page-loading__row-copy">
            <SkeletonLine compact />
            <SkeletonLine compact />
          </span>
          <span className="skeleton page-loading__amount" />
        </div>
      ))}
    </div>
  );
}

function PageHeaderSkeleton() {
  return (
    <div className="page-loading__header">
      <span className="skeleton skeleton--title" />
      <span className="skeleton page-loading__header-action" />
    </div>
  );
}

function HomeSkeleton() {
  return (
    <>
      <div className="page-loading__home-header">
        <span>
          <span className="skeleton skeleton--eyebrow" />
          <span className="skeleton skeleton--title" />
        </span>
        <span className="skeleton page-loading__header-action" />
      </div>
      <div className="page-loading__card page-loading__card--budget">
        <SkeletonLine compact />
        <span className="skeleton skeleton--amount" />
        <span className="skeleton skeleton--progress" />
        <div className="page-loading__stat-grid">
          <SkeletonLine compact />
          <SkeletonLine compact />
        </div>
      </div>
      <div className="page-loading__actions">
        <span className="skeleton skeleton--button" />
        <span className="skeleton skeleton--button" />
      </div>
      <div className="page-loading__section-heading">
        <SkeletonLine compact />
        <span className="skeleton skeleton--small" />
      </div>
      <SkeletonRows count={4} />
    </>
  );
}

function ActivitySkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="page-loading__filters">
        <span className="skeleton skeleton--control" />
        <span className="skeleton skeleton--control" />
      </div>
      <div className="page-loading__section-heading">
        <SkeletonLine compact />
      </div>
      <SkeletonRows count={6} />
    </>
  );
}

function ReportsSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="page-loading__filters">
        <span className="skeleton skeleton--control" />
        <span className="skeleton skeleton--control" />
      </div>
      <div className="page-loading__card page-loading__card--chart">
        <SkeletonLine compact />
        <span className="skeleton skeleton--amount" />
        <div className="page-loading__chart-content">
          <span className="skeleton page-loading__donut" />
          <span className="page-loading__chart-legend">
            <SkeletonLine compact />
            <SkeletonLine compact />
            <SkeletonLine compact />
          </span>
        </div>
      </div>
      <div className="page-loading__card page-loading__card--trend">
        <SkeletonLine compact />
        <span className="skeleton page-loading__chart-bars" />
      </div>
      <div className="page-loading__card">
        <SkeletonLine compact />
        <SkeletonRows />
      </div>
    </>
  );
}

function BudgetSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="page-loading__tabs">
        <span className="skeleton skeleton--tab" />
        <span className="skeleton skeleton--tab" />
      </div>
      <div className="page-loading__card page-loading__card--budget">
        <SkeletonLine compact />
        <span className="skeleton skeleton--amount" />
        <span className="skeleton skeleton--progress" />
        <div className="page-loading__stat-grid">
          <SkeletonLine compact />
          <SkeletonLine compact />
        </div>
      </div>
      <div className="page-loading__section-heading">
        <SkeletonLine compact />
        <span className="skeleton page-loading__header-action" />
      </div>
      <SkeletonRows count={4} />
    </>
  );
}

function FlowSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="page-loading__card page-loading__card--flow">
        <span className="skeleton page-loading__flow-orb" />
        <span>
          <SkeletonLine compact />
          <SkeletonLine />
        </span>
      </div>
      <div className="page-loading__chat">
        <span className="skeleton page-loading__message page-loading__message--assistant" />
        <span className="skeleton page-loading__message page-loading__message--user" />
        <span className="skeleton page-loading__message page-loading__message--assistant" />
      </div>
      <span className="skeleton page-loading__composer" />
    </>
  );
}

function ProfileSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="page-loading__card page-loading__profile-card">
        <span className="skeleton page-loading__profile-avatar" />
        <span>
          <SkeletonLine compact />
          <SkeletonLine compact />
        </span>
      </div>
      <div className="page-loading__section-heading">
        <SkeletonLine compact />
      </div>
      <div className="page-loading__quick-grid">
        <span className="skeleton page-loading__quick-card" />
        <span className="skeleton page-loading__quick-card" />
      </div>
      <div className="page-loading__section-heading">
        <SkeletonLine compact />
      </div>
      <SkeletonRows count={4} />
    </>
  );
}

function FormSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="page-loading__form">
        <span className="skeleton skeleton--label" />
        <span className="skeleton skeleton--input skeleton--input-large" />
        <span className="skeleton skeleton--label" />
        <div className="page-loading__category-grid">
          {Array.from({ length: 8 }, (_, index) => (
            <span className="skeleton page-loading__category" key={index} />
          ))}
        </div>
        <span className="skeleton skeleton--input" />
        <span className="skeleton skeleton--input" />
        <span className="skeleton skeleton--button" />
      </div>
    </>
  );
}

function AuthSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="page-loading__card page-loading__auth-card">
        <SkeletonLine />
        <span className="skeleton skeleton--input" />
        <span className="skeleton skeleton--input" />
        <span className="skeleton skeleton--button" />
        <SkeletonLine compact />
      </div>
    </>
  );
}

function SkeletonContent({ page }: { page: SkeletonPage }) {
  switch (page) {
    case "activity":
      return <ActivitySkeleton />;
    case "auth":
      return <AuthSkeleton />;
    case "budget":
      return <BudgetSkeleton />;
    case "flow":
      return <FlowSkeleton />;
    case "profile":
      return <ProfileSkeleton />;
    case "reports":
      return <ReportsSkeleton />;
    case "transaction":
      return <FormSkeleton />;
    default:
      return <HomeSkeleton />;
  }
}

export function LoadingScreen({ routePath, variant = "screen" }: LoadingScreenProps) {
  const resolvedPath =
    routePath ?? (typeof window === "undefined" ? "/" : window.location.pathname);
  const page = getSkeletonPage(resolvedPath);
  const content = (
    <>
      <span className="sr-only">Loading page content</span>
      <div aria-hidden="true" className={`page page-loading page-loading--${page}`}>
        <SkeletonContent page={page} />
      </div>
    </>
  );

  if (variant === "overlay") {
    return (
      <div
        aria-busy="true"
        aria-label="Loading page content"
        className="state-screen state-screen--overlay"
        role="status"
      >
        {content}
      </div>
    );
  }

  return (
    <main aria-busy="true" aria-label="Loading page content" className="state-screen" role="status">
      {content}
    </main>
  );
}
