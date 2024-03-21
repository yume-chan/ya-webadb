# Change Log - @yume-chan/stream-extra

This log was last generated on Thu, 21 Mar 2024 03:15:10 GMT and should not be manually modified.

## 0.0.23
Thu, 21 Mar 2024 03:15:10 GMT

### Updates

- Fix `ConsumableWritableStream.write` calls `chunk.consume` twice. (doesn't cause any issue)
- Fix `WrapWritableStream` might close the inner stream twice. (and throw an error)
- Remove web-streams-polyfill dependency. The runtime must have global stream implementations (or you can add a polyfill yourself).

## 0.0.22
Wed, 13 Dec 2023 05:57:27 GMT

_Version update only_

## 0.0.21
Fri, 25 Aug 2023 14:05:18 GMT

### Updates

- Replace `GatherStringStream` with `ConcatStringStream` which can be treated as a Promise

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

