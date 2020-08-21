import path from 'path';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import webpack from 'webpack';

const context = path.resolve(process.cwd());

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
        publicPath: '/lib/',
        path: path.resolve(context, 'lib'),
        filename: '[name].js',
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].css',
            esModule: true,
        }),
    ],
    module: {
        rules: [
            { test: /.css$/i, loader: [MiniCssExtractPlugin.loader, 'css-loader'] },
            { test: /.tsx?$/i, loader: 'ts-loader' },
        ],
    },
    devServer: {
        publicPath: '/lib/',
        contentBase: path.resolve(context, 'www'),
        port: 9000
    },
});

export = config;
