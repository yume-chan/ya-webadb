# Change Log - @yume-chan/stream-extra

This log was last generated on Mon, 05 Jun 2023 02:51:41 GMT and should not be manually modified.

## 0.0.20
Mon, 05 Jun 2023 02:51:41 GMT

### Updates

- Fix a bug where `BufferedReadableStream#release` might output duplicate data.
- Use ECMAScript private class fields syntax (supported by Chrome 74, Firefox 90, Safari 14.1 and Node.js 12.0.0).

## 0.0.19
Sun, 09 Apr 2023 05:55:33 GMT

### Updates

- Add an option to combine small chunks into target size in `ChunkStream`, and rename it to `DistributionStream`

## 0.0.18
Wed, 25 Jan 2023 21:33:49 GMT

### Updates

- Change to load native Web Streams API implementation from `globalThis` if available

## 0.0.17
Tue, 18 Oct 2022 09:32:30 GMT

_Initial release_

