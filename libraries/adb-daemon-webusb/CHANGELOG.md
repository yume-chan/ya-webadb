# Change Log - @yume-chan/adb-daemon-webusb

## 2.3.2

### Patch Changes

-   eb02e1a: Fix AdbDaemonWebUsbDeviceObserver doesn't fire events for newly added devices
-   Updated dependencies [8ba86f7]
    -   @yume-chan/struct@2.3.2

## 2.1.0

### Patch Changes

-   Updated dependencies [40a60ca]
-   Updated dependencies [a835eb8]
-   Updated dependencies [dbcfd34]
    -   @yume-chan/stream-extra@2.1.0
    -   @yume-chan/adb@2.1.0

## 2.0.1

### Patch Changes

-   Updated dependencies [0bcb9b8]
    -   @yume-chan/struct@2.0.1
    -   @yume-chan/adb@2.0.1
    -   @yume-chan/stream-extra@2.0.1

## 2.0.0

### Minor Changes

-   05c01ad: Make `DeviceObserver#onListChange` sticky

### Patch Changes

-   Updated dependencies
-   Updated dependencies [05c01ad]
-   Updated dependencies [b79df96]
    -   @yume-chan/adb@2.0.0
    -   @yume-chan/event@2.0.0
    -   @yume-chan/struct@2.0.0
    -   @yume-chan/stream-extra@2.0.0

## 1.1.0

### Patch Changes

-   Updated dependencies [ab98953]
    -   @yume-chan/adb@1.1.0

## 1.0.1

### Patch Changes

-   53688d3: Use PNPM workspace and Changesets to manage the monorepo.

    Because Changesets doesn't support alpha versions (`0.x.x`), this version is `1.0.0`. Future versions will follow SemVer rules, for example, breaking API changes will introduce a new major version.

-   c68e216: Accept exclusionFilters in getDevices and DeviceObserver
-   db8466f: Accept standard `USBDeviceFilter` type and fill in default interface filters automatically
-   db8466f: Throw `DeviceBusyError` when interface can't be claimed
-   Updated dependencies [53688d3]
-   Updated dependencies [db8466f]
-   Updated dependencies [db8466f]
-   Updated dependencies [ea5002b]
-   Updated dependencies [db8466f]
    -   @yume-chan/stream-extra@1.0.1
    -   @yume-chan/struct@1.0.1
    -   @yume-chan/event@1.0.1
    -   @yume-chan/adb@1.0.1

This log was last generated on Tue, 18 Jun 2024 02:49:43 GMT and should not be manually modified.

## 0.0.24

Tue, 18 Jun 2024 02:49:43 GMT

_Version update only_

## 0.0.23

Thu, 21 Mar 2024 03:15:10 GMT

### Updates

-   Fix `AdbDaemonWebUsbDeviceManager.getDevices` doesn't match auto-generated serial number against `filters.serialNumber` (if the device doesn't have a serial number)

## 0.0.22

Wed, 13 Dec 2023 05:57:27 GMT

### Updates

-   Check incoming packet size to prevent Chrome from crashing
-   Add `exclusionFilters` option to `AdbDaemonWebUsbDeviceManager#requestDevice` method
-   `AdbDaemonWebUsbDevice` will generate a fake serial number from vid and pid if the device serial number is empty

## 0.0.21

Fri, 25 Aug 2023 14:05:18 GMT

_Version update only_

## 0.0.20

Mon, 05 Jun 2023 02:51:41 GMT

### Updates

-   Use ECMAScript private class fields syntax (supported by Chrome 74, Firefox 90, Safari 14.1 and Node.js 12.0.0).
-   Rename package to `@yume-chan/adb-daemon-webusb` following the renaming of `AdbDaemonTransport`.
-   Rename `AdbWebUsbBackend` to `AdbDaemonWebUsbDevice` following the renaming of `AdbDaemonTransport`.
-   Add Support for detecting device disconnects. It no longer throws an `NetworkError` when the device is disconnected.
-   Add `filters` parameter to `AdbDaemonWebUsbDeviceManager#getDevices`. The filtration is manually implemented because WebUSB's `getDevice` API doesn't support filters.

## 0.0.19

Sun, 09 Apr 2023 05:55:33 GMT

### Updates

-   Remove stream queuing
-   Add the `AdbWebUsbBackendManager` class to simplify the usage with custom WebUSB implementations (for example the `usb` NPM package).

## 0.0.18

Wed, 25 Jan 2023 21:33:49 GMT

### Updates

-   Add an option to specify USB filters

## 0.0.17

Tue, 18 Oct 2022 09:32:30 GMT

### Updates

-   Update to use new stream util package

## 0.0.16

Sat, 28 May 2022 03:56:37 GMT

### Updates

-   Upgrade TypeScript to 4.7.2 to enable Node.js ESM

## 0.0.15

Mon, 02 May 2022 04:18:01 GMT

### Updates

-   Improve connection lifecycle handling

## 0.0.14

Sat, 30 Apr 2022 14:05:48 GMT

_Version update only_

## 0.0.13

Thu, 28 Apr 2022 01:23:53 GMT

### Updates

-   Workaround an issue in Chrome where `transferIn` never returns `babble` on Windows

## 0.0.12

Sun, 03 Apr 2022 11:18:47 GMT

_Version update only_

## 0.0.11

Sun, 03 Apr 2022 10:54:15 GMT

### Updates

-   Update to use Web Streams API
-   Improve compatibility with Node.js 12 ESM format
-   Update license year

## 0.0.10

Sun, 09 Jan 2022 15:52:20 GMT

### Updates

-   Remove `encodeUtf8()` and `decodeUtf8()` from `AdbBackend`

## 0.0.9

Sun, 09 Jan 2022 15:50:20 GMT

_Initial release_
