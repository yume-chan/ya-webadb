# Android Debug Bridge (ADB) for Web Browsers

[![GitHub license](https://img.shields.io/github/license/yume-chan/ya-webadb)](https://github.com/yume-chan/ya-webadb/blob/master/LICENSE)

Manipulate Android devices from any (supported) web browsers, even from another Android device.

Online demo: https://yume-chan.github.io/ya-webadb

## How does it work

**I'm working on a series of [blog posts](https://chensi.moe/blog/2020/09/28/webadb-part0-overview/) explaining the ADB protocol and my implementation in details.**

`@yume-chan/adb` is a platform-independent TypeScript implementation of the Android Debug Bridge (ADB) protocol.

`@yume-chan/adb-backend-webusb` is a backend for `@yume-chan/adb` that uses WebUSB API.

See README in each package for details.

## Packages

This repository is a monorepo containing following packages:

| Package Name                                                          | Description                                                       |
| --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| adb ([README](libraries/adb/README.md))                               | TypeScript implementation of Android Debug Bridge (ADB) protocol. |
| adb-backend-webusb ([README](libraries/adb-backend-webusb/README.md)) | Backend for `@yume-chan/adb` using WebUSB API.                    |
| event ([README](libraries/event/README.md))                           | Event/EventEmitter pattern.                                       |
| struct ([README](libraries/struct/README.md))                         | C-style structure serializer and deserializer.                    |
| demo ([README](apps/demo/README.md))                                  | Demo of `@yume-chan/adb` and `@yume-chan/adb-backend-webusb`.     |

## Development

The repository uses [Rush](https://rushjs.io/) for monorepo management.

### Install Rush globally

```sh
$ npm i -g @microsoft/rush
```

### Install dependencies

```sh
$ rush update
```

### Everyday commands

Build all packages:

```sh
$ rush build
```

Watch all libraries:

```sh
$ rush build:watch
```

Start demo dev-server:

```sh
$ cd apps/demo
$ npm start
```

Usually you need two terminals to run both 2 and 3.
