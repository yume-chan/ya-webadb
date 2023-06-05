# Change Log - @yume-chan/adb-daemon-webusb

This log was last generated on Mon, 05 Jun 2023 02:51:41 GMT and should not be manually modified.

## 0.0.20
Mon, 05 Jun 2023 02:51:41 GMT

### Updates

- Use ECMAScript private class fields syntax (supported by Chrome 74, Firefox 90, Safari 14.1 and Node.js 12.0.0).
- Rename package to `@yume-chan/adb-daemon-webusb` following the renaming of `AdbDaemonTransport`.
- Rename `AdbWebUsbBackend` to `AdbDaemonWebUsbDevice` following the renaming of `AdbDaemonTransport`.
- Add Support for detecting device disconnects. It no longer throws an `NetworkError` when the device is disconnected.
- Add `filters` parameter to `AdbDaemonWebUsbDeviceManager#getDevices`. The filtration is manually implemented because WebUSB's `getDevice` API doesn't support filters.

## 0.0.19
Sun, 09 Apr 2023 05:55:33 GMT

### Updates

- Remove stream queuing
- Add the `AdbWebUsbBackendManager` class to simplify the usage with custom WebUSB implementations (for example the `usb` NPM package).

## 0.0.18
Wed, 25 Jan 2023 21:33:49 GMT

### Updates

- Add an option to specify USB filters

## 0.0.17
Tue, 18 Oct 2022 09:32:30 GMT

### Updates

- Update to use new stream util package

## 0.0.16
Sat, 28 May 2022 03:56:37 GMT

### Updates

- Upgrade TypeScript to 4.7.2 to enable Node.js ESM

## 0.0.15
Mon, 02 May 2022 04:18:01 GMT

### Updates

- Improve connection lifecycle handling

## 0.0.14
Sat, 30 Apr 2022 14:05:48 GMT

_Version update only_

## 0.0.13
Thu, 28 Apr 2022 01:23:53 GMT

### Updates

- Workaround an issue in Chrome where `transferIn` never returns `babble` on Windows

## 0.0.12
Sun, 03 Apr 2022 11:18:47 GMT

_Version update only_

## 0.0.11
Sun, 03 Apr 2022 10:54:15 GMT

### Updates

- Update to use Web Streams API
- Improve compatibility with Node.js 12 ESM format
- Update license year

## 0.0.10
Sun, 09 Jan 2022 15:52:20 GMT

### Updates

- Remove `encodeUtf8()` and `decodeUtf8()` from `AdbBackend`

## 0.0.9
Sun, 09 Jan 2022 15:50:20 GMT

_Initial release_

