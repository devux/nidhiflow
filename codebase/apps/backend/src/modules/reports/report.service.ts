import { AppError } from "../../shared/errors/appError.js";
import { createId } from "../../shared/security/ids.js";
import type { Database } from "../../shared/database/database.js";
import { WorkspaceRepository } from "../workspaces/workspace.repository.js";
import { buildCategoriesCsv, buildCashFlowCsv, buildSummaryCsv } from "./report.csv.js";
import { resolveReportRange } from "./report.range.js";
import { ReportRepository } from "./report.repository.js";
import type { CreateReportExportBody, ReportExportType, ReportFilters } from "./report.schemas.js";

function notFound() {
  return new AppError({
    code: "NOT_FOUND",
    message: "The requested resource was not found.",
    status: 404,
  });
}

function reportFileSlug(reportType: ReportExportType) {
  return reportType === "cashFlow" ? "cash-flow" : reportType;
}

function formatDownloadUrl(workspaceId: string, exportId: string) {
  return `/api/v1/workspaces/${workspaceId}/reports/exports/${exportId}/download`;
}

function buildExportStorageKey(reportType: ReportExportType, exportId: string) {
  return `reports/${reportType}/${exportId}.csv`;
}

interface ResolvedReportData {
  accounts: Awaited<ReturnType<ReportRepository["getAccountBreakdown"]>>;
  categories: Awaited<ReturnType<ReportRepository["getCategoryBreakdown"]>>;
  currency: string;
  period: ReturnType<typeof resolveReportRange>;
  points: Awaited<ReturnType<ReportRepository["getCashFlow"]>>;
  summary: Awaited<ReturnType<ReportRepository["getSummaryTotals"]>>;
}

function buildReportCsv(reportType: ReportExportType, report: ResolvedReportData) {
  return reportType === "summary"
    ? buildSummaryCsv({
        accounts: report.accounts,
        categories: report.categories,
        currency: report.currency,
        period: report.period.label,
        totals: report.summary,
      })
    : reportType === "categories"
      ? buildCategoriesCsv({
          accounts: report.accounts,
          categories: report.categories,
          currency: report.currency,
          period: report.period.label,
        })
      : buildCashFlowCsv({
          currency: report.currency,
          period: report.period.label,
          points: report.points,
        });
}

export class ReportService {
  private readonly workspaceRepository: WorkspaceRepository;
  private readonly repository: ReportRepository;

  constructor(private readonly database: Database) {
    this.workspaceRepository = new WorkspaceRepository(database);
    this.repository = new ReportRepository(database);
  }

  private async ensureWorkspaceAccess(userId: string, workspaceId: string) {
    const workspace = await this.workspaceRepository.findWorkspaceForUser(userId, workspaceId);

    if (!workspace) {
      throw notFound();
    }

    return workspace;
  }

  private async resolveReportData(
    userId: string,
    workspaceId: string,
    filters: ReportFilters,
  ): Promise<ResolvedReportData> {
    const workspace = await this.ensureWorkspaceAccess(userId, workspaceId);
    const range = resolveReportRange(filters, workspace.timezone);
    const [summary, categories, accounts, points] = await Promise.all([
      this.repository.getSummaryTotals(
        workspace.id,
        workspace.reportingCurrency,
        range.from,
        range.to,
      ),
      this.repository.getCategoryBreakdown(
        workspace.id,
        workspace.reportingCurrency,
        range.from,
        range.to,
      ),
      this.repository.getAccountBreakdown(
        workspace.id,
        workspace.reportingCurrency,
        range.from,
        range.to,
      ),
      this.repository.getCashFlow(workspace.id, workspace.reportingCurrency, range.from, range.to),
    ]);

    return {
      accounts,
      categories,
      currency: workspace.reportingCurrency,
      period: range,
      points,
      summary,
    };
  }

  async getSummary(userId: string, workspaceId: string, filters: ReportFilters) {
    const { accounts, categories, currency, period, summary } = await this.resolveReportData(
      userId,
      workspaceId,
      filters,
    );

    return {
      currency,
      period,
      spendingByAccount: accounts,
      spendingByCategory: categories,
      totals: summary,
    };
  }

  async getCategories(userId: string, workspaceId: string, filters: ReportFilters) {
    const { accounts, categories, currency, period } = await this.resolveReportData(
      userId,
      workspaceId,
      filters,
    );

    return {
      accounts,
      categories,
      currency,
      period,
    };
  }

  async getCashFlow(userId: string, workspaceId: string, filters: ReportFilters) {
    const { currency, period, points } = await this.resolveReportData(userId, workspaceId, filters);

    return {
      currency,
      period,
      points,
    };
  }

  async createExport(userId: string, workspaceId: string, input: CreateReportExportBody) {
    const report = await this.resolveReportData(userId, workspaceId, input);
    const exportId = createId("rpt");
    const storageKey = buildExportStorageKey(input.reportType, exportId);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

    const generatedReport = await this.repository.createGeneratedReport(
      {
        expiresAt,
        id: exportId,
        parameters: {
          currency: report.currency,
          from: input.from,
          period: input.period,
          reportType: input.reportType,
          to: input.to,
        },
        requestedByUserId: userId,
        reportType: input.reportType,
        storageKey,
        workspaceId,
      },
      this.database,
    );

    return {
      ...generatedReport,
      downloadUrl: formatDownloadUrl(workspaceId, exportId),
    };
  }

  async getExport(userId: string, workspaceId: string, exportId: string) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    const generatedReport = await this.repository.findGeneratedReport(workspaceId, exportId);

    if (!generatedReport) {
      throw notFound();
    }

    return {
      ...generatedReport,
      downloadUrl: formatDownloadUrl(workspaceId, exportId),
    };
  }

  async downloadExport(userId: string, workspaceId: string, exportId: string) {
    await this.ensureWorkspaceAccess(userId, workspaceId);
    const generatedReport = await this.repository.findGeneratedReport(workspaceId, exportId);

    if (!generatedReport) {
      throw notFound();
    }

    const parameters = generatedReport.parameters as Partial<
      CreateReportExportBody & { currency: string }
    >;
    const reportType = generatedReport.reportType;
    const report = await this.resolveReportData(userId, workspaceId, {
      from: parameters.from,
      period: parameters.period,
      to: parameters.to,
    });

    return {
      csv: buildReportCsv(reportType, report),
      fileName: `nidhiflow-${reportFileSlug(reportType)}-${exportId}.csv`,
      mimeType: "text/csv; charset=utf-8",
    };
  }
}
