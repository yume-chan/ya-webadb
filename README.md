# Android Debug Bridge (ADB) for Web Browsers

Manipulate Android devices from any (supported) web browsers, even from another Android device.

Online demo: https://yume-chan.github.io/ya-webadb

## How does it work

`@yume-chan/adb` contains a platform-independent TypeScript implementation of the Android Debug Bridge (ADB) protocol.

`@yume-chan/adb-backend-web` contains a backend for `@yume-chan/adb` that uses Web technologies.

See README in each package for more implementation details.

## Packages

This repository is a monorepo containing following packages:

| Folder Name     | Package Name                 | Description                                                                                    |
| --------------- | ---------------------------- | ---------------------------------------------------------------------------------------------- |
| event           | `@yume-chan/event`           | Provides an EventEmitter pattern.                                                              |
| adb             | `@yume-chan/adb`             | A platform-independent implementation of the Android Debug Bridge (ADB) protocol in TypeScript |
| adb-backend-web | `@yume-chan/adb-backend-web` | Backend for `@yume-chan/adb` using Web technologies.                                           |
| webpack-config  | -                            | Webpack configuration file in TypeScript, will output into `demo` folder                       |
| demo            | -                            | A sample website demonstrating usage of `@yume-chan/adb` and `@yume-chan/adb-backend-web`      |

## Development

### Install dependencies

If you already have [lerna](https://lerna.js.org/) installed globally, run

```sh
npm run postinstall
```

Otherwise, run

```sh
npm install
```

will install lerna locally and bootstrap all packages.

### Scripts

* `npm run build`: build `@yume-chan/event`, `@yume-chan/adb` and `@yume-chan/adb-backend-web` packages.
* `npm run build:watch`: build and watch changes for `@yume-chan/event`, `@yume-chan/adb` and `@yume-chan/adb-backend-web` packages.
* `npm run start:demo`: start webpack-dev-server for the `demo` package.

* `npm run build:demo`: build the `demo` package.
