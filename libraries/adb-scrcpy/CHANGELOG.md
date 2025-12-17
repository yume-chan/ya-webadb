# Change Log - @yume-chan/adb-scrcpy

## 2.3.2

### Patch Changes

-   build `app_process` command with Android 7 compatibility (#819)
-   Updated dependencies [8ba86f7]
    -   @yume-chan/struct@2.3.2

## 2.3.0

### Minor Changes

-   ec2ec23: Add client version 3.3.3

### Patch Changes

-   Updated dependencies [ec2ec23]
    -   @yume-chan/scrcpy@2.3.0

## 2.2.1

### Patch Changes

-   4a228d1: Fix default version for client version 3.3.2

## 2.2.0

### Minor Changes

-   f34724f: Add support for Scrcpy server version 3.3.2 (no protocol changes)

### Patch Changes

-   Updated dependencies [f34724f]
    -   @yume-chan/scrcpy@2.2.0

## 2.1.1

### Patch Changes

-   7edd616: Fix UHID output stream doesn't work from server version 2.6
-   Updated dependencies [7edd616]
-   Updated dependencies [e0def5b]
    -   @yume-chan/scrcpy@2.1.1

## 2.1.0

### Patch Changes

-   Updated dependencies [40a60ca]
-   Updated dependencies [a835eb8]
-   Updated dependencies [dbcfd34]
    -   @yume-chan/stream-extra@2.1.0
    -   @yume-chan/adb@2.1.0
    -   @yume-chan/scrcpy@2.1.0

## 2.0.1

### Patch Changes

-   Updated dependencies [0bcb9b8]
    -   @yume-chan/struct@2.0.1
    -   @yume-chan/adb@2.0.1
    -   @yume-chan/scrcpy@2.0.1
    -   @yume-chan/stream-extra@2.0.1

## 2.0.0

### Major Changes

-   fe06652: Move `version` parameter to `AdbScrcpyOptions`

### Minor Changes

-   d51ac8d: Forward `clipboard` stream from options class to `AdbScrcpyClient`
-   02f5bd5: Add alias for all AdbScrcpyOptions versions

### Patch Changes

-   Updated dependencies [fe06652]
-   Updated dependencies
-   Updated dependencies [05c01ad]
-   Updated dependencies [02f5bd5]
-   Updated dependencies [b79df96]
    -   @yume-chan/scrcpy@2.0.0
    -   @yume-chan/adb@2.0.0
    -   @yume-chan/event@2.0.0
    -   @yume-chan/struct@2.0.0
    -   @yume-chan/stream-extra@2.0.0

## 1.1.0

### Minor Changes

-   cb44b63: Move `version` info to option classes and provide default values

### Patch Changes

-   Updated dependencies [ab98953]
-   Updated dependencies [6140ebc]
-   Updated dependencies [6140ebc]
-   Updated dependencies [6140ebc]
-   Updated dependencies [8c5b3c2]
-   Updated dependencies [7f2a09c]
-   Updated dependencies [cb44b63]
    -   @yume-chan/adb@1.1.0
    -   @yume-chan/scrcpy@1.1.0

## 1.0.1

### Patch Changes

-   53688d3: Use PNPM workspace and Changesets to manage the monorepo.

    Because Changesets doesn't support alpha versions (`0.x.x`), this version is `1.0.0`. Future versions will follow SemVer rules, for example, breaking API changes will introduce a new major version.

-   db8466f: Rewrite the struct API completely
-   db8466f: Fix automatically switching to forward tunnel when reverse tunnel is not supported
-   Updated dependencies [53688d3]
-   Updated dependencies [db8466f]
-   Updated dependencies [db8466f]
-   Updated dependencies [ea5002b]
-   Updated dependencies [ea5002b]
-   Updated dependencies [db8466f]
    -   @yume-chan/stream-extra@1.0.1
    -   @yume-chan/scrcpy@1.0.1
    -   @yume-chan/struct@1.0.1
    -   @yume-chan/event@1.0.1
    -   @yume-chan/adb@1.0.1

This log was last generated on Tue, 18 Jun 2024 02:49:43 GMT and should not be manually modified.

## 0.0.24

Tue, 18 Jun 2024 02:49:43 GMT

### Updates

-   Rename `AdbScrcpyClient#controlMessageWriter` to `controller`
-   Remove `AdbScrcpyClient#deviceMessageStream`. Use `ScrcpyOptions#clipboard` to watch clipboard changes.
-   Allow `AdbScrcpyClient#pushServer` to accept `ReadableStream<Uint8Array>` as input
-   Add AV1 video size parsing support
-   Loosen type parameter constraints on `AdbScrcpyOptionsX_XX` classes, allow them to accept more option types

## 0.0.23

Thu, 21 Mar 2024 03:15:10 GMT

_Version update only_

## 0.0.22

Wed, 13 Dec 2023 05:57:27 GMT

_Version update only_

## 0.0.21

Fri, 25 Aug 2023 14:05:18 GMT

### Updates

-   Add support for Scrcpy server version 2.1 and 2.1.1

## 0.0.20

Mon, 05 Jun 2023 02:51:41 GMT

_Initial release_
