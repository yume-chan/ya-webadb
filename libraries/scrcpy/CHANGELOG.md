# Change Log - @yume-chan/scrcpy

## 2.3.0

### Minor Changes

- ec2ec23: Add client version 3.3.3

## 2.2.0

### Minor Changes

- f34724f: Add support for Scrcpy server version 3.3.2 (no protocol changes)

## 2.1.1

### Patch Changes

- 7edd616: Fix UHID output stream doesn't work from server version 2.6
- e0def5b: Add support for server version 3.3.1

## 2.1.0

### Patch Changes

- Updated dependencies [40a60ca]
    - @yume-chan/stream-extra@2.1.0

## 2.0.1

### Patch Changes

- Updated dependencies [0bcb9b8]
    - @yume-chan/struct@2.0.1
    - @yume-chan/stream-extra@2.0.1

## 2.0.0

### Major Changes

- fe06652: Move `version` parameter to `AdbScrcpyOptions`

### Minor Changes

- 02f5bd5: Add alias for all AdbScrcpyOptions versions

### Patch Changes

- Updated dependencies [b79df96]
- Updated dependencies
    - @yume-chan/struct@2.0.0
    - @yume-chan/no-data-view@2.0.0
    - @yume-chan/stream-extra@2.0.0

## 1.1.0

### Minor Changes

- 8c5b3c2: Add support for Scrcpy 3.1
- cb44b63: Move `version` info to option classes and provide default values

### Patch Changes

- 6140ebc: Accept raw (serialized) values for complex options
- 6140ebc: Add `ScrcpyCrop` class for the `crop` option
- 6140ebc: Add aliases for all Scrcpy patch versions
- 7f2a09c: Fix incorrect scroll controller in version 1.22 and later

## 1.0.1

### Patch Changes

- 53688d3: Use PNPM workspace and Changesets to manage the monorepo.

    Because Changesets doesn't support alpha versions (`0.x.x`), this version is `1.0.0`. Future versions will follow SemVer rules, for example, breaking API changes will introduce a new major version.

- db8466f: Rewrite the struct API completely
- ea5002b: Add support up to Scrcpy version 3.0
- db8466f: Improve tree-shaking by removing TypeScript enum and namespace
- Updated dependencies [53688d3]
- Updated dependencies [db8466f]
- Updated dependencies [ea5002b]
- Updated dependencies [db8466f]
    - @yume-chan/no-data-view@1.0.1
    - @yume-chan/stream-extra@1.0.1
    - @yume-chan/struct@1.0.1

This log was last generated on Tue, 18 Jun 2024 02:49:43 GMT and should not be manually modified.

## 0.0.24

Tue, 18 Jun 2024 02:49:43 GMT

### Updates

- Add AV1 metadata parser `Av1`
- Move clipboard stream to `ScrcpyOptions#clipboard`
- Make `ScrcpyControlMessageWriter#setClipboard` wait for the clipboard to be updated on device (when `sequence` is not 0)
- Add options class for version 2.3

## 0.0.23

Thu, 21 Mar 2024 03:15:10 GMT

### Updates

- Fix several ReDos vulnerabilities

## 0.0.22

Wed, 13 Dec 2023 05:57:27 GMT

### Updates

- Fix parsing `sps_max_dec_pic_buffering_minus1` in H.265 SPS
- Support parsing `vui_hrd_parameters` in H.265 SPS
- Add support for Scrcpy 2.2

## 0.0.21

Fri, 25 Aug 2023 14:05:18 GMT

### Updates

- Add support for Scrcpy server version 2.1 and 2.1.1
- Move the fetching server binary script to `@yume-chan/scrcpy-fetch-server` package

## 0.0.20

Mon, 05 Jun 2023 02:51:41 GMT

### Updates

- Add support for Scrcpy 2.0. New features including audio forwarding (supports PCM, AAC and OPUS encoding) and other video codecs (supports H.264 and H.265, AV1 not supported). Read the PR for new options and breaking changes. ([#495](https://github.com/yume-chan/ya-webadb/pull/495))
- Move ADB related code to `@yume-chan/adb-scrcpy` package. This package now only implements the Scrcpy protocol.

## 0.0.19

Sun, 09 Apr 2023 05:55:33 GMT

### Updates

- Change `AdbScrcpyClient#pushServer` to take a `ReadableStream<Uint8Array>` instead of returning a `WritableStream<Uint8Array>`
- Add `AdbReverseNotSupportedError` handling and automatically switch to forward tunnel in `AdbScrcpyClient`.
- Update `AndroidKeyCode` enum to align with Web `KeyboardEvent.code`

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
