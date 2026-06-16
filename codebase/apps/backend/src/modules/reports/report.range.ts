import type { ReportFilters } from "./report.schemas.js";

export interface ResolvedReportRange {
  from: string;
  label: string;
  period: "thisMonth" | "lastMonth" | "thisYear" | "custom";
  to: string;
  timezone: string;
}

function getZonedDateString(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function toUtcDate(dateString: string) {
  const [yearRaw, monthRaw, dayRaw] = dateString.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  return new Date(Date.UTC(year, month - 1, day));
}

function fromUtcDate(date: Date) {
  return `${date.getUTCFullYear().toString().padStart(4, "0")}-${(date.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}`;
}

function addDays(dateString: string, days: number) {
  const date = toUtcDate(dateString);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtcDate(date);
}

function addMonths(dateString: string, months: number) {
  const date = toUtcDate(dateString);
  date.setUTCMonth(date.getUTCMonth() + months);
  return fromUtcDate(date);
}

function getCurrentLocalDate(timeZone: string) {
  return getZonedDateString(new Date(), timeZone);
}

export function resolveReportRange(filters: ReportFilters, timeZone: string): ResolvedReportRange {
  const period = filters.period ?? (filters.from || filters.to ? "custom" : "thisMonth");

  if (period === "custom") {
    const from = filters.from as string;
    const to = filters.to as string;

    return {
      from,
      label: "Custom",
      period,
      to,
      timezone: timeZone,
    };
  }

  const today = getCurrentLocalDate(timeZone);

  if (period === "lastMonth") {
    const thisMonthStart = `${today.slice(0, 7)}-01`;
    const from = addMonths(thisMonthStart, -1);
    const to = addDays(thisMonthStart, -1);

    return {
      from,
      label: "Last month",
      period,
      to,
      timezone: timeZone,
    };
  }

  if (period === "thisYear") {
    const year = today.slice(0, 4);

    return {
      from: `${year}-01-01`,
      label: "This year",
      period,
      to: `${year}-12-31`,
      timezone: timeZone,
    };
  }

  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = addDays(addMonths(monthStart, 1), -1);

  return {
    from: monthStart,
    label: "This month",
    period,
    to: monthEnd,
    timezone: timeZone,
  };
}
