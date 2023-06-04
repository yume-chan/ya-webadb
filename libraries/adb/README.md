# @yume-chan/adb

TypeScript implementation of Android Debug Bridge (ADB) protocol.

**WARNING:** The public API is UNSTABLE. Open a GitHub discussion if you have any questions.

-   [Compatibility](#compatibility)
    -   [Basic usage](#basic-usage)
    -   [Use without bundlers](#use-without-bundlers)
-   [Transport](#transport)
    -   [`AdbDaemonTransport`](#adbdaemontransport)
        -   [`AdbCredentialStore`](#adbcredentialstore)
            -   [`generateKey`](#generatekey)
            -   [`iterateKeys`](#iteratekeys)
        -   [`AdbAuthenticator`](#adbauthenticator)
        -   [`authenticate`](#authenticate)
        -   [`addReverseTunnel`](#addreversetunnel)
    -   [`AdbServerTransport`](#adbservertransport)
        -   [`AdbServerClient`](#adbserverclient)
            -   [`getVersion`](#getversion)
            -   [`kill`](#kill)
            -   [`getServerFeatures`](#getserverfeatures)
            -   [`getDevices`](#getdevices)
            -   [`AdbServerDeviceSelector`](#adbserverdeviceselector)
            -   [`getDeviceFeatures`](#getdevicefeatures)
            -   [`waitFor`](#waitfor)
-   [Commands](#commands)
    -   [subprocess](#subprocess)
        -   [raw mode](#raw-mode)
        -   [pty mode](#pty-mode)
    -   [usb](#usb)
    -   [tcpip](#tcpip)
    -   [sync](#sync)
        -   [`lstat`](#lstat)
        -   [`stat`](#stat)
        -   [`isDirectory`](#isdirectory)
        -   [`opendir`](#opendir)
        -   [`readdir`](#readdir)
-   [Useful links](#useful-links)

## Compatibility

Here is a list of features, their used APIs, and their compatibilities. If an optional feature is not actually used, its requirements can be ignored.

Some features can be polyfilled to support older runtimes, but this library doesn't ship with any polyfills.

Each transport and connection may have different requirements.

### Basic usage

|                                  | Chrome | Edge | Firefox | Internet Explorer | Safari | Node.js             |
| -------------------------------- | ------ | ---- | ------- | ----------------- | ------ | ------------------- |
| `@yume-chan/struct`<sup>1</sup>  | 67     | 79   | 68      | No                | 14     | 8.3<sup>2</sup>, 11 |
| Private class fields<sup>3</sup> | 74     | 79   | 90      | No                | 14.1   | 12.0.0              |
| _Overall_                        | 74     | 79   | 90      | No                | 14.1   | 16.5                |

<sup>1</sup> `uint64` and `string` are used.

<sup>2</sup> `TextEncoder` and `TextDecoder` are only available in `util` module. Need to be assigned to `globalThis`.

<sup>3</sup> Can be down-level compiled using Babel.

### Use without bundlers

|                 | Chrome | Edge | Firefox | Internet Explorer | Safari | Node.js |
| --------------- | ------ | ---- | ------- | ----------------- | ------ | ------- |
| Top-level await | 89     | 89   | 89      | No                | 15     | 14.8    |

## Transport

This library doesn't tie to a specific transportation method.

Instead, an implementation of the `AdbTransport` interface is responsible for creating ADB sockets when requested. Each implementation might have different methods to discover, connect and authenticate devices.

### `AdbDaemonTransport`

`AdbDaemonTransport` connects to an ADB daemon directly.

It requires a `ReadableWritablePair<AdbPacketData, Consumable<AdbPacketInit>>` to send and receive ADB packets to the daemon.

Usually an implementation of `AdbDaemonConnection` will provide that along with other useful information about the device. Possible implementations includes:

-   WebUSB API
-   `usb` package for Node.js
-   Node.js' `net` module (for ADB over WiFi)
-   Though a WebSockify wrapper (also for ADB over WiFi).

ADB daemon requires authentication unless built in debug mode. For how ADB authentication work, see https://chensi.moe/blog/2020/09/30/webadb-part2-connection/#auth.

Authentication requires two extra components:

#### `AdbCredentialStore`

An interface to generate, store and iterate ADB private keys on each runtime. (Because Node.js and Browsers have different APIs to do that)

The `@yume-chan/adb-credential-web` package contains a `AdbWebCredentialStore` implementation using Web Crypto API for generating keys and IndexedDB for storing keys.

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

#### `AdbAuthenticator`

An `AdbAuthenticator` generates `AUTH` responses for each `AUTH` request from server.

This package contains `AdbSignatureAuthenticator` and `AdbPublicKeyAuthenticator` classes for the two basic modes, they all uses the `AdbCredentialStore` to get the private key.

#### `authenticate`

```ts
static async authenticate(options: {
    connection: ReadableWritablePair<AdbPacketCore, AdbPacketCore>,
    credentialStore: AdbCredentialStore,
    authenticators?: AdbAuthenticator[],
}): Promise<AdbDaemonTransport>
```

Authenticates the connection and creates an `AdbDaemonTransport` instance that can be used by `Adb` class.

If an authentication process failed, it's possible to call `authenticate` again on the same connection. Because every time the device receives a `CNXN` packet, it resets all internal state, and starts a new authentication process.

#### `addReverseTunnel`

```ts
public addReverseTunnel(
    handler: AdbIncomingSocketHandler,
    address?: string
): string
```

Adds a reverse tunnel handler to the transport. It doesn't register the reverse tunnel to the device, for that use `AdbReverseCommand#add` instead. Because the process for ADB to create a tunnel is same as calling a command, `address` can be any string that the ADB daemon might call as a command.

### `AdbServerTransport`

`AdbServerTransport` connects to an ADB server. Because a USB device can only be used by one process at a time, the ADB server is the process that manages all connected devices. The server proxies and multiplexes connections from ADB clients so multiple adb commands can be executed on one device at the same time. `AdbServerTransport` instances can be retrieved from `AdbServerClient` class.

#### `AdbServerClient`

The `AdbServerClient` class implements the client-server protocol to interact with the ADB server. It can query the list of connected devices, detect device connections and disconnections, and invoke other server commands.

It needs an implementation of `AdbServerConnection` interface to actually connects to the ADB server using each runtime's API.

##### `getVersion`

```ts
public async getVersion(): Promise<string>;
```

Get the version number of the ADB server. This version is not related to the ADB server-daemon protocol version nor device Android version, it increases when a breaking change is introduced into the client-server protocol.

##### `kill`

```ts
public async kill(): Promise<void>;
```

Kill the ADB server, for example if you want to connect to the ADB daemon directly over USB.

##### `getServerFeatures`

```ts
public async getServerFeatures(): Promise<AdbFeature[]>;
```

Get the list of ADB features supported by the server.

Generally it's not that useful because most ADB commands only cares about what features the device supports.

##### `getDevices`

```ts
public async getDevices(): Promise<AdbServerTransport[]>;
```

Get the list of connected devices.

The returned `AdbServerTransport` instance can be supplied to `new Adb` to operate on that device.

##### `AdbServerDeviceSelector`

Some commands target a specific device. `AdbServerDeviceSelector` chooses a device from the list of connected devices.

It can be one of:

-   `undefined`: any one device, will throw an error if there are multiple devices connected. Same as no argument are given to `adb` command.
-   `{ serial: string }`: a device with the given serial number. Note that multiple devices can have the same serial number (if the manufacturer is lazy), usually it's enough to identify a device. Same as the `-s` argument for the `adb` command.
-   `{ transportId: number }`: a device with the given transport ID. The transport ID is from the order devices connect. It can be obtained from `getDevices` method. Same as the `-t` argument for the `adb` command.
-   `{ usb: true }`: any one USB device, will throw an error if there are multiple devices connected via USB. Same as the `-d` argument for the `adb` command.
-   `{ emulator: true }`: any one TCP device (including emulators and devices connected via ADB over WiFi), will throw an error if there are multiple TCP devices. Same as the `-e` argument for the `adb` command. Same as the `-e` argument for the `adb` command.

The selector will be sent to ADB server and resolved there.

##### `getDeviceFeatures`

```ts
public async getDeviceFeatures(
    device: AdbServerDeviceSelector
): Promise<AdbFeature[]>
```

Gets the list of ADB features supported by the device. `Adb` class requires this information to choose the correct commands to use.

##### `waitFor`

```ts
public async waitFor(
    device: AdbServerDeviceSelector,
    state: "device" | "disconnect",
    signal?: AbortSignal
): Promise<void>
```

Wait for a specific device to be connected or disconnected. The `AdbServerTransport` instance uses this method to detect device disconnects.

## Commands

### subprocess

ADB has two subprocess invocation modes and two data protocols (4 combinations). The Shell protocol was added in Android 8 and can be identified by the `shell_v2` feature flag.

#### raw mode

In raw mode, Shell protocol transfers `stdout` and `stderr` separately, and supports returning exit code.

|                             | Legacy protocol             | Shell Protocol               |
| --------------------------- | --------------------------- | ---------------------------- |
| Feature flag                | -                           | `shell_v2`                   |
| Implementation              | `AdbNoneSubprocessProtocol` | `AdbShellSubprocessProtocol` |
| Splitting stdout and stderr | No                          | Yes                          |
| Returning exit code         | No                          | Yes                          |

Use `spawn` method to create a subprocess in raw mode.

#### pty mode

In PTY mode, the subprocess has a pseudo-terminal, so it can send special control sequences like clear screen and set cursor position. The two protocols both send data in `stdout`, but Shell Protocol also supports resizing the terminal from client and returning the exit code.

|                             | Legacy protocol             | Shell Protocol               |
| --------------------------- | --------------------------- | ---------------------------- |
| Feature flag                | -                           | `shell_v2`                   |
| Implementation              | `AdbNoneSubprocessProtocol` | `AdbShellSubprocessProtocol` |
| Resizing window             | No                          | Yes                          |
| Splitting stdout and stderr | No                          | No                           |
| Returning exit code         | No                          | Yes                          |

Use `shell` method to create a subprocess in PTY mode.

### usb

Disable ADB over WiFi.

### tcpip

Enable ADB over WiFi.

### sync

Sync protocol is a sub-protocol of the server-daemon protocol, it allows interacting with the device's filesystem.

```ts
public async sync(): Promise<AdbSync>;
```

Creates an `AdbSync` client. The client can send multiple command in sequence, and multiple clients can be created to send commands in parallel.

#### `lstat`

```ts
public async lstat(path: string): Promise<AdbSyncStat>;
```

Gets the information of a file or folder. If path is a symbolic link, the returned information is about the link itself.

This uses the `STAT` or `LST2` (when supported) sync commands, notice that despite the name of `STAT`, it doesn't resolve symbolic links.

Same as the [`lstat`](https://linux.die.net/man/2/lstat) system call in Linux.

#### `stat`

```ts
public async stat(path: string): Promise<AdbSyncStat>;
```

Similar to `lstat`, but if path is a symbolic link, the information is about the file it refers to.

Uses the `STA2` sync command, which requires the `stat_v2` feature flag. Will throw an error if device doesn't support that.

Same as the `stat` system call in Linux.

#### `isDirectory`

```ts
public async isDirectory(path: string): Promise<boolean>
```

Uses `lstat` method to check if the given path is a directory.

#### `opendir`

```ts
public opendir(path: string): AsyncGenerator<AdbSyncEntry, void, void>;
```

Returns an async generator that yields the content of a folder.

Example:

```ts
for await (const entry of this.opendir(path)) {
    console.log(entry.name, entry.size);
}
```

#### `readdir`

```ts
public async readdir(path: string): Promise<AdbSyncEntry>
```

Collects the result of `opendir` into an array. Useful if you want to send other commands using the same `AdbSync` instance while iterating the folder.

#### `read`

```ts
public read(filename: string): ReadableStream<Uint8Array>
```

Reads the content of a file on device.

#### `write`

```ts
public async write(options: {
    filename: string;
    file: ReadableStream<Consumable<Uint8Array>>;
    type?: LinuxFileType;
    permission?: number;
    mtime?: number;
    dryRun?: boolean;
})
```

Writes a file on device. If the file name already exists, it will be overwritten.

## Useful links

-   [ADB protocol overview](https://android.googlesource.com/platform/packages/modules/adb/+/2fd69306184634c6d90db3ed3be5349e71dcc471/OVERVIEW.TXT)
-   [ADB commands](https://android.googlesource.com/platform/packages/modules/adb/+/2fd69306184634c6d90db3ed3be5349e71dcc471/SERVICES.TXT#145)
