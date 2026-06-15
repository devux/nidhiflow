import type { ReactNode } from "react";

import { Icon, type IconName } from "./Icon";

interface EmptyStateProps {
  action?: ReactNode;
  description: string;
  icon?: IconName;
  title: string;
}

export function EmptyState({ action, description, icon = "activity", title }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="icon-tile icon-tile--large">
        <Icon name={icon} size={28} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
