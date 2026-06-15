import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  subtle?: boolean;
}

export function Card({ children, className = "", subtle = false, ...props }: CardProps) {
  return (
    <section className={`card ${subtle ? "card--subtle" : ""} ${className}`} {...props}>
      {children}
    </section>
  );
}
