import { Router } from "express";

import type { Environment } from "../../app/config/environment.js";
import { requireAuth } from "../../app/middleware/authenticate.js";
import { validate } from "../../app/middleware/validate.js";
import type { Database } from "../../shared/database/database.js";
import { ReportController } from "./report.controller.js";
import { ReportService } from "./report.service.js";
import {
  createReportExportBodySchema,
  reportExportIdSchema,
  reportFiltersSchema,
  workspaceIdSchema,
} from "./report.schemas.js";

const reportParamsSchema = workspaceIdSchema.merge(reportExportIdSchema);

export function createReportsRouter({
  database,
  environment,
}: {
  database: Database;
  environment: Environment;
}) {
  const router = Router({ mergeParams: true });
  const controller = new ReportController(new ReportService(database));

  router.use(requireAuth({ database, environment }));
  router.get(
    "/summary",
    validate({ params: workspaceIdSchema, query: reportFiltersSchema }),
    controller.getSummary,
  );
  router.get(
    "/categories",
    validate({ params: workspaceIdSchema, query: reportFiltersSchema }),
    controller.getCategories,
  );
  router.get(
    "/cash-flow",
    validate({ params: workspaceIdSchema, query: reportFiltersSchema }),
    controller.getCashFlow,
  );
  router.post(
    "/exports",
    validate({ params: workspaceIdSchema, body: createReportExportBodySchema }),
    controller.createExport,
  );
  router.get("/exports/:exportId", validate({ params: reportParamsSchema }), controller.getExport);
  router.get(
    "/exports/:exportId/download",
    validate({ params: reportParamsSchema }),
    controller.downloadExport,
  );

  return router;
}
