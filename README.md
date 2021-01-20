# Android Debug Bridge (ADB) for Web Browsers

[![GitHub license](https://img.shields.io/github/license/yume-chan/ya-webadb)](https://github.com/yume-chan/ya-webadb/blob/master/LICENSE)

Manipulate Android devices from any (supported) web browsers, even from another Android device.

Online demo: https://yume-chan.github.io/ya-webadb

## How does it work

**I'm working on a series of [blog posts](https://chensi.moe/blog/2020/09/28/webadb-part0-overview/) explaining the ADB protocol and my implementation in details.**

`@yume-chan/adb` contains a platform-independent TypeScript implementation of the Android Debug Bridge (ADB) protocol.

`@yume-chan/adb-backend-webusb` contains a backend for `@yume-chan/adb` that uses WebUSB API.

See README in each package for more implementation details.

## Packages

This repository is a monorepo containing following packages:

| Folder Name                                                          | Description                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| adb ([README](packages/adb/README.md))                               | TypeScript implementation of Android Debug Bridge (ADB) protocol.        |
| adb-backend-webusb ([README](packages/adb-backend-webusb/README.md)) | Backend for `@yume-chan/adb` using WebUSB API.                           |
| event                                                                | Event/EventEmitter pattern.                                              |
| struct ([README](packages/struct/README.md))                         | C-style structure serializer and deserializer.                           |
| webpack-config                                                       | Webpack configuration file in TypeScript, will output into `demo` folder |
| demo ([README](packages/demo/README.md))                             | Demo of `@yume-chan/adb` and `@yume-chan/adb-backend-webusb`.            |

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

* `npm run build`: build all npm packages.
* `npm run build:watch`: build and watch changes for all npm packages.
* `npm run start:demo`: start webpack-dev-server for the `demo` package.
* `npm run build:demo`: build the `demo` package.
