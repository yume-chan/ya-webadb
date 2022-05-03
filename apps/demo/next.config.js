const withMDX = require('@next/mdx')({
    extension: /\.mdx?$/,
    options: {
        // Disable MDX createElement hack
        // because we don't need rendering custom elements
        renderer: `
            import React from 'react';
            const mdx = (name, props, ...children) => {
                if (name === 'inlineCode') { name = 'code'; }
                delete props?.parentName;
                return React.createElement(name, props, ...children);
            }
        `,
    },
});

/** @type {import('next').NextConfig} */
module.exports = withMDX({
    basePath: process.env.BASE_PATH || '',
    pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
    reactStrictMode: false,
    productionBrowserSourceMaps: true,
    experimental: {
        // Workaround https://github.com/vercel/next.js/issues/33914
        esmExternals: 'loose',
    },
    publicRuntimeConfig: {
        basePath: process.env.BASE_PATH || '',
    },
    webpack(config, options) {
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
            exclude: [
                /next/,
            ],
            use: ['source-map-loader'],
            enforce: 'pre',
        });

        config.experiments.topLevelAwait = true;

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
