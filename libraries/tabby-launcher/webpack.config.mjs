import { createRequire } from "node:module";
import * as path from "path";
import * as url from "url";
import webpack from "webpack";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";

const require = createRequire(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const bundleAnalyzer = new BundleAnalyzerPlugin({
    analyzerPort: 0,
});

/**
 * @type {webpack.Configuration}
 */
const config = {
    name: "tabby-web-entry",
    target: ["es2020", "web"],
    entry: path.resolve(__dirname, "src", "entry.ts"),
    mode: "production",
    optimization: {
        minimize: false,
    },
    context: __dirname,
    devtool: "source-map",
    output: {
        path: path.join(__dirname, "dist"),
        pathinfo: true,
        filename: "[name].js",
        clean: true,
    },
    resolve: {
        extensions: [".ts", ".js"],
        alias: {
            url: require.resolve("./browser/url.js"),
        },
        fallback: {
            assert: false,
            fs: false,
            http: false,
            https: false,
            net: false,
            readline: false,
            tls: false,

            os: require.resolve("./browser/os.js"),
            zlib: require.resolve("./browser/zlib.js"),

            console: require.resolve("console-browserify"),
            crypto: require.resolve("crypto-browserify"),
            "node-buffer": require.resolve("buffer/"),
            path: require.resolve("path-browserify"),
            querystring: require.resolve("querystring-es3"),
            stream: require.resolve("readable-stream"),
            "util/types": require.resolve("util/support/types"),
            util: require.resolve("util"),
        },
    },
    module: {
        rules: [
            {
                test: /.*\.m?js$/,
                enforce: "pre",
                use: ["source-map-loader"],
            },
            {
                test: /\.ts$/,
                use: {
                    loader: "ts-loader",
                    options: {
                        configFile: path.resolve(__dirname, "tsconfig.json"),
                    },
                },
            },
            {
                test: /\.scss$/,
                use: ["style-loader", "css-loader", "sass-loader"],
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader", "sass-loader"],
            },
            {
                test: /\.(png|svg|ttf|eot|otf|woff|woff2)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                type: "asset",
            },
        ],
    },
    externals: {
        "@yume-chan/adb": "commonjs @yume-chan/adb",
        "@yume-chan/async": "commonjs @yume-chan/async",
        "@yume-chan/stream-extra": "commonjs @yume-chan/stream-extra",
        comlink: "commonjs comlink",
    },
    plugins: [
        new webpack.ProvidePlugin({
            Buffer: [require.resolve("buffer/"), "Buffer"],
            process: require.resolve("./browser/process.js"),
            setImmediate: [
                require.resolve("./browser/setImmediate.js"),
                "setImmediate",
            ],
        }),
    ],
};

if (process.env.PLUGIN_BUNDLE_ANALYZER === "tabby-web-entry") {
    config.plugins.push(bundleAnalyzer);
    config.cache = false;
}

export default () => config;
