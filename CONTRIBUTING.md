## Development

The repository uses [Rush](https://rushjs.io/) for monorepo management.

### Install Rush globally

```sh
$ npm i -g @microsoft/rush
```

### Get code

The build script only works inside a Git repository, so, always use `git` to clone this repository. "Download ZIP" option in GitHub code menu or source code tarball in GitHub releases will NOT work.

```sh
git clone https://github.com/yume-chan/ya-webadb.git
cd ya-webadb
```

### Install dependencies

```sh
$ rush install
```

### Everyday commands

-   Build all packages:

    ```sh
    $ rush build
    ```

-   Watch changes and rebuild in all libraries:

    ```sh
    $ rush build:watch
    ```

-   Start demo's dev-server:

    ```sh
    $ cd apps/demo
    $ npm run dev
    ```

Usually you need two terminals to run both 2 and 3 to test your changes.

## Deploy Demo

The demo is built with [Next.js](https://nextjs.org/), a full-stack React framework, which usually requires a Node.js environment to run.

However, since the demo doesn't have any server-side code, the most simple deployment method is to use the [Static HTML Export](https://nextjs.org/docs/advanced-features/static-html-export) feature of Next.js. It generates pre-rendered, fully static HTML files, that can be deployed to any static website hosting services (e.g. GitHub Pages).

To export static deployable HTML files, after running `rush build` command, run:

```sh
cd apps/demo
npx next export
```

This will create an `out` folder containing exported HTML files and all required resource files.

## Release new versions

```sh
rush version --bump
export NPM_AUTH_TOKEN=... // Copy NPM auth token from ~/.npmrc
rush publish -p --include-all --set-access-level public
```

## FAQ

### 1. WebUSB and File downloading doesn't work in development/self-host environment?

WebUSB and Service Worker (which is used for file downloading) requires Secure Context (HTTPS or localhost).

-   If you have a domain name, add a free SSL certificate from [Let's Encrypt](https://letsencrypt.org/).
-   If you are using IP address or can't get a free SSL certificate, either
    -   Add a self-issued SSL certificate and trust it on every device accessing it.
    -   Add the hostname to `chrome://flags/#unsafely-treat-insecure-origin-as-secure` on every device accessing it.
