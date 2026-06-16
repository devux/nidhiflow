import { Router } from "express";

import { openApiDocument } from "./openapiDocument.js";

export function createOpenApiRouter() {
  const router = Router();

  router.get("/", (_request, response) => {
    response.status(200).json(openApiDocument);
  });

  return router;
}
