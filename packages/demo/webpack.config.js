"use strict";
var tslib_1 = require("tslib");
var clean_webpack_plugin_1 = require("clean-webpack-plugin");
var copy_webpack_plugin_1 = tslib_1.__importDefault(require("copy-webpack-plugin"));
var html_webpack_plugin_1 = tslib_1.__importDefault(require("html-webpack-plugin"));
var mini_css_extract_plugin_1 = tslib_1.__importDefault(require("mini-css-extract-plugin"));
var path_1 = tslib_1.__importDefault(require("path"));
var webpack_bundle_analyzer_1 = require("webpack-bundle-analyzer");
var context = path_1.default.resolve(process.cwd());
var plugins = [
    new clean_webpack_plugin_1.CleanWebpackPlugin(),
    new mini_css_extract_plugin_1.default({
        filename: '[name].[contenthash].css',
    }),
    new copy_webpack_plugin_1.default({
        patterns: [
            {
                context: path_1.default.dirname(require.resolve('streamsaver')),
                from: '(mitm.html|sw.js|LICENSE)',
                to: 'streamsaver'
            },
        ],
    }),
    new html_webpack_plugin_1.default({
        template: 'www/index.html',
        scriptLoading: 'defer',
    }),
];
if (process.env.ANALYZE) {
    plugins.push(new webpack_bundle_analyzer_1.BundleAnalyzerPlugin());
}
var config = function (env, argv) { return ({
    mode: 'development',
    devtool: argv.mode === 'production' ? 'source-map' : 'eval-source-map',
    context: context,
    target: 'web',
    entry: {
        index: './src/index.tsx',
    },
    output: {
        path: path_1.default.resolve(context, 'lib'),
        filename: '[name].[contenthash].js',
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
        fallback: { "path": require.resolve("path-browserify") },
    },
    plugins: plugins,
    module: {
        rules: [
            { test: /\.js$/, enforce: 'pre', use: ['source-map-loader'], },
            { test: /\.css$/i, use: [mini_css_extract_plugin_1.default.loader, 'css-loader'] },
            { test: /\.asset$/, use: { loader: "file-loader" } },
            { test: /\.tsx?$/i, loader: 'ts-loader', options: { projectReferences: true } },
        ],
    },
    devServer: {
        contentBase: path_1.default.resolve(context, 'lib'),
        port: 9000,
    },
}); };
module.exports = config;
