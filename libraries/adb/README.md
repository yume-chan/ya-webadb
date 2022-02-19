# @yume-chan/adb

TypeScript implementation of Android Debug Bridge (ADB) protocol.

**WARNING:** The public API is UNSTABLE. If you have any questions, please open an issue.

- [Compatibility](#compatibility)
- [Connection](#connection)
  - [Backend](#backend)
    - [`connect`](#connect)
    - [`read`](#read)
    - [`write`](#write)
- [Authentication](#authentication)
    - [AdbCredentialStore](#adbcredentialstore)
      - [`generateKey`](#generatekey)
      - [`iterateKeys`](#iteratekeys)
      - [Implementations](#implementations)
    - [AdbAuthenticator](#adbauthenticator)
- [Stream multiplex](#stream-multiplex)
  - [Backend](#backend-1)
- [Commands](#commands)
  - [childProcess](#childprocess)
  - [usb](#usb)
  - [tcpip](#tcpip)
  - [sync](#sync)
    - [LIST](#list)
    - [LIS2](#lis2)
    - [STAT](#stat)
    - [LST2](#lst2)
    - [STA2](#sta2)
    - [RECV](#recv)
    - [RCV2](#rcv2)
    - [SEND](#send)
    - [SND2](#snd2)
- [Useful links](#useful-links)

## Compatibility

This table only applies to this library itself. Specific backend may have different requirements.

|                                  | Chrome | Edge | Firefox | Internet Explorer | Safari             | Node.js              |
| -------------------------------- | ------ | ---- | ------- | ----------------- | ------------------ | -------------------- |
| Basic usage                      | 68     | 79   | 68      | No                | 14<sup>1</sup>, 15 | 10.4<sup>2</sup>, 11 |
| Use without bundlers<sup>3</sup> | 89     | 89   | 89      | No                | 15                 | 14.8                 |

<sup>1</sup> Requires a polyfill for `DataView#getBigInt64`, `DataView#getBigUint64`, `DataView#setBigInt64` and `DataView#setBigUint64`

<sup>2</sup> `TextEncoder` and `TextDecoder` are only available in `util` module. Must be assigned to global object.

<sup>3</sup> Because usage of Top-Level Await.

## Connection

This library doesn't tie to a specific transportation method.

Instead, a `Backend` is responsible for transferring data in its own way (USB, WebSocket, etc).

### Backend

#### `connect`

Establishes a connection with the device.

If a backend doesn't have extra steps to establish the connection, it can omit the `connect` method implementation.

#### `read`

```ts
read(length: number): ArrayBuffer | Promise<ArrayBuffer>
```

Reads the specified amount of data from the underlying connection.

The returned `ArrayBuffer` may have more or less data than the `length` parameter specified, if there is some residual data in the connection buffer. The client will automatically call `read` again with the same `length`.

#### `write`

```ts
write(buffer: ArrayBuffer): void | Promise<void>
```

Writes data to the underlying connection.

## Authentication

For how does ADB authentication work, see https://chensi.moe/blog/2020/09/30/webadb-part2-connection/#auth.

In this library, authentication comes in two parts:

* `AdbCredentialStore`: because JavaScript has no unified method to generate, store and iterate crypto keys, an implementation of `AdbCredentialStore` is required for the two built-in authenticators.
* `AdbAuthenticator`: can be used to implement custom authentication modes.

Custom `AdbCredentialStore`s and `AdbAuthenticator`s can be specified in the `Adb#connect` method.

#### AdbCredentialStore

##### `generateKey`

```ts
generateKey(): ArrayBuffer | Promise<ArrayBuffer>
```

Generate and store a RSA private key with modulus length `2048` and public exponent `65537`.

The returned `ArrayBuffer` is the private key in PKCS #8 format.

##### `iterateKeys`

```ts
iterateKeys(): Iterator<ArrayBuffer> | AsyncIterator<ArrayBuffer>
```

Synchronously or asynchronously iterate through all stored RSA private keys.

Each call to `iterateKeys` must return a different iterator that iterate through all stored keys.

##### Implementations

The `@yume-chan/adb-backend-webusb` package contains a `AdbWebCredentialStore` implementation using Web Crypto API to generating keys and Web Storage API to storing keys.

#### AdbAuthenticator

An `AdbAuthenticator` generates `AUTH` responses for each `AUTH` request from server.

This package contains `AdbSignatureAuthenticator` and `AdbPublicKeyAuthenticator`, the two basic modes.

## Stream multiplex

ADB commands are all based on streams. Multiple streams can send and receive at the same time in one connection.

1. Client sends an `OPEN` packet to create a stream.
2. Server responds with `OKAY` or `FAIL`.
3. Client and server read/write on the stream.
4. Client/server sends a `CLSE` to close the stream.

The `Backend` is responsible for reading and writing data from underlying source.

### Backend

## Commands

### childProcess

Spawns child process on server. ADB has two shell modes:

|                             | Legacy mode      | Shell Protocol     |
| --------------------------- | ---------------- | ------------------ |
| Feature flag                | -                | `shell_v2`         |
| Implementation              | `AdbLegacyShell` | `AdbShellProtocol` |
| Splitting stdout and stderr | No               | Yes                |
| Returning exit code         | No               | Yes                |
| Resizing window             | No               | Yes                |

The `Adb#childProcess#shell` and `Adb#childProcess#spawn` methods accepts a list of implementations, and will use the first supported one.

### usb

Disable ADB over WiFi.

### tcpip

Enable ADB over WiFi.

### sync

Client and server will communicate with another protocol on the opened stream.

#### LIST

Request server to list the content of a folder.

#### LIS2

Version 2 of the LIST command, contains more information.

Supported on devices with `ls_v2` feature.

#### STAT

Request server to return the information of a file.

If path is a symbolic link, the returned information is about the link itself.

So it's actually the [`lstat`](https://linux.die.net/man/2/lstat) system call.

#### LST2

Version 2 of the STAT command, contains more information.

Supported on devices with `stat_v2` feature.

#### STA2

Basically identical to LST2, but if path is a symbolic link, the information is about the file it refers to.

Supported on devices with `stat_v2` feature.

#### RECV

Request server to send the content of a file.

#### RCV2

*(Not Implemented)*

Version 2 of the RECV command.

Supported on devices with `sendrecv_v2` feature.

#### SEND

*(Not Implemented)*

Send a file onto server's file system.

#### SND2

*(Not Implemented)*

Version 2 of the SEND command.

Supported on devices with `sendrecv_v2` feature.

## Useful links

* [ADB protocol overview](https://android.googlesource.com/platform/packages/modules/adb/+/2fd69306184634c6d90db3ed3be5349e71dcc471/OVERVIEW.TXT)
* [ADB commands](https://android.googlesource.com/platform/packages/modules/adb/+/2fd69306184634c6d90db3ed3be5349e71dcc471/SERVICES.TXT#145)
