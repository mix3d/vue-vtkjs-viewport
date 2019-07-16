const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

//prettier-ignore
module.exports = {
  chainWebpack: config => {
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
    config.plugin('clean')
    .use(CopyPlugin,[ [
        {
          from: path.join(__dirname, 'node_modules', 'itk', 'WebWorkers'),
          to: path.join(__dirname, 'dist', 'itk', 'WebWorkers'),
        },
        {
          from: path.join(__dirname, 'node_modules', 'itk', 'ImageIOs'),
          to: path.join(__dirname, 'dist', 'itk', 'ImageIOs'),
        },
        {
          from: path.join(__dirname, 'node_modules', 'itk', 'MeshIOs'),
          to: path.join(__dirname, 'dist', 'itk', 'MeshIOs'),
        },
    ]]);
  }
};
