"use strict";
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const mini_css_extract_plugin_1 = tslib_1.__importDefault(require("mini-css-extract-plugin"));
const context = path_1.default.resolve(process.cwd());
const config = (env, argv) => ({
    mode: 'development',
    devtool: argv.mode === 'production' ? 'source-map' : 'eval-source-map',
    context,
    target: 'web',
    entry: {
        index: './src/index.tsx',
    },
    output: {
        publicPath: '/lib/',
        path: path_1.default.resolve(context, 'lib'),
        filename: '[name].js',
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
    },
    plugins: [
        new mini_css_extract_plugin_1.default({
            filename: '[name].css',
            esModule: true,
        }),
    ],
    module: {
        rules: [
            { test: /\.js$/, enforce: 'pre', loader: ['source-map-loader'], },
            { test: /.css$/i, loader: [mini_css_extract_plugin_1.default.loader, 'css-loader'] },
            { test: /.tsx?$/i, loader: 'ts-loader' },
        ],
    },
    devServer: {
        publicPath: '/lib/',
        contentBase: path_1.default.resolve(context, 'www'),
        port: 9000
    },
});
module.exports = config;
