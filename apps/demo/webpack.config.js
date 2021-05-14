"use strict";
const tslib_1 = require("tslib");
const clean_webpack_plugin_1 = require("clean-webpack-plugin");
const copy_webpack_plugin_1 = tslib_1.__importDefault(require("copy-webpack-plugin"));
const html_webpack_plugin_1 = tslib_1.__importDefault(require("html-webpack-plugin"));
const mini_css_extract_plugin_1 = tslib_1.__importDefault(require("mini-css-extract-plugin"));
const path_1 = tslib_1.__importDefault(require("path"));
const webpack_bundle_analyzer_1 = require("webpack-bundle-analyzer");
const webpackbar_1 = tslib_1.__importDefault(require("webpackbar"));
const context = path_1.default.resolve(process.cwd());
const plugins = [
    new webpackbar_1.default({}),
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
const config = (env, argv) => {
    if (argv.mode === 'production') {
        plugins.unshift(new clean_webpack_plugin_1.CleanWebpackPlugin());
    }
    return {
        mode: 'development',
        devtool: argv.mode === 'production' ? 'source-map' : 'eval-source-map',
        context,
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
            // @ts-expect-error typing is not up to date
            fallback: { "path": require.resolve("path-browserify") },
        },
        plugins,
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
    };
};
module.exports = config;
