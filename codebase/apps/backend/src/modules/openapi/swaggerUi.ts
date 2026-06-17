import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const swaggerUiDist = require("swagger-ui-dist") as { getAbsoluteFSPath: () => string };

export const swaggerUiAssetsPath = swaggerUiDist.getAbsoluteFSPath();

export function createSwaggerUiHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>NidhiFlow API Docs</title>
    <link rel="stylesheet" href="/api-docs/swagger-ui.css" />
    <link rel="stylesheet" href="/api-docs/index.css" />
    <link rel="icon" href="/api-docs/favicon-32x32.png" sizes="32x32" type="image/png" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/api-docs/swagger-ui-bundle.js"></script>
    <script src="/api-docs/swagger-ui-standalone-preset.js"></script>
    <script src="/api-docs/swagger-initializer.js"></script>
  </body>
</html>`;
}

export function createSwaggerInitializer() {
  return `window.onload = function () {
  window.ui = SwaggerUIBundle({
    url: "/api/v1/openapi.json",
    dom_id: "#swagger-ui",
    deepLinking: true,
    persistAuthorization: true,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    plugins: [SwaggerUIBundle.plugins.DownloadUrl],
    layout: "StandaloneLayout"
  });
};`;
}
