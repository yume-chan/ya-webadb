# Yet Another WebADB

Connect to your Android phones from any (supported) web browsers, even from another Android phone.

Try it online at https://yume-chan.github.io/ya-webadb

## How does it work

[WebUSB](https://wicg.github.io/webusb) API allow JavaScript to communicate with connected USB devices, including Android phones.

ADB uses a fairly simple protocol, so it's pretty easy to reimplement with JavaScript.

`adb shell`, the interactive shell, uses the PTY protocol, and [xterm.js](https://github.com/xtermjs/xterm.js/) can handle it very well.

## Packages

This repository is a monorepo containing following packages:

| Folder Name    | Package Name          | Description                  |
|----------------|-----------------------|------------------------------|
| event          | `@yume-chan/event`      | Provides an EventEmitter pattern. Ready to be published to npm |
| adb            | `@yume-chan/adb`        | Provides platform-independent ADB logic implemented in TypeScript, requires a [backend](#backend) to work. Ready to be published to npm |
| adb-webusb     | `@yume-chan/adb-webusb` | Provides a Web API powered backend for `@yume-chan/adb`. Ready to be published to npm |
| webpack-config | -                       | Webpack configuration file in TypeScript, will output into `demo` folder |
| demo           | -                       | A sample website demonstrating usage of `@yume-chan/adb` and `@yume-chan/adb-webusb` packages |

## Backend

`@yume-chan/adb` isn't tied to a specific transfer API. In fact it doesn't use any Web-only API, so with a proper backend it may also be able to run on Node.js or Electron.

A backend needs to provide these functions:

1. Data transferring. For example using the WebUSB API.
2. Private key storage and generation. For example using the LocalStorage and WebCrypto API.
3. UTF-8 string encoding and decoding. For example using the `TextEncoder` and `TextDecoder` API.

## Build

### Pre-requirements

First, install all dependencies:

```shell
npm i
```

or if you already have `lerna` installed, run

```shell
lerna bootstrap
```

### Build npm packages

To build `@yume-chan/event`, `@yume-chan/adb` and `@yume-chan/adb-webusb`, run

```shell
npm run build
```

Or you can `cd` into each folder and run

```shell
npm run build
```

All packages have TypeScript project references configured so building one package will automatically build dependency packages too.

### Watch npm packages

To watch changes and rebuild, run

```shell
npm run build:watch
```

### Run demo

Build or watch npm packages first, then run

```shell
npm run start:demo
```

to start the webpack dev server for the `demo` package.

Now navigate to `http://localhost:9000`.

#### Note

WebUSB API requires a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) (basically means HTTPS).

Chrome will treat `localhost` as secure, but if you want to access a dev server running on another machine, you need to add the domain to excepts:

1. Open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Add the protocol and domain part of your url (e.g. `http://192.168.0.100:9000`) to the input box
3. Choose `Enable` from the dropdown menu
4. Restart your browser

## Useful links

* [ADB protocol overview](https://github.com/aosp-mirror/platform_system_core/blob/master/adb/OVERVIEW.TXT)
* [ADB commands](https://github.com/aosp-mirror/platform_system_core/blob/d7c1bc73dc5b4e43b8288d43052a8b8890c4bf5a/adb/SERVICES.TXT#L145)
