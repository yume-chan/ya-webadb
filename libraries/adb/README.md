# @yume-chan/adb

TypeScript implementation of Android Debug Bridge (ADB) protocol.

**WARNING:** The public API is UNSTABLE. If you have any questions, please open an issue.

- [Compatibility](#compatibility)
  - [Basic usage](#basic-usage)
  - [Use without bundlers](#use-without-bundlers)
- [Connection](#connection)
  - [Backend](#backend)
    - [`connect`](#connect)
- [Authentication](#authentication)
    - [AdbCredentialStore](#adbcredentialstore)
      - [`generateKey`](#generatekey)
      - [`iterateKeys`](#iteratekeys)
      - [Implementations](#implementations)
    - [AdbAuthenticator](#adbauthenticator)
    - [`authenticate`](#authenticate)
- [Stream multiplex](#stream-multiplex)
- [Commands](#commands)
  - [subprocess](#subprocess)
    - [raw mode](#raw-mode)
    - [pty mode](#pty-mode)
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

Here is a list of features, their used APIs, and their compatibilities. If an optional feature is not actually used, its requirements can be ignored.

Some features can be polyfilled to support older runtimes, but this library doesn't ship with any polyfills.

Each backend may have different requirements.

### Basic usage

|                                 | Chrome | Edge | Firefox | Internet Explorer | Safari | Node.js             |
| ------------------------------- | ------ | ---- | ------- | ----------------- | ------ | ------------------- |
| `@yume-chan/struct`<sup>1</sup> | 67     | 79   | 68      | No                | 14     | 8.3<sup>2</sup>, 11 |
| *Overall*                       | 67     | 79   | No      | No                | 14.1   | 16.5                |

<sup>1</sup> `uint64` and `string` are used.

<sup>2</sup> `TextEncoder` and `TextDecoder` are only available in `util` module. Need to be assigned to `globalThis`.

### Use without bundlers

|                 | Chrome | Edge | Firefox | Internet Explorer | Safari | Node.js |
| --------------- | ------ | ---- | ------- | ----------------- | ------ | ------- |
| Top-level await | 89     | 89   | 89      | No                | 15     | 14.8    |

## Connection

This library doesn't tie to a specific transportation method.

Instead, a `Backend` is responsible for transferring data in its own way (USB, WebSocket, TCP, etc).

### Backend

#### `connect`

```ts
connect(): ValueOrPromise<ReadableWritablePair<AdbPacketCore, AdbPacketInit>>
```

Connect to a device and create a pair of `AdbPacket` streams.

The backend, instead of the core library, is responsible for serializing and deserializing the packets. Because it's extreme slow for WebUSB backend (`@yume-chan/adb-backend-webusb`) to read packets with unknown size.

## Authentication

For how does ADB authentication work, see https://chensi.moe/blog/2020/09/30/webadb-part2-connection/#auth.

In this library, authentication comes in two parts:

#### AdbCredentialStore

An interface to generate, store and iterate ADB private keys on each runtime. (Because Node.js and Browsers have different APIs to do this)

##### `generateKey`

```ts
generateKey(): ValueOrPromise<Uint8Array>
```

Generate and store a RSA private key with modulus length `2048` and public exponent `65537`.

The returned `Uint8Array` is the private key in PKCS #8 format.

##### `iterateKeys`

```ts
iterateKeys(): Iterator<ArrayBuffer> | AsyncIterator<ArrayBuffer>
```

Synchronously or asynchronously iterate through all stored RSA private keys.

Each call to `iterateKeys` must return a different iterator that iterate through all stored keys.

##### Implementations

The `@yume-chan/adb-credential-web` package contains a `AdbWebCredentialStore` implementation using Web Crypto API for generating keys and Web Storage API for storing keys.

#### AdbAuthenticator

An `AdbAuthenticator` generates `AUTH` responses for each `AUTH` request from server.

This package contains `AdbSignatureAuthenticator` and `AdbPublicKeyAuthenticator`, the two basic modes.

#### `authenticate`

```ts
static async authenticate(
    connection: ReadableWritablePair<AdbPacketCore, AdbPacketCore>,
    credentialStore: AdbCredentialStore,
    authenticators = AdbDefaultAuthenticators,
): Promise<Adb>
```

Call this method to authenticate the connection and create an `Adb` instance.

If an authentication process failed, it's possible to call `authenticate` again on the same connection (`AdbPacket` stream pair). Every time the device receives a `CNXN` packet, it resets all internal state, and starts a new authentication process.

## Stream multiplex

ADB commands are all based on streams. Multiple streams can send and receive at the same time in one connection.

1. Client sends an `OPEN` packet to create a stream.
2. Server responds with `OKAY` or `FAIL`.
3. Client and server read/write on the stream.
4. Client/server sends a `CLSE` to close the stream.

## Commands

### subprocess

ADB has two subprocess invocation modes and two data protocols (4 combinations).

#### raw mode

In raw mode, Shell protocol transfers `stdout` and `stderr` separately. It also supports returning exit code.

|                             | Legacy protocol             | Shell Protocol               |
| --------------------------- | --------------------------- | ---------------------------- |
| Feature flag                | -                           | `shell_v2`                   |
| Implementation              | `AdbNoneSubprocessProtocol` | `AdbShellSubprocessProtocol` |
| Splitting stdout and stderr | No                          | Yes                          |
| Returning exit code         | No                          | Yes                          |

Use `spawn` method to create a subprocess in raw mode.

#### pty mode

In PTY mode, the subprocess has a pseudo-terminal, so it can send special control sequences like clear screen and set cursor position. The two protocols both send data in `stdout`, but Shell Protocol also supports resizing the terminal from client.

|                             | Legacy protocol             | Shell Protocol               |
| --------------------------- | --------------------------- | ---------------------------- |
| Feature flag                | -                           | `shell_v2`                   |
| Implementation              | `AdbNoneSubprocessProtocol` | `AdbShellSubprocessProtocol` |
| Resizing window             | No                          | Yes                          |

Use `shell` method to create a subprocess in PTY mode.

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
