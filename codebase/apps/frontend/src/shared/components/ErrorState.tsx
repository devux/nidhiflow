import { Button } from "./Button";
import { Icon } from "./Icon";

interface ErrorStateProps {
  actionLabel: string;
  description: string;
  onAction: () => void;
  title: string;
}

export function ErrorState({ actionLabel, description, onAction, title }: ErrorStateProps) {
  return (
    <main className="state-screen">
      <div className="state-screen__content" role="alert">
        <span className="icon-tile icon-tile--large icon-tile--danger">
          <Icon name="shield" size={30} />
        </span>
        <h1>{title}</h1>
        <p>{description}</p>
        <Button onClick={onAction}>{actionLabel}</Button>
      </div>
    </main>
  );
}
