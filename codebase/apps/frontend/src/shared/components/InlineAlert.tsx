import type { ReactNode } from "react";

import { Icon } from "./Icon";

export function InlineAlert({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="inline-alert" role="status">
      <Icon name="shield" />
      <span>
        <strong>{title}</strong>
        <span>{children}</span>
      </span>
    </div>
  );
}
