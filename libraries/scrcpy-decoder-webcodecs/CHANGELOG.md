# Change Log - @yume-chan/scrcpy-decoder-webcodecs

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

