# Change Log - @yume-chan/adb

## 2.5.1

### Patch Changes

- b47941b: Forward AdbShellProtocolProcess.stdin close signal to remote process

## 2.4.0

### Minor Changes

- e1979a7: For daemon transport, not reading from one socket now only puts backpressure on the offending socket, i.e. it no longer block new data for all other sockets

## 2.3.1

### Patch Changes

- Fix server client observers can't emit `onDeviceRemove` events

## 2.1.0

### Minor Changes

- a835eb8: Add state filters to `AdbServerClient.prototype.getDevices` and `AdbServerClient.prototype.trackDevices`

### Patch Changes

- dbcfd34: Add `AdbServerClient.prototype.createAdb()` as a shorthand for `createTransport` and `new Adb`
- Updated dependencies [40a60ca]
    - @yume-chan/stream-extra@2.1.0

## 2.0.1

### Patch Changes

- Updated dependencies [0bcb9b8]
    - @yume-chan/struct@2.0.1
    - @yume-chan/stream-extra@2.0.1

## 2.0.0

### Major Changes

- Redesign subprocess API

### Minor Changes

- 05c01ad: Make `DeviceObserver#onListChange` sticky

### Patch Changes

- Updated dependencies [05c01ad]
- Updated dependencies [b79df96]
- Updated dependencies
    - @yume-chan/event@2.0.0
    - @yume-chan/struct@2.0.0
    - @yume-chan/no-data-view@2.0.0
    - @yume-chan/stream-extra@2.0.0

## 1.1.0

### Minor Changes

- ab98953: Add partial support for ADB server version 40

## 1.0.1

### Patch Changes

- 53688d3: Use PNPM workspace and Changesets to manage the monorepo.

    Because Changesets doesn't support alpha versions (`0.x.x`), this version is `1.0.0`. Future versions will follow SemVer rules, for example, breaking API changes will introduce a new major version.

- db8466f: Rewrite the struct API completely
- db8466f: Add common interface for device observers
- db8466f: Improve tree-shaking by removing TypeScript enum and namespace
- Updated dependencies [53688d3]
- Updated dependencies [db8466f]
- Updated dependencies [ea5002b]
- Updated dependencies [db8466f]
    - @yume-chan/no-data-view@1.0.1
    - @yume-chan/stream-extra@1.0.1
    - @yume-chan/struct@1.0.1
    - @yume-chan/event@1.0.1

This log was last generated on Tue, 18 Jun 2024 02:49:43 GMT and should not be manually modified.

## 0.0.24

Tue, 18 Jun 2024 02:49:43 GMT

### Updates

- Allow streams to accept both `Uint8Array` and `Consumable<Uint8Array>` as inputs
- Rename `AdbDaemonTransport`'s `debugSlowRead` option to `readTimeLimit`. Allow users to specify a custom timeout for read operations. It's still disabled by default.
- Include unauthorized devices in `AdbServerClient#getDevices()` and `AdbServerClient#trackDevices()`. You need to filter them out if you don't need them.
- Add more methods to `AdbServerClient`
- Group `AdbServerClient`-relating types into namespace. In future, more types will be moved to namespaces.
- Fix `Adb#reverse#list()` returning an extra empty object.
- Fix reverse tunnel handler not invoked.
- Fix too many event listener warning in Node.js.

## 0.0.23

Thu, 21 Mar 2024 03:15:10 GMT

### Updates

- Refactor `AdbSubprocessShellProtocol` (this shouldn't affect usage)
- Add `AdbServerClient.trackDevices`, which runs a callback function whenever device list changes
- Add support for delayed ack on Android 14

## 0.0.22

Wed, 13 Dec 2023 05:57:27 GMT

### Updates

- Add `getListenAddresses` method to `AdbTcpIpCommand` class for retrieving current ADB over WiFi state
- Add `debugSlowRead` option to `AdbDaemonTransport` that throws an error when an ADB socket is stalled for 5 seconds
- Fix `AdbSync#read` stuck when there is an error
- Fix TypeScript build when using `AdbSubprocessNoneProtocol` without installing `web-streams-polyfill` package

## 0.0.21

Fri, 25 Aug 2023 14:05:18 GMT

### Updates

- Change `AdbSync` to throws `AdbSyncError` for errors returned by ADB Daemon
- Add name for public keys
- Add typed errors for `framebuffer` command when current app disables screen capture
- Change `AdbDaemonTransport` class to automatically close the connection, unless the new `preserveConnection` option is `true`
- Add `recursive` and `force` options to `rm` method, allow deleting folders

## 0.0.20

Mon, 05 Jun 2023 02:51:41 GMT

### Updates

- Use ECMAScript private class fields syntax (supported by Chrome 74, Firefox 90, Safari 14.1 and Node.js 12.0.0).
- Refactor `AdbSubprocessShellProtocol` class, this should improve some performance.
- Split `mode` parameter in `AdbSync#write()` into `type` and `permission` for ease of use.
- Add `AdbReverseCommand#addExternal()`. This only register the reverse tunnel to the device, the handler should already exists (for example you are adding a reverse tunnel for an external program that's already listening on the port). In ADB direct connection, this should do nothing, because the reverse tunnel is handled by this library and there is no mean of "external" handler.
- Change `AdbTcpIpCommand#setPort` and `AdbTcpIpCommand#disable` to return or throw the response text. This can be displayed to the user to know what's wrong.
- Add support for connecting to ADB servers. Because a USB device can only be used by one process at a time, the ADB server is the process that manages all connected devices. The server proxies and multiplexes connections from ADB clients so multiple adb commands can be executed on one device at the same time. The `Adb` class is no longer responsible for connecting and authenticating with ADB daemons. The `AdbTransport` interface and its two implementations `AdbDaemonTransport` and `AdbServerTransport` was added to connect to either ADB daemons or servers in compatible environments. Read the PR for details, migration paths, and examples. ([#549](https://github.com/yume-chan/ya-webadb/pull/549))
- Add `serial` field to `Adb` class.
- Group `product`, `model`, `device` and `features` fields on `Adb` class to the `banner` field with type of `AdbBanner`.

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
