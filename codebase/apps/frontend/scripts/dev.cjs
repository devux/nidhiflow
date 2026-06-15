const path = require("node:path");
const http = require("node:http");

const webpack = require("webpack");
const webpackDevMiddleware = require("webpack-dev-middleware");

const webpackConfig = require("../webpack.config.cjs");

const compiler = webpack({
  ...webpackConfig,
  mode: "development",
});
const middleware = webpackDevMiddleware(compiler, {
  publicPath: webpackConfig.output.publicPath,
  stats: "minimal",
});

const server = http.createServer((request, response) => {
  middleware(request, response, () => {
    middleware.waitUntilValid(() => {
      const indexPath = path.join(compiler.outputPath, "index.html");
      const indexHtml = middleware.context.outputFileSystem.readFileSync(indexPath);

      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(indexHtml);
    });
  });
});

server.listen(5173, "127.0.0.1", () => {
  console.log("Frontend available at http://127.0.0.1:5173");
});

function shutdown() {
  server.close(() => {
    void middleware.close(() => {
      process.exit();
    });
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
