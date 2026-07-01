const path = require("node:path");

const dotenv = require("dotenv");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");

const frontendRoot = __dirname;
const codebaseRoot = path.resolve(frontendRoot, "../..");

dotenv.config({ path: path.join(codebaseRoot, ".env") });

const apiBaseUrl = process.env.NIDHIFLOW_API_BASE_URL;
const flowAiEnabled = process.env.FLOW_AI_ENABLED ?? "false";
const isCapacitorBuild = process.env.NIDHIFLOW_CAPACITOR_BUILD === "true";

if (!apiBaseUrl) {
  throw new Error("NIDHIFLOW_API_BASE_URL must be configured.");
}

module.exports = {
  entry: path.join(frontendRoot, "src/main.tsx"),
  output: {
    clean: true,
    filename: "assets/[name].[contenthash].js",
    path: path.join(frontendRoot, "dist"),
    publicPath: "/",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  module: {
    rules: [
      {
        exclude: /node_modules/,
        test: /\.[jt]sx?$/,
        use: "babel-loader",
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|jpe?g|webp|gif)$/i,
        type: "asset/resource",
        generator: {
          filename: "assets/images/[name].[contenthash][ext]",
        },
      },
    ],
  },
  plugins: [
    ...(!isCapacitorBuild
      ? [
          new CopyWebpackPlugin({
            patterns: [
              {
                from: path.join(frontendRoot, "public/downloads"),
                to: "downloads",
              },
            ],
          }),
        ]
      : []),
    new HtmlWebpackPlugin({
      template: path.join(frontendRoot, "public/index.html"),
    }),
    new webpack.DefinePlugin({
      "process.env.FLOW_AI_ENABLED": JSON.stringify(flowAiEnabled),
      "process.env.NIDHIFLOW_API_BASE_URL": JSON.stringify(apiBaseUrl),
    }),
  ],
  devtool: "source-map",
};
