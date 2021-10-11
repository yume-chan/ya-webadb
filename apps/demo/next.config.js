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
    }
});

/** @type {import('next').NextConfig} */
module.exports = withMDX({
    pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
    reactStrictMode: true,
    productionBrowserSourceMaps: true,
});
