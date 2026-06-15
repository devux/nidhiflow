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
    response.statusCode = 404;
    response.end("Not found");
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
