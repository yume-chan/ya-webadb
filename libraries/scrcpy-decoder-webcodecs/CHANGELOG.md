# Change Log - @yume-chan/scrcpy-decoder-webcodecs

## 2.5.0

### Minor Changes

- 5ec8923: Expose `VideoDecoder.prototype.configure`'s `hardwareAcceleration` option

## 2.1.0

### Patch Changes

- Updated dependencies [40a60ca]
    - @yume-chan/stream-extra@2.1.0
    - @yume-chan/scrcpy@2.1.0
    - @yume-chan/scrcpy-decoder-tinyh264@2.1.0

## 2.0.1

### Patch Changes

- @yume-chan/scrcpy@2.0.1
- @yume-chan/stream-extra@2.0.1
- @yume-chan/scrcpy-decoder-tinyh264@2.0.1

## 2.0.0

### Patch Changes

- Updated dependencies [fe06652]
- Updated dependencies [05c01ad]
- Updated dependencies [02f5bd5]
- Updated dependencies
    - @yume-chan/scrcpy@2.0.0
    - @yume-chan/event@2.0.0
    - @yume-chan/no-data-view@2.0.0
    - @yume-chan/scrcpy-decoder-tinyh264@2.0.0
    - @yume-chan/stream-extra@2.0.0

## 1.1.0

### Minor Changes

- fba7533: Rename `XXXWebCodecsDecoderRenderer` to `XXXVideoFrameRenderer`

### Patch Changes

- Updated dependencies [6140ebc]
- Updated dependencies [6140ebc]
- Updated dependencies [6140ebc]
- Updated dependencies [8c5b3c2]
- Updated dependencies [7f2a09c]
- Updated dependencies [cb44b63]
    - @yume-chan/scrcpy@1.1.0
    - @yume-chan/scrcpy-decoder-tinyh264@1.1.0

## 1.0.1

### Patch Changes

- 53688d3: Use PNPM workspace and Changesets to manage the monorepo.

    Because Changesets doesn't support alpha versions (`0.x.x`), this version is `1.0.0`. Future versions will follow SemVer rules, for example, breaking API changes will introduce a new major version.

- db8466f: Fix H.265 rendering in Microsoft Edge
- 8e4c1ef: Add a renderer based on Insertable Stream API
- db8466f: Add a `snapshot` method to convert the last rendered frame into PNG
- Updated dependencies [53688d3]
- Updated dependencies [db8466f]
- Updated dependencies [db8466f]
- Updated dependencies [ea5002b]
- Updated dependencies [ea5002b]
- Updated dependencies [db8466f]
    - @yume-chan/scrcpy-decoder-tinyh264@1.0.1
    - @yume-chan/no-data-view@1.0.1
    - @yume-chan/stream-extra@1.0.1
    - @yume-chan/scrcpy@1.0.1
    - @yume-chan/event@1.0.1

This log was last generated on Tue, 18 Jun 2024 02:49:43 GMT and should not be manually modified.

## 0.0.24

Tue, 18 Jun 2024 02:49:43 GMT

### Updates

- Support decoding AV1
- Add `enableCapture` option to `WebCodecsVideoDecoder` which allows `renderer.readPixels` and `renderer.toDataURL` to work. The performance will be slightly affected when enabled.

## 0.0.23

Thu, 21 Mar 2024 03:15:10 GMT

### Updates

- Add `sizeChanged` event
- Add WebGL and Bitmap based video renderers, which are 1.5 to 3 times faster on Android devices

## 0.0.22

Wed, 13 Dec 2023 05:57:27 GMT

_Version update only_

## 0.0.21

Fri, 25 Aug 2023 14:05:18 GMT

_Version update only_

## 0.0.20

Mon, 05 Jun 2023 02:51:41 GMT

### Updates

- Add support for decoding H.265 on supported browsers (Chrome works, Microsoft Edge with HEVC Video Extension from Microsoft Store doesn't decode H.265 correctly).

## 0.0.19

Sun, 09 Apr 2023 05:55:33 GMT

_Version update only_

## 0.0.18

Wed, 25 Jan 2023 21:33:49 GMT

### Updates

- Change to not use vertical sync to minimize latency

## 0.0.17

Tue, 18 Oct 2022 09:32:30 GMT

### Updates

- Separated from `@yume-chan/scrcpy` for simpler dependency management.
