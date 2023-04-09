# Change Log - @yume-chan/adb

This log was last generated on Sun, 09 Apr 2023 05:55:33 GMT and should not be manually modified.

## 0.0.19
Sun, 09 Apr 2023 05:55:33 GMT

### Updates

- Remove `Adb#install` in favor of `PackageManager#install` from `@yume-chan/android-bin` package
- Change `AdbSync#write` to take a `ReadableStream<Uint8Array>` instead of returning a `WritableStream<Uint8Array>`
- Add buffering in sync module to improve transfer speed
- Add `AdbReverseError` and `AdbReverseNotSupportedError` for better error handling in reverse tunnel command.

## 0.0.18
Wed, 25 Jan 2023 21:33:49 GMT

_Version update only_

## 0.0.17
Tue, 18 Oct 2022 09:32:30 GMT

### Updates

- Move stream utils to separate package

## 0.0.16
Sat, 28 May 2022 03:56:37 GMT

### Updates

- Upgrade TypeScript to 4.7.2 to enable Node.js ESM
- Upgrade web-streams-polyfill to 4.0.0-beta.3, fix an issue where `Adb#close()` doesn't release the connection.
- Fix an issue where `AdbSocket#readable#cancel()` stalls the connection.
- Improve performance of `BufferedStream` by up to 100%.

## 0.0.15
Mon, 02 May 2022 04:18:01 GMT

### Updates

- Add support for old protocol of `reverse:forward` command before Android 8
- Improve connection lifecycle handling
- Update `reverse.add` to accept any string local address
- Fix an issue where `reverse` commands doesn't parse error message correctly

## 0.0.14
Sat, 30 Apr 2022 14:05:48 GMT

### Updates

- Fix an issue where `subprocess.spawn` doesn't work on Android 6
- Add an `Adb#close()` method to gracefully shutdown a connection

## 0.0.13
Thu, 28 Apr 2022 01:23:53 GMT

### Updates

- Add support for raw shell mode
- Add support for LIS2 command in Sync protocol
- Add workaround for the push_mkdir issue in Android 9

## 0.0.12
Sun, 03 Apr 2022 11:18:47 GMT

_Version update only_

## 0.0.11
Sun, 03 Apr 2022 10:54:15 GMT

### Patches

- Update to use Web Streams API
- Improve compatibility with Node.js 12 ESM format

### Updates

- Add power related API
- Update compatibility matrix
- Update license year

## 0.0.10
Sun, 09 Jan 2022 15:52:20 GMT

### Updates

- Remove `encodeUtf8()` and `decodeUtf8()` from `AdbBackend`

## 0.0.9
Sun, 09 Jan 2022 15:50:20 GMT

_Initial release_

