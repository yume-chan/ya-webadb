const { description } = require('../../package')

module.exports = {
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#title
   */
  title: 'Unofficial ADB Book',
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#description
   */
  description: description,

  /**
   * Extra tags to be injected to the page HTML `<head>`
   *
   * ref：https://v1.vuepress.vuejs.org/config/#head
   */
  head: [
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ],

  /**
   * Theme configuration, here is the default theme configuration for VuePress.
   *
   * ref：https://v1.vuepress.vuejs.org/theme/default-theme-config.html
   */
  themeConfig: {
    repo: 'https://github.com/yume-chan/ya-webadb',
    editLinks: true,
    docsDir: 'apps/book',
    editLinkText: 'Edit this page',
    lastUpdated: true,
    nav: [
      {
        text: 'Basics',
        link: '/basics/',
      },
      {
        text: 'Commands',
        items: [
          {
            text: 'Shell',
            link: '/commands/shell.html',
          }
        ]
      }
    ],
    sidebar: {
      '/basics/': [
        {
          title: 'Basics',
          collapsable: false,
          children: [
            '',
            'transportation',
            'packet',
            'connection',
            'authentication',
          ]
        }
      ],
    }
  },

  /**
   * Apply plugins，ref：https://v1.vuepress.vuejs.org/zh/plugin/
   */
  plugins: [
    '@vuepress/plugin-back-to-top',
    '@vuepress/plugin-medium-zoom',
  ]
}
