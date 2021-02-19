import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path from 'path';
import webpack from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import WebpackBar from 'webpackbar';

const context = path.resolve(process.cwd());

const plugins: webpack.Plugin[] = [
    new WebpackBar({}),
    new MiniCssExtractPlugin({
        filename: '[name].[contenthash].css',
    }),
    new CopyPlugin({
        patterns: [
            {
                context: path.dirname(require.resolve('streamsaver')),
                from: '(mitm.html|sw.js|LICENSE)',
                to: 'streamsaver'
            },
        ],
    }),
    new HtmlWebpackPlugin({
        template: 'www/index.html',
        scriptLoading: 'defer',
    }),
];

if (process.env.ANALYZE) {
    plugins.push(new BundleAnalyzerPlugin());
}

const config: webpack.ConfigurationFactory = (
    env: unknown,
    argv: webpack.CliConfigOptions
): webpack.Configuration => {
    if (argv.mode === 'production') {
        plugins.unshift(new CleanWebpackPlugin());
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
            path: path.resolve(context, 'lib'),
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
                { test: /\.css$/i, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
                { test: /\.asset$/, use: { loader: "file-loader" } },
                { test: /\.tsx?$/i, loader: 'ts-loader', options: { projectReferences: true } },
            ],
        },
        devServer: {
            contentBase: path.resolve(context, 'lib'),
            port: 9000,
        },
    };
};

export = config;
