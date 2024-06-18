# Change Log - @yume-chan/adb-scrcpy

This log was last generated on Tue, 18 Jun 2024 02:49:43 GMT and should not be manually modified.

## 0.0.24
Tue, 18 Jun 2024 02:49:43 GMT

### Updates

- Rename `AdbScrcpyClient#controlMessageWriter` to `controller`
- Remove `AdbScrcpyClient#deviceMessageStream`. Use `ScrcpyOptions#clipboard` to watch clipboard changes.
- Allow `AdbScrcpyClient#pushServer` to accept `ReadableStream<Uint8Array>` as input
- Add AV1 video size parsing support
- Loosen type parameter constraints on `AdbScrcpyOptionsX_XX` classes, allow them to accept more option types

## 0.0.23
Thu, 21 Mar 2024 03:15:10 GMT

_Version update only_

## 0.0.22
Wed, 13 Dec 2023 05:57:27 GMT

_Version update only_

## 0.0.21
Fri, 25 Aug 2023 14:05:18 GMT

### Updates

- Add support for Scrcpy server version 2.1 and 2.1.1

## 0.0.20
Mon, 05 Jun 2023 02:51:41 GMT

_Initial release_

