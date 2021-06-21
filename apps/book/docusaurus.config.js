/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
    title: 'Unofficial ADB Book',
    tagline: 'Deep-dive into ADB',
    url: 'https://yume-chan.github.io',
    baseUrl: '/ya-webadb/book/',
    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',
    favicon: 'img/favicon.ico',
    organizationName: 'yume-chan',
    projectName: 'ya-webadb', // Usually your repo name.
    themeConfig: {
        navbar: {
            title: 'Unofficial ADB Book',
            logo: {
                alt: 'Site Logo',
                src: 'img/logo.svg',
            },
            items: [
                {
                    type: 'doc',
                    docId: 'basics/intro',
                    position: 'left',
                    label: 'Basics',
                },
                {
                    type: 'doc',
                    docId: 'commands/shell',
                    position: 'left',
                    label: 'Commands',
                },
                {
                    href: 'https://github.com/yume-chan/ya-webadb',
                    label: 'GitHub',
                    position: 'right',
                },
            ],
        },
        footer: {
            style: 'dark',
            links: [],
            copyright: `Copyright © ${new Date().getFullYear()} Simon Chan. Built with Docusaurus.`,
        },
    },
    presets: [
        [
            '@docusaurus/preset-classic',
            {
                docs: {
                    sidebarPath: require.resolve('./sidebars.js'),
                    routeBasePath: '/',
                    // Please change this to your repo.
                    editUrl:
                        'https://github.com/yume-chan/ya-webadb/edit/main/apps/book/',
                    remarkPlugins: [require('./scripts/plantuml')],
                },
                theme: {
                    customCss: require.resolve('./src/css/custom.css'),
                },
            },
        ],
    ],
};
