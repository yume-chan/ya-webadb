## Development

The repository uses [Rush](https://rushjs.io/) for monorepo management.

### Install Rush globally

```sh
$ npm i -g @microsoft/rush
```

### Get code

The build script only works inside Git repositories, so, always use `git` to clone this repository. "Download ZIP" option in GitHub code menu or source code tarball in GitHub releases will NOT work.

```sh
git clone https://github.com/yume-chan/ya-webadb.git
cd ya-webadb
```

### Install dependencies

```sh
$ rush update
```

### Everyday commands

* Build all packages:

    ```sh
    $ rush build
    ```

* Watch changes and rebuild in all libraries:

    ```sh
    $ rush build:watch
    ```

* Start demo's dev-server:

    ```sh
    $ cd apps/demo
    $ npm run dev
    ```

Usually you need two terminals to run both 2 and 3 for testing your changes.

## Deploy Demo

The demo is built with [Next.js](https://nextjs.org/), which is a full-stack React framework, usually requires a Node.js environment to run.

However, since the demo doesn't have any server-side code, the most simple deployment method is to use the [Static HTML Export](https://nextjs.org/docs/advanced-features/static-html-export) feature of Next.js, which generates pre-rendered, fully static HTML files, that can be deployed to any static website hosting services (e.g. GitHub Pages).

To export static deployable HTML files, after running `rush build` command, run:

```sh
cd apps/demo
npx next export
```

This creates an `out` folder, which contains the exported HTML files and all the resources.

## FAQ

### 1. WebUSB and File downloading doesn't when developing/self-host?

WebUSB and Service Worker (which is used for file downloading) requires Secure Context (HTTPS or localhost).

If you access the development server using IP address, that will not work.

You can add a self issued SSL certificate, or add the URL to `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.
