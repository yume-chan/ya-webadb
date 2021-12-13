const withMDX = require('@next/mdx')({
    extension: /\.mdx?$/,
    options: {
        // Disable MDX createElement hack
        // because we don't need rendering custom elements
        renderer: `
            import React from 'react';
            const mdx = (name, props, ...children) => {
                return React.createElement(name, props, ...children);
            }
        `,
    },
});

/** @type {import('next').NextConfig} */
module.exports = withMDX({
    basePath: process.env.BASE_PATH || '/',
    pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
    reactStrictMode: true,
    productionBrowserSourceMaps: true,
    webpack(config, options) {
        config.module.rules.push({
            resourceQuery: /url/,
            type: "asset/resource",
            generator: {
                filename: "static/chunks/[name].[hash][ext]",
            },
        });

        // https://github.com/vercel/next.js/issues/25484
        config.optimization.splitChunks = {
            chunks: "async",
            minSize: 20000,
            minRemainingSize: 0,
            minChunks: 1,
            maxAsyncRequests: 30,
            maxInitialRequests: 30,
            enforceSizeThreshold: 50000,
            cacheGroups: {
                defaultVendors: false,
                default: false,
                framework: {
                    chunks: "all",
                    name: "framework",
                    test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
                    priority: 40,
                    enforce: true,
                },
                commons: {
                    name: "commons",
                    chunks: "initial",
                    minChunks: 20,
                    priority: 20,
                },
            },
        };

        return config;
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin',
                    },
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'require-corp',
                    }
                ]
            }
        ]
    }
});
