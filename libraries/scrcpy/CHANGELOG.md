# Change Log - @yume-chan/scrcpy

This log was last generated on Wed, 25 Jan 2023 21:33:49 GMT and should not be manually modified.

## 0.0.18
Wed, 25 Jan 2023 21:33:49 GMT

### Updates

- Move `@yume-chan/adb` to `peerDependencies`
- Add support for Scrcpy server version 1.25
- Add support for `SetClipboard` control message and `AckClipboard` device message

## 0.0.17
Tue, 18 Oct 2022 09:32:30 GMT

### Updates

- Add standalone types for serializing/deserializing Scrcpy packets
- Separate decoders to own packages so they don't need optional peer dependencies.

## 0.0.16
Sat, 28 May 2022 03:56:37 GMT

### Updates

- Upgrade TypeScript to 4.7.2 to enable Node.js ESM
- Add support for more `CodecOptions` keys
- Add support for `CodecOptions` value types other than `int`

## 0.0.15
Mon, 02 May 2022 04:18:01 GMT

### Updates

- Add support for `rotateDevice` control message
- Add method to get screen list

## 0.0.14
Sat, 30 Apr 2022 14:05:48 GMT

### Updates

- Add support for Scrcpy server version 1.24

## 0.0.13
Thu, 28 Apr 2022 01:23:53 GMT

### Updates

- Add support for Scrcpy server version 1.23

## 0.0.12
Sun, 03 Apr 2022 11:18:47 GMT

_Version update only_

## 0.0.11
Sun, 03 Apr 2022 10:54:15 GMT

### Updates

- Add support for Scrcpy server version 1.22
- Update to use Web Streams API
- Improve compatibility with Node.js 12 ESM format
- Workaround a issue with server crash on Samsung ROM (https://github.com/Genymobile/scrcpy/issues/2841)
- Remove output parsing. It's output is for debugging only, not machine readable.
- Update license year

## 0.0.10
Sun, 09 Jan 2022 15:52:20 GMT

_Initial release_

