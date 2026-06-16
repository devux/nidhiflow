import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD.");

export const workspaceIdSchema = z.object({
  workspaceId: z.string().trim().min(1),
});

export const reportExportIdSchema = z.object({
  exportId: z.string().trim().min(1),
});

const reportPeriodSchema = z.enum(["thisMonth", "lastMonth", "thisYear", "custom"]);

const reportFiltersBaseSchema = z.object({
  from: dateSchema.optional(),
  period: reportPeriodSchema.optional(),
  to: dateSchema.optional(),
});

type ReportFiltersInput = z.infer<typeof reportFiltersBaseSchema>;

function validateReportFilters(value: ReportFiltersInput, context: z.RefinementCtx) {
  const hasCustomBounds = value.from !== undefined || value.to !== undefined;
  const period = value.period ?? (hasCustomBounds ? "custom" : "thisMonth");

  if (period === "custom" && (!value.from || !value.to)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "From and to are required for custom report ranges.",
      path: value.from ? ["to"] : ["from"],
    });
  }

  if (value.from && value.to && value.from > value.to) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "The from date must be on or before the to date.",
      path: ["to"],
    });
  }
}

export const reportFiltersSchema = reportFiltersBaseSchema.superRefine(validateReportFilters);

export const reportExportTypeSchema = z.enum(["summary", "categories", "cashFlow"]);

export const createReportExportBodySchema = reportFiltersSchema
  .and(
    z.object({
      reportType: reportExportTypeSchema,
    }),
  )
  .refine(
    (value) => {
      const hasCustomBounds = value.from !== undefined || value.to !== undefined;
      return value.period !== "custom" || hasCustomBounds;
    },
    {
      message: "From and to are required for custom report ranges.",
    },
  );

export type ReportFilters = z.infer<typeof reportFiltersSchema>;
export type ReportExportType = z.infer<typeof reportExportTypeSchema>;
export type CreateReportExportBody = z.infer<typeof createReportExportBodySchema>;
