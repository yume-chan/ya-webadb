# @yume-chan/scrcpy

TypeScript implementation of [Scrcpy](https://github.com/Genymobile/scrcpy) client.

It uses the official Scrcpy server releases.

**WARNING:** The public API is UNSTABLE. If you have any questions, please open an issue.

## Download Server Binary

This package has a script `fetch-scrcpy-server` to help you download the official server binary.

The server binary is subject to [Apache License 2.0](https://github.com/Genymobile/scrcpy/blob/master/LICENSE).

Usage:

```
$ npx fetch-scrcpy-server <version>
```

For example:

```
$ npx fetch-scrcpy-server 1.21
```

You can also add it to the `postinstall` script of your `package.json` so it will run automatically when you do `npm install`:

```json
"scripts": {
    "postinstall": "fetch-scrcpy-server 1.21",
},
```

It will download the binary to `bin/scrcpy` and write the version string to `bin/version.js`. You can import the version string with

```js
import SCRCPY_SERVER_VERSION from '@yume-chan/scrcpy/bin/version';
```

And import the server binary with [file-loader](https://v4.webpack.js.org/loaders/file-loader/) (Webpack 4) or [Asset Modules](https://webpack.js.org/guides/asset-modules/) (Webpack 5).

## Option versions

Scrcpy server has no backward compatibility on options input format. Currently the following versions are supported:

| versions  | type                |
| --------- | ------------------- |
| 1.16~1.17 | `ScrcpyOptions1_16` |
| 1.18~1.20 | `ScrcpyOptions1_18` |
| 1.21      | `ScrcpyOptions1_21` |
| 1.22      | `ScrcpyOptions1_22` |
| 1.23      | `ScrcpyOptions1_23` |
| 1.24      | `ScrcpyOptions1_24` |

You must use the correct type according to the server version.

## Video stream

The data from `onVideoData` event is a raw H.264 stream. You can process it as you want, or use the following built-in decoders to render it in browsers:

* WebCodecs decoder: Uses the [WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API). The video stream will be decoded into `VideoFrame`s and drawn on a 2D canvas.
* TinyH264 decoder: TinyH264 compiles the old Android H.264 software decoder (now deprecated and removed) into WebAssembly, and wrap it in Web Worker to prevent blocking the main thread. The video stream will be decoded into YUV frames, then converted to RGB using a WebGL shader.

| Name              | Chrome | Firefox | Safari | Performance                     | Supported H.264 profile/level |
| ----------------- | ------ | ------- | ------ | ------------------------------- | ----------------------------- |
| WebCodecs decoder | 94     | No      | No     | High with Hardware acceleration | High level 5                  |
| TinyH264 decoder  | 57     | 52      | 11     | Poor                            | Baseline level 4              |

TinyH264 decoder needs some extra setup:

1. `tinyh264`, `yuv-buffer` and `yuv-canvas` packages are peer dependencies. You must install them separately.
2. The bundler you use must support the `new Worker(new URL('./worker.js', import.meta.url))` syntax. It's known to work with Webpack 5.

Example usage:

```ts
const client = new ScrcpyClient(adb);
const decoder = new WebCodecsDecoder(); // Or `new TinyH264Decoder()`
client.onSizeChanged(size => decoder.setSize(size));
client.onVideoData(data => decoder.feed(data));
client.start(serverPath, serverVersion, new ScrcpyOptionsX_XX({
    ...options,
    codecOptions: new CodecOptions({
        profile: decoder.maxProfile,
        level: decoder.maxLevel,
    }),
}));
document.body.appendChild(decoder.element);
```
