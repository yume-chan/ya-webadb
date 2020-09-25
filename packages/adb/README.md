# @yume-chan/adb

TypeScript implementation of Android Debug Bridge (ADB) protocol.

- [Connection](#connection)
  - [Backend](#backend)
    - [`read`](#read)
    - [`write`](#write)
- [Authenticate](#authenticate)
  - [Public key authentication](#public-key-authentication)
    - [Backend](#backend-1)
      - [`generateKey`](#generatekey)
  - [Token authentication](#token-authentication)
    - [Backend](#backend-2)
      - [`iterateKeys`](#iteratekeys)
- [Stream multiplex](#stream-multiplex)
  - [Backend](#backend-3)
    - [`encodeUtf8`](#encodeutf8)
    - [`decodeUtf8`](#decodeutf8)
- [Commands](#commands)
  - [shell](#shell)
    - [PTY mode](#pty-mode)
    - [ADB shell protocol](#adb-shell-protocol)
    - [Raw mode](#raw-mode)
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

## Connection

This library doesn't tie with a specific transportation method.

Instead, a `Backend` is responsible for transferring packets in its own way (USB, WebSocket, etc).

### Backend

#### `read`

```ts
read(length: number): ArrayBuffer | Promise<ArrayBuffer>
```

Read the specified amount of data from the underlying connection.

The backend should return only the data written by another endpoint in a single operation. That meas, it should never concatenate multiple write operations to fulfill the requested `length`. Here is the reason:

In normal working condition the client always knows how much data it should read and the server will always send exactly such amount of data in a single operation.

One exception is that for stateless connections (including USB and TCP), if one client sent a request and died without reading the response, the data will sit in an operating system's internal buffer. When the next client, reusing the connection, want to read a response to its request, it may get that buffered response instead.

The native ADB implementation tries to detect such a situation by checking length and content of the response data, so do this library. So the backend should not return such a response if possible, or follow this behavior if it can't distinguish.

#### `write`

```ts
write(buffer: ArrayBuffer): void | Promise<void>
```

Write data to the underlying connection.

## Authenticate

ADB supports two authentication methods:

### Public key authentication

1. Client (this library) generates a RSA private key and save it.
2. Client generates an ADB public key (not RSA public key) based on the RSA private key.
3. Client transfers the ADB public key to server (device).
4. Server may ask its user to accept the public key, it will save the public key if accepted.

#### Backend

##### `generateKey`

```ts
generateKey(): ArrayBuffer | Promise<ArrayBuffer>
```

Generate and store a RSA private key with modulus length 2048 and public exponent 65537.

The returned `ArrayBuffer` is the private key in PKCS #8 format.

### Token authentication

1. Server transfers a 20 bytes token to client.
2. Client RSA encrypts the token with its RSA private key.
3. Client transfers the encrypted token to server.
4. Server tries to decrypt the received data with all saved public keys. If any decryption succeed, the authentication succeed.

#### Backend

##### `iterateKeys`

```ts
generateKey(): Iterator<ArrayBuffer> | AsyncIterator<ArrayBuffer>
```

Synchronously or asynchronously iterate through all stored RSA private keys.

Each call to `iterateKeys` must returns a different iterator that iterate through all stored keys.

## Stream multiplex

ADB commands are all based on streams. Multiple streams can send and receive at the same time in one connection.

1. Client sends an `OPEN` packet to create a stream.
2. Server responds with `OKAY` or `FAIL`.
3. Client and server read/write on the stream.
4. Client/server sends a `CLSE` to close the stream.

The `Backend` is responsible for encoding and decoding UTF-8 strings.

### Backend

#### `encodeUtf8`

```ts
encodeUtf8(input: string): ArrayBuffer
```

Encode `input` into an `ArrayBuffer` with UTF-8 encoding.

#### `decodeUtf8`

```ts
decodeUtf8(buffer: ArrayBuffer): string
```

Decode `buffer` into a string with UTF-8 encoding.

## Commands

### shell

#### PTY mode

Basic mode, supported on all devices.

#### ADB shell protocol

*(Not Implemented)*

Supported on devices with `shell_v2` feature.

Supports window size changing event.

Supports returning process exit code.

#### Raw mode

*(Not Implemented)*

Must be used with ADB shell protocol.

Supports splitting stdout and stderr.

### usb

Disable ADB over WiFi.

### tcpip

Enable ADB over WiFi.

### sync

Client and server will communicate with another protocol on the opened stream.

#### LIST

Request server to list the content of a folder.

#### LIS2

*(Not Implemented)*

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

* [ADB protocol overview](https://github.com/aosp-mirror/platform_system_core/blob/master/adb/OVERVIEW.TXT)
* [ADB commands](https://github.com/aosp-mirror/platform_system_core/blob/d7c1bc73dc5b4e43b8288d43052a8b8890c4bf5a/adb/SERVICES.TXT#L145)
