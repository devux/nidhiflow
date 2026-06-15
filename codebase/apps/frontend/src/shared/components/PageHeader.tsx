import type { ReactNode } from "react";

export function PageHeader({
  action,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  eyebrow?: string;
  title: string;
}) {
  return (
    <header className="page-header">
      <span>
        {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
      </span>
      {action}
    </header>
  );
}
