import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "activity"
  | "arrow"
  | "bell"
  | "calendar"
  | "chart"
  | "check"
  | "chevron"
  | "cloud"
  | "expense"
  | "feedback"
  | "flow"
  | "goal"
  | "home"
  | "income"
  | "lock"
  | "moon"
  | "plan"
  | "plus"
  | "report"
  | "shield"
  | "sparkles"
  | "sun"
  | "user";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 24, ...props }: IconProps) {
  const paths: Record<IconName, ReactNode> = {
    activity: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5l3.5 2" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M8 3v4m8-4v4M3 10h18" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V9m6 10V5m6 14v-7m4 7H2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 6 6 6-6 6" />,
    cloud: (
      <>
        <path d="M7 18h11a4 4 0 0 0 .5-8A7 7 0 0 0 5 8.5 4.5 4.5 0 0 0 7 18Z" />
        <path d="m12 10 3 3h-2v4h-2v-4H9l3-3Z" />
      </>
    ),
    expense: (
      <>
        <path d="M12 3v18M5 12h14" />
      </>
    ),
    feedback: (
      <>
        <path d="M4 5h16v12H8l-4 4V5Z" />
        <path d="M8 10h8M8 13h5" />
      </>
    ),
    flow: (
      <>
        <circle cx="12" cy="12" r="4" />
        <ellipse cx="12" cy="12" rx="10" ry="4.5" />
        <ellipse cx="12" cy="12" rx="4.5" ry="10" transform="rotate(38 12 12)" />
      </>
    ),
    goal: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="4" />
        <path d="m15 9 6-6m-1 0h1v1" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M10 20v-6h4v6" />
      </>
    ),
    income: (
      <>
        <rect x="4" y="6" width="16" height="14" rx="3" />
        <path d="M8 6V4h8v2m-4 3v7m-3-3 3 3 3-3" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
      </>
    ),
    moon: <path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />,
    plan: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 3.5V12h8.5M12 12l-5.5 6.5" />
      </>
    ),
    plus: <path d="M12 4v16M4 12h16" />,
    report: (
      <>
        <path d="M4 20V10m5 10V4m5 16v-7m5 7V7" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-3Z" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 2 1.3 4.7L18 8l-4.7 1.3L12 14l-1.3-4.7L6 8l4.7-1.3L12 2Z" />
        <path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 24 24" width={size} {...props}>
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9">
        {paths[name]}
      </g>
    </svg>
  );
}
