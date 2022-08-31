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

1. Build all packages:

    ```sh
    $ rush build
    ```

2. Watch changes and rebuild in all libraries:

    ```sh
    $ rush build:watch
    ```

3. Start demo dev-server:

    ```sh
    $ cd apps/demo
    $ npm run dev
    ```

Usually you need two terminals to run both 2 and 3.

## FAQ

### 1. WebUSB and File downloading doesn't when developing/self-host?

WebUSB and Service Worker (which is used for file downloading) requires Secure Context (HTTPS or localhost).

If you access the development server using IP address, that will not work.

You can add a self issued SSL certificate, or add the URL to `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.
