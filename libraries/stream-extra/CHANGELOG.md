# Change Log - @yume-chan/stream-extra

## 2.1.0

### Minor Changes

- 40a60ca: Add `Consumable.WrapByteReadableStream` and `MaybeConsumable.WrapWritableStream`

## 2.0.1

### Patch Changes

- Updated dependencies [0bcb9b8]
    - @yume-chan/struct@2.0.1

## 2.0.0

### Patch Changes

- Updated dependencies [b79df96]
    - @yume-chan/struct@2.0.0

## 1.0.1

### Patch Changes

- 53688d3: Use PNPM workspace and Changesets to manage the monorepo.

    Because Changesets doesn't support alpha versions (`0.x.x`), this version is `1.0.0`. Future versions will follow SemVer rules, for example, breaking API changes will introduce a new major version.

- ea5002b: Polyfill `ReadableStream.from` and `ReadableStream.prototype.values`
- Updated dependencies [53688d3]
- Updated dependencies [db8466f]
- Updated dependencies [db8466f]
    - @yume-chan/struct@1.0.1

This log was last generated on Tue, 18 Jun 2024 02:49:43 GMT and should not be manually modified.

## 0.0.24

Tue, 18 Jun 2024 02:49:43 GMT

### Updates

- Add `MaybeConsumable` type. It's also a namespace containing related types.
- Re-export global `TextDecoderStream` to replace `DecodeUtf8Stream` which doesn't work correctly in stream mode
- Move `Consumable` related types to the `Consumable` namespace. In future, more types will be moved to namespaces.

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
