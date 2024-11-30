# Change Log - @yume-chan/adb-scrcpy

## 0.0.0-next-20241130050937

### Major Changes

- 53688d3: Use PNPM workspace and Changesets to manage the monorepo.

    Because Changesets doesn't support alpha versions (`0.x.x`), this version is `1.0.0`. Future versions will follow SemVer rules, for example, breaking API changes will introduce a new major version.

### Patch Changes

- db8466f: Rewrite the struct API completely
- db8466f: Fix automatically switching to forward tunnel when reverse tunnel is not supported
- Updated dependencies [53688d3]
- Updated dependencies [db8466f]
- Updated dependencies [db8466f]
- Updated dependencies [ea5002b]
- Updated dependencies [ea5002b]
- Updated dependencies [db8466f]
    - @yume-chan/stream-extra@0.0.0-next-20241130050937
    - @yume-chan/scrcpy@0.0.0-next-20241130050937
    - @yume-chan/struct@0.0.0-next-20241130050937
    - @yume-chan/event@0.0.0-next-20241130050937
    - @yume-chan/adb@0.0.0-next-20241130050937

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
