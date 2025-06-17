# Change Log - @yume-chan/android-bin

## 2.1.0

### Patch Changes

- Updated dependencies [40a60ca]
- Updated dependencies [a835eb8]
- Updated dependencies [dbcfd34]
    - @yume-chan/stream-extra@2.1.0
    - @yume-chan/adb@2.1.0

## 2.0.1

### Patch Changes

- Updated dependencies [0bcb9b8]
    - @yume-chan/struct@2.0.1
    - @yume-chan/adb@2.0.1
    - @yume-chan/stream-extra@2.0.1

## 2.0.0

### Major Changes

- Redesign subprocess API

### Minor Changes

- 0f29501: Add `PackageManager.prototype.getPackages` method to get apk paths

### Patch Changes

- Updated dependencies
- Updated dependencies [05c01ad]
- Updated dependencies [b79df96]
    - @yume-chan/adb@2.0.0
    - @yume-chan/struct@2.0.0
    - @yume-chan/stream-extra@2.0.0

## 1.1.0

### Patch Changes

- Updated dependencies [ab98953]
    - @yume-chan/adb@1.1.0

## 1.0.1

### Patch Changes

- 53688d3: Use PNPM workspace and Changesets to manage the monorepo.

    Because Changesets doesn't support alpha versions (`0.x.x`), this version is `1.0.0`. Future versions will follow SemVer rules, for example, breaking API changes will introduce a new major version.

- Updated dependencies [53688d3]
- Updated dependencies [db8466f]
- Updated dependencies [db8466f]
- Updated dependencies [ea5002b]
- Updated dependencies [db8466f]
    - @yume-chan/stream-extra@1.0.1
    - @yume-chan/struct@1.0.1
    - @yume-chan/adb@1.0.1

This log was last generated on Tue, 18 Jun 2024 02:49:43 GMT and should not be manually modified.

## 0.0.24

Tue, 18 Jun 2024 02:49:43 GMT

### Updates

- Allow streams to accept both `Uint8Array` and `Consumable<Uint8Array>` as inputs
- Add all supported fields to `DumpSys.Battery.Info`

## 0.0.23

Thu, 21 Mar 2024 03:15:10 GMT

### Updates

- Add support for pm install session

## 0.0.22

Wed, 13 Dec 2023 05:57:27 GMT

### Updates

- Add wrapper for `pm uninstall`
- Change `PackageManager#listPackages` to return an async generator
- Add wrapper for `am start`
- Add wrapper for `pm resolve-activity`
- Add `status` and `health` fields to `DumpSys#battery`

## 0.0.21

Fri, 25 Aug 2023 14:05:18 GMT

### Updates

- Add wrapper for `bu`
- Remove the last `\n` from `Settings#get`
- Add wrappers for `dumpsys diskstats` and `dumpsys battery`
- Add wrapper for `pm list packages`
- Rewrite `Settings` to use `Cmd` if available
- Add support to stop `bugreport`
- Merge `bugreport` and `bugreportz` wrappers, providing an `automatic` method to choose the best available bugreport method

## 0.0.20

Mon, 05 Jun 2023 02:51:41 GMT

_Version update only_

## 0.0.19

Sun, 09 Apr 2023 05:55:33 GMT

### Updates

- Add wrapper for `cmd`, with support for Android Binder Bridge (abb)
- Add `OverlayDisplay` wrapper for managing overlay displays

## 0.0.18

Wed, 25 Jan 2023 21:33:49 GMT

_Version update only_

## 0.0.17

Tue, 18 Oct 2022 09:32:30 GMT

### Updates

- Update to use new stream util package

## 0.0.16

Sat, 28 May 2022 03:56:37 GMT

### Updates

- Upgrade TypeScript to 4.7.2 to enable Node.js ESM
- Improve performance of `Logcat#binary()` by up to 150%

## 0.0.15

Mon, 02 May 2022 04:18:01 GMT

_Version update only_

## 0.0.14

Sat, 30 Apr 2022 14:05:48 GMT

_Version update only_

## 0.0.13

Thu, 28 Apr 2022 01:23:53 GMT

### Updates

- Add support for bugreport/bugreportz
- Add basic support for logcat

## 0.0.12

Sun, 03 Apr 2022 11:18:47 GMT

_Version update only_

## 0.0.11

Sun, 03 Apr 2022 10:54:15 GMT

### Updates

- Improve compatibility with Node.js 12 ESM format
