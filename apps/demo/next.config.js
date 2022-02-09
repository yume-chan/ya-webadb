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
    reactStrictMode: true,
    productionBrowserSourceMaps: true,
    experimental: {
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
