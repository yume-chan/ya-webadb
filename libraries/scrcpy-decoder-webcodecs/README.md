# @yume-chan/scrcpy-decoder-webcodecs

Decode and render H.264 streams using the [WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API).

It has no dependencies and high performance, but is only available on recent versions of Chrome.

**WARNING:** The public API is UNSTABLE. Open a GitHub discussion if you have any questions.

-   [Compatibility](#compatibility)
-   [Usage](#usage)

## Compatibility

| Chrome | Firefox | Safari | Performance                     | Supported H.264 profile/level |
| ------ | ------- | ------ | ------------------------------- | ----------------------------- |
| 94     | No      | No     | High with hardware acceleration | High level 5                  |

## Usage

It draws frames onto `decoder.renderer` (a `<canvas>` element), you can insert it anywhere you want to display the video.

```ts
const decoder = new WebCodecsDecoder();
document.body.appendChild(decoder.renderer);

videoPacketStream // from `@yume-chan/scrcpy`
    .pipeTo(decoder.writable)
    .catch(() => {});
```
