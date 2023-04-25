const withMDX = require("@next/mdx")({
    extension: /\.mdx?$/,
    options: {
        // Disable MDX createElement hack
        // because we don't need rendering custom elements
        jsx: true,
    },
});

const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
});

const basePath = process.env.BASE_PATH ?? "";

const withPwa = require("@yume-chan/next-pwa")({
    dest: "public",
});

function pipe(value, ...callbacks) {
    for (const callback of callbacks) {
        value = callback(value);
    }
    return value;
}

/** @type {import('next').NextConfig} */
module.exports = pipe(
    {
        basePath,
        pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
        reactStrictMode: false,
        productionBrowserSourceMaps: true,
        experimental: {
            // Workaround https://github.com/vercel/next.js/issues/33914
            esmExternals: "loose",
        },
        publicRuntimeConfig: {
            basePath,
        },
        webpack(config) {
            // Bundle Scrcpy Server
            config.module.rules.push({
                resourceQuery: /url/,
                type: "asset/resource",
                generator: {
                    filename: "static/chunks/[name].[hash][ext]",
                },
            });

            config.module.rules.push({
                test: /.*\.m?js$/,
                // disable these modules because they generate a lot of warnings about
                // non existing source maps
                // we cannot filter these warnings via config.stats.warningsFilter
                // because Next.js doesn't allow it
                // https://github.com/vercel/next.js/pull/7550#issuecomment-512861158
                // https://github.com/vercel/next.js/issues/12861
                exclude: [/next/],
                use: ["source-map-loader"],
                enforce: "pre",
            });

            return config;
        },
        // Enable Direct Sockets API
        async headers() {
            return [
                {
                    source: "/:path*",
                    headers: [
                        {
                            key: "Cross-Origin-Opener-Policy",
                            value: "same-origin",
                        },
                        {
                            key: "Cross-Origin-Embedder-Policy",
                            value: "credentialless",
                        },
                    ],
                },
            ];
        },
    },
    withBundleAnalyzer,
    withPwa,
    withMDX
);
