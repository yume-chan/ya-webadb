## Development

The repository uses [PNPM](https://pnpm.io/) for monorepo management.

### Install PNPM globally

```sh
$ npm i -g pnpm
```

### Get code

```sh
git clone https://github.com/yume-chan/ya-webadb.git
cd ya-webadb
```

### Install dependencies

```sh
$ pnpm install
```

### Build all packages

```sh
$ pnpm build
```

### Run all tests

Tests are written using Node.js built-in test runner. Node.js v20.16.0 and later might have a bug reporting code coverage: https://github.com/nodejs/node/issues/54240

```sh
$ pnpm test
```

### Run ESLint and Prettier

```sh
$ pnpm lint
```

## Update dependencies

```sh
$ pnpm recursive update --latest --interactive
$ pnpm dedupe
```

Renovate is also enabled, but since it doesn't update `package.json` files, it's recommended to run the above commands manually.

Run `pnpm build` and `pnpm test` to make sure everything works after updating dependencies.

## Creating Pull Requests

When creating a pull request, use `changeset` command to add a new changelog:

```sh
$ pnpm changeset
```

Then follow the instructions to select changed packages and write a summary of the changes.

## Release new versions

NPM packages are released using GitHub Actions. Create a new tag and push it to the repository to trigger the release workflow.

```sh
pnpm changeset version
git add -A
git commit -m "chore: release new version"
git push
git tag vX.Y.Z
git push --tags
```

## FAQ

### 1. WebUSB and File downloading doesn't work in development/self-host environment?

WebUSB and Service Worker (which is used for file downloading) requires Secure Context (HTTPS or localhost).

-   If you have a domain name, add a free SSL certificate from [Let's Encrypt](https://letsencrypt.org/).
-   If you are using IP address or can't get a free SSL certificate, either
    -   Add a self-issued SSL certificate and trust it on every device accessing it.
    -   Add the hostname to `chrome://flags/#unsafely-treat-insecure-origin-as-secure` on every device accessing it.
