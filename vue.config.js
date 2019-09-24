// const path = require("path");
// const CopyPlugin = require("copy-webpack-plugin");

const plugins = []
if(process.env.NODE_ENV === "production") {
  const BundleAnalyzerPlugin = require("webpack-bundle-analyzer")
  .BundleAnalyzerPlugin;
  plugins.push(new BundleAnalyzerPlugin())
}

const vtkRegex = /\b(vtk.js)/

//prettier-ignore
module.exports = {
  configureWebpack: {
    plugins,
  },
  chainWebpack: config => {
    config.externals([
      vtkRegex,
      {
        "cornerstone-core": {
          commonjs: "cornerstone-core",
          commonjs2: "cornerstone-core",
          amd: "cornerstone-core",
          root: "cornerstone"
        },
        "cornerstone-math": {
          commonjs: "cornerstone-math",
          commonjs2: "cornerstone-math",
          amd: "cornerstone-math",
          root: "cornerstoneMath"
        }
      }
    ]);
    // Shader Loader
    config.module
      .rule("shaderloader")
      .include.add(/vtk\.js[\/\\]Sources/).end()
      .test(/\.glsl$/)
      .use("shader-loader")
        .loader("shader-loader")
        .end();
    // Webworker loader
    config.module
      .rule("webworker")
      .include.add(/vtk\.js[\/\\]Sources/).end()
      .test(/\.worker\.js$/)
      .use("worker-loader")
        .loader("worker-loader")
        .options({
          inline: true,
          fallback: false,
        })
        .end();
  },
  css: { extract: false }
};
