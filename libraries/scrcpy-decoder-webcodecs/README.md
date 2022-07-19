# @yume-chan/scrcpy-decoder-webcodecs

Decode and render video stream using the [WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API).

It has no dependencies and high performance, but are only available on recent versions of Chrome.

**WARNING:** The public API is UNSTABLE. If you have any questions, please open an issue.

- [Compatibility](#compatibility)
- [Usage](#usage)

## Compatibility

| Chrome | Firefox | Safari | Performance                     | Supported H.264 profile/level |
| ------ | ------- | ------ | ------------------------------- | ----------------------------- |
| 94     | No      | No     | High with hardware acceleration | High level 5                  |

## Usage

```ts
const decoder = new WebCodecsDecoder();
document.body.appendChild(decoder.element); // It draws frames onto `decoder.element`

videoPacketStream // from `@yume-chan/scrcpy`
    .pipeTo(decoder.writable)
    .catch(() => { });
```
