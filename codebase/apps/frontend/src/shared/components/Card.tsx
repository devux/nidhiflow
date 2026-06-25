import MuiCard, { type CardProps as MuiCardProps } from "@mui/material/Card";
import type { ReactNode } from "react";

interface CardProps extends Omit<MuiCardProps, "variant"> {
  children: ReactNode;
  subtle?: boolean;
}

export function Card({ children, className = "", subtle = false, ...props }: CardProps) {
  return (
    <MuiCard
      className={`card ${subtle ? "card--subtle" : ""} ${className}`}
      component="section"
      elevation={0}
      {...props}
    >
      {children}
    </MuiCard>
  );
}
