# @yume-chan/scrcpy

Decode and render video stream using TinyH264, the old Android H.264 software decoder (now deprecated and removed), compiled into WebAssembly, and wrapped in Web Worker to prevent blocking the main thread.

The video stream will be decoded into YUV frames, and converted to RGB using a WebGL shader, all on CPU. So it's slow and inefficient, but it works on most browsers.

**WARNING:** The public API is UNSTABLE. If you have any questions, please open an issue.

## Compatibility

| Chrome | Firefox | Safari | Performance | Supported H.264 profile/level |
| ------ | ------- | ------ | ----------- | ----------------------------- |
| 57     | 52      | 11     | Poor        | Baseline level 4              |

## Usage

The bundler you use must also support the `new Worker(new URL('./worker.js', import.meta.url))` syntax. It's known to work with Webpack 5.

It only supports Baseline level 4 codec, but many newer devices default to higher profile/levels. You can limit it by the `codecOptions` option.

```ts
new ScrcpyOptions1_24({
    codecOptions: new CodecOptions({
        profile: TinyH264Decoder.maxProfile,
        level: TinyH264Decoder.maxLevel,
    })
})
```

However, it will fail on some very old devices that doesn't support Baseline level 4 codec. You can retry without the `codecOptions` option.

```ts
const decoder = new TinyH264Decoder();
document.body.appendChild(decoder.element); // It draws frames onto `decoder.element`

videoPacketStream // from `@yume-chan/scrcpy`
    .pipeTo(decoder.writable)
    .catch(() => { });
```
