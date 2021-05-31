# Transportation

First I need to clarify what "ADB protocol" precisely is.

## Native ADB

Native ADB has three components:

<pre class="flow-chart">
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
</pre>

### Client

Most ADB commands are executed in Client, but Client doesn't talk directly to Daemon on device.

The Client generates ADB packet payloads, encapsulates in **a variation of ADB protocol**, and sends them to Server over TCP.

### Server

Server is in the same binary with Client, but runs in a different process with different command arguments.

Server will mux ADB packets from multiple clients then send to Daemon over USB (libusb) or TCP, using the **ADB protocol**.

Because OS USB APIs only allow exclusive access to a device from one application, this architecture is required to enable multiple CLI applications to access concurrently use one device.

Usually Server is spawned by Client if no one is already running. As a result, it usually runs on the same computer as Client.

However, it's also possible to manually start a Server with the following command:

```shell
$ adb server nodaemon
```

Then, with SSH tunnel or other port forwarding solutions, Clients may connect to the server running on a different machine.

### Daemon

Daemon receives packets, performs operations on device, and sends back response packets. The details of how Daemon works won't be included in this book.

In USB mode, each Daemon can only accept one connection.

**TODO:** Finds out wether a Daemon can accept multiple TCP connections.

## Web ADB

Web ADB reuses native ADB daemon, with a 1:1:1 architecture:

<pre class="flow-chart">
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
</pre>

### Core

Core is the `@yume-chan/adb` package. It generates data in **ADB protocol**.

### Backend

Backends are in their own packages. They implement custom logic for sending packets.

Core takes an instance of some Backend on initialization, and calls methods on it to send and receive data.

Because it's not easy to share a Backend to clients outside the Web Browser, and it's very easy to share a connected Core object, this 1:1:1 architecture was chosen and it dramatically reduces complexity.

Having Backend as an independent part also makes it very easy to port to other runtimes (Web Browsers, Node.js, Electron, etc).

Possible Backend implementations:

* Web Browsers
  * WebUSB API (USB)
  * WebSocket + Custom WebSockify forwarder (TCP)
* Node.js/Electron
  * Any USB libraries (USB)
  * `net` module (TCP)
  * WebSocket + Custom WebSockify forwarder (TCP)

## Comparison

|                                  | Native ADB                             | Web ADB                                    |
| -------------------------------- | -------------------------------------- | ------------------------------------------ |
| Who implements all ADB commands? | Client                                 | Core                                       |
| Who directly talks to device?    | Server                                 | Backend                                    |
| How does them talk internally?   | TCP Socket (variation of ADB protocol) | JavaScript API calls                       |
