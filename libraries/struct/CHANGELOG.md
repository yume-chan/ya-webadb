# Change Log - @yume-chan/struct

This log was last generated on Sun, 09 Apr 2023 05:55:33 GMT and should not be manually modified.

## 0.0.19
Sun, 09 Apr 2023 05:55:33 GMT

_Version update only_

## 0.0.18
Wed, 25 Jan 2023 21:33:49 GMT

### Updates

- Refactor number types for easier extending (see `ScrcpyFloatToInt16FieldDefinition` for an example)

## 0.0.17
Tue, 18 Oct 2022 09:32:30 GMT

_Version update only_

## 0.0.16
Sat, 28 May 2022 03:56:37 GMT

### Updates

- Add support for custom TypeScript type for `uint8Array`
- Upgrade TypeScript to 4.7.2 to enable Node.js ESM
- Improve performance of `Struct#deserialize()` by up to 200%.
- Remove `SyncBird`, it's replaced by `SyncPromise`, which is based on native Promise and is 200% faster.

## 0.0.15
Mon, 02 May 2022 04:18:01 GMT

_Version update only_

## 0.0.14
Sat, 30 Apr 2022 14:05:48 GMT

_Version update only_

## 0.0.13
Thu, 28 Apr 2022 01:23:53 GMT

### Updates

- Fix an issue that `uint64` still deserialize to negative numbers
- Fix an issue where `Syncbird` can't synchronously invoke `then` on some Bluebird internal methods (for example `reduce`)

## 0.0.12
Sun, 03 Apr 2022 11:18:47 GMT

_Version update only_

## 0.0.11
Sun, 03 Apr 2022 11:18:11 GMT

### Updates

- Update to use Web Streams API
- Improve compatibility with Node.js 12 ESM format
- Update compatibility matrix
- Update license year

## 0.0.10
Sun, 09 Jan 2022 15:52:20 GMT

### Updates

- Add synchronized deserialize support

## 0.0.9
Sun, 09 Jan 2022 15:50:20 GMT

_Initial release_

