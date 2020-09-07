import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path from 'path';
import type webpack from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const context = path.resolve(process.cwd());

const plugins: webpack.Plugin[] = [
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
        filename: '[name].[contenthash].css',
        esModule: true,
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
): webpack.Configuration => ({
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
    },
    plugins,
    module: {
        rules: [
            { test: /\.js$/, enforce: 'pre', loader: ['source-map-loader'], },
            { test: /.css$/i, loader: [MiniCssExtractPlugin.loader, 'css-loader'] },
            { test: /.tsx?$/i, loader: 'ts-loader' },
        ],
    },
    optimization: {
        moduleIds: 'hashed',
        splitChunks: {
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendor',
                    chunks: 'all',
                },
            },
        },
    },
    devServer: {
        contentBase: path.resolve(context, 'lib'),
        port: 9000
    },
});

export = config;
