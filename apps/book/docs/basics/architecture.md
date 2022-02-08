---
sidebar_position: 1
---

<!--
cspell: ignore libusb
cspell: ignore nodaemon
-->

# Architecture

This part describes the architecture of native ADB and Web ADB, and why there are designed in this way.

## Native ADB

Native ADB has three components:

<div className="flow-chart">

```
┌───────────────────────────────┐  ┌──────────────┐
│                               │  │              │
│ ┌───────────┐     ┌────────┐  │  │ ┌──────────┐ │
│ │           ├─────►        ├──┼──┼─►          │ │
│ │ Client A  │     │        │  │  │ │ Daemon A │ │
│ │           ◄─────┤        ◄──┼──┼─┤          │ │
│ └───────────┘     │        │  │  │ └──────────┘ │
│                   │        │  │  │              │
│ ┌───────────┐     │ Server │  │  │   Device A   │
│ │           ├─────►        │  │  │              │  ┌──────────────┐
│ │ Client B  │     │        │  │  └──────────────┘  │              │
│ │           ◄─────┤        │  │                    │ ┌──────────┐ │
│ └───────────┘     │        ├──┼────────────────────┼─►          │ │
│                   │        │  │                    │ │ Daemon B │ │
│                   │        ◄──┼────────────────────┼─┤          │ │
│  Computer A       └──▲──┬──┘  │                    │ └──────────┘ │
│                      │  │     │                    │              │
└──────────────────────┼──┼─────┘                    │   Device B   │
                       │  │                          │              │
┌───────────────┐      │  │                          └──────────────┘
│               │      │  │
│ ┌───────────┐ │      │  │
│ │           ├─┼──────┘  │
│ │ Client C  │ │         │
│ │           ◄─┼─────────┘
│ └───────────┘ │
│               │
│  Computer B   │
│               │
└───────────────┘
```

</div>

### Client

**Client** receives command line inputs, generates request packets, sends them to **server** over TCP.

Because there can be multiple devices connected to the computer, **clients** add a "host prefix" to specify the device.

### Server

**Server** is in the same binary as **client**, but runs in a separate process with different command line arguments. Usually **servers** are spawned by **clients** when they cannot find one on localhost. To manually spawn a **server**, use `adb server nodaemon`. By default, it binds to `localhost:5037`.

It is also possible to use SSH tunnel to let **clients** connect to a **server** running on a remote machine.

**Servers** are responsible for discovering and connecting to devices. They also handle packets from **clients**.

Some packets should be processed by **server** itself (for example `adb devices`), it generates response packets and sends them to **client**.

Others need to be forwarded to **daemons** (for example `adb shell`). It finds the specified **daemon** using the "host prefix", rewrites the packet to remove "host prefix", and finally sends it to the **daemon** over USB (libusb/WinUSB) or TCP.

Because USB APIs only allow one connection to a device simultaneously, to use multiple CLI applications with one device, the **server** is required to multiplex the packets.

### Daemon

**Daemon** runs on Android devices and emulators, it receives packets, handles them, and generates responses.

Historically, because most device only has one USB port, **daemons** can only handle one connection. But even after ADB over Wi-Fi has been added, one **daemon** can still handle one TCP connection.

### Protocol

All packets between **client-server** and **server-daemon** are in the ADB packet format, but as mentioned before, **client-server** packets contain an extra "host prefix". ADB packet format will be described in [packet](./packet.md) chapter, while "host prefix" will be described in [stream](./stream.md) chapter.

## Web ADB

Web ADB reuses native ADB daemons, but there is no **client**/**server**: One application, one connection, to one device.

<div className="flow-chart">

```
┌──────────────────────────────────┐  ┌──────────────┐
│                                  │  │              │
│ ┌──────────┐    ┌─────────────┐  │  │ ┌──────────┐ │
│ │          ├────►             ├──┼──┼─►          │ │
│ │  Core A  │    │  Backend A  │  │  │ │ Daemon A │ │
│ │          ◄────┤             ◄──┼──┼─┤          │ │
│ └──────────┘    └─────────────┘  │  │ └──────────┘ │
│                                  │  │              │
│                                  │  │   Device A   │
│                                  │  │              │  ┌──────────────┐
│                                  │  └──────────────┘  │              │
│ ┌──────────┐    ┌─────────────┐  │                    │ ┌──────────┐ │
│ │          ├────►             ├──┼────────────────────┼─►          │ │
│ │  Core B  │    │  Backend B  │  │                    │ │ Daemon B │ │
│ │          ◄────┤             ◄──┼────────────────────┼─┤          │ │
│ └──────────┘    └─────────────┘  │                    │ └──────────┘ │
│                                  │                    │              │
│        JavaScript Runtime        │                    │   Device B   │
│                                  │                    │              │
└──────────────────────────────────┘                    └──────────────┘
```

</div>

### Core

**Core** is the `@yume-chan/adb` package. It generates data in ADB protocol, without "host prefix" (not needed because packets are directly sent to **daemons** via a **backend**).

### Backend

One **backend** defines one method to transmit and receive ADB packets. There are already multiple backend implementations, for example `@yume-chan/adb-backend-usb` and `@yume-chan/adb-backend-ws`.

One **core** instance requires one **backend** instance, so it only connects to one device.

Because JavaScript runtimes are generally more isolated, sharing devices between multiple application is not a consideration. However, it is still very easy to share a **core** instance within a single application, and if a runtime has more privileges, sharing **core** using a custom protocol is also not impossible.

Having Backend as an independent part also makes it extremely easy to port to other runtimes (Web Browsers, Node.js, Electron, etc.).

Possible Backend implementations:

* Web Browsers
  * WebUSB API (USB)
  * WebSocket + Custom WebSockify forwarder (TCP)
* Node.js/Electron
  * Any USB libraries (USB)
  * `net` module (TCP)
  * WebSocket + Custom WebSockify forwarder (TCP)

## Comparison

|                                  | Native ADB                             | Web ADB              |
| -------------------------------- | -------------------------------------- | -------------------- |
| Who implements all ADB commands? | Client                                 | Core                 |
| Who directly talks to device?    | Server                                 | Backend              |
| How does them talk internally?   | TCP Socket (variation of ADB protocol) | JavaScript API calls |
