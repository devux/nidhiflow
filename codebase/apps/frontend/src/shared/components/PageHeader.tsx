import type { ReactNode } from "react";

export function PageHeader({ action, title }: { action?: ReactNode; title: string }) {
  return (
    <header className="page-header">
      <span>
        <h1 className="page-header__title">{title}</h1>
      </span>
      {action}
    </header>
  );
}
