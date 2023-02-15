# Tango

[![GitHub license](https://img.shields.io/github/license/yume-chan/ya-webadb)](https://github.com/yume-chan/ya-webadb/blob/main/LICENSE)

A library and application for browsers to interact with Android devices via ADB.

[🚀 Online Demo](https://yume-chan.github.io/ya-webadb)

## Compatibility

| Connection                            | Chromium-based Browsers        | Firefox   | Node.js                       |
| ------------------------------------- | ------------------------------ | --------- | ----------------------------- |
| USB cable                             | Supported using [WebUSB] API   | No        | Supported using `usb` package |
| Wireless via [WebSocket] <sup>1</sup> | Supported                      | Supported | Possible using `ws` package   |
| Wireless via TCP                      | WIP using [Direct Sockets] API | No        | Possible using `net` module   |

[webusb]: https://wicg.github.io/webusb/
[websocket]: https://websockets.spec.whatwg.org/
[direct sockets]: https://wicg.github.io/direct-sockets/

<sup>1</sup> Requires WebSockify softwares, see [instruction](https://github.com/yume-chan/ya-webadb/discussions/245#discussioncomment-384030) for detail.

## Features

-   📁 File Management
    -   📋 List
    -   ⬆ Upload
    -   ⬇ Download
    -   🗑 Delete
-   📷 Screen Capture
-   📜 Interactive Shell
-   ⚙ Enable ADB over WiFi
-   📦 Install APK
-   🎥 [Scrcpy](https://github.com/Genymobile/scrcpy) compatible client (screen mirroring and controlling device)
-   🔌 Power and reboot to different modes

[📋 Project Roadmap](https://github.com/yume-chan/ya-webadb/issues/348)

## Contribute

See [CONTRIBUTE.md](./CONTRIBUTE.md)

## Credits

-   Google for [ADB](https://android.googlesource.com/platform/packages/modules/adb) ([Apache License 2.0](./adb.NOTICE))
-   Romain Vimont for [Scrcpy](https://github.com/Genymobile/scrcpy) ([Apache License 2.0](https://github.com/Genymobile/scrcpy/blob/master/LICENSE))
