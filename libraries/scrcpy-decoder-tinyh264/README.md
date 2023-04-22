# @yume-chan/scrcpy-decoder-tinyh264

Decode and render H.264 streams using TinyH264, the old Android H.264 software decoder (now deprecated and removed), compiled into WebAssembly, and wrapped in Web Worker to prevent blocking the main thread.

The video stream will be decoded into YUV frames on CPU, then converted to RGB using a WebGL shader (using GPU). It's slow, but works on most browsers.

**WARNING:** The public API is UNSTABLE. Open a GitHub discussion if you have any questions.

## Compatibility

| Chrome | Firefox | Safari | Performance | Supported H.264 profile/level |
| ------ | ------- | ------ | ----------- | ----------------------------- |
| 57     | 52      | 11     | Poor        | Baseline level 4              |

## Usage

The bundler you use must support the `new Worker(new URL('./worker.js', import.meta.url))` syntax. It's known that Webpack 5 works.

### Limit profile/level

Because it only supports Baseline level 4 codec, but many newer devices default to higher profiles/levels, you can limit it by using the `codecOptions` option:

```ts
new ScrcpyOptions1_24({
    codecOptions: new CodecOptions({
        profile: TinyH264Decoder.maxProfile,
        level: TinyH264Decoder.maxLevel,
    }),
});
```

However, it can fail on some very old devices that doesn't support even Baseline level 4 codec. You can retry without the `codecOptions` option if that happens.

### Render the video

It draws frames onto `decoder.renderer` (a `<canvas>` element), you can insert it anywhere you want to display the video.

```ts
const decoder = new TinyH264Decoder();
document.body.appendChild(decoder.renderer);

videoPacketStream // from `@yume-chan/scrcpy`
    .pipeTo(decoder.writable)
    .catch(() => {});
```
