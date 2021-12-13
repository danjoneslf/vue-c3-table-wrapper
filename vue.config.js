const { defineConfig } = require('@vue/cli-service')
const path = require('path')
const CopyWebpackPlugin = require("copy-webpack-plugin")

module.exports = defineConfig({
  transpileDependencies: true,
  /*
  chainWebpack: config => {
    const imgRule = config.module.rule('images')
    imgRule.uses.clear()
    imgRule
      .use("file-loader")
      .loader("file-loader")
      .options({
        limit: 10000,
        name: process.env.NODE_ENV === 'production' ? 'assets/images/[name]-[hash].[ext]' : 'assets/images/[name].[ext]'
      })
      .end();
  },
  */
  configureWebpack: {
    plugins: [
      new CopyWebpackPlugin({
        patterns:[
          {
            context: 'node_modules/govuk-frontend/govuk/assets/',
            from: '**/*',
            to: 'assets/'
          },
          {
            context: 'node_modules/govuk-frontend/govuk/assets/',
            from: '**/*',
            to: path.dirname(__filename) + '/src/assets/'
          },
          {
            context: 'node_modules/govuk-frontend/govuk/assets/',
            from: '**/*',
            to: path.dirname(__filename) + '/public/assets/'
          }
        ]
      })
    ]
  }
})
