# Tango

[![MIT license](https://img.shields.io/github/license/yume-chan/ya-webadb)](https://github.com/yume-chan/ya-webadb/blob/main/LICENSE)

A library and a Web app that allow browsers to interact with Android devices via ADB (Android Debugging Protocol).

All features work on Chrome for Android, use a C-to-C (or OTG) cable or via WebSockify running in Termux (see [compatibility table](#compatibility) below).

[🚀 Web App](https://tango-web-mu.vercel.app/) | [Old demo](https://yume-chan.github.io/ya-webadb)

For USB connection, close Google ADB (Run `adb kill-server` in a terminal or close `adb.exe` from Task Manager) and all programs that may use ADB (e.g. Android Studio, Visual Studio, Godot Editor, etc.) before connecting.

## Working Modes

### Direct Connection Mode

In this mode, Google ADB is not required for this library to communicate with Android devices (in fact, Google ADB must not be running in order to use this mode).

This mode is suitable for running on end-users' devices where Google ADB is not installed, or on mobile devices where Google ADB is not available.

### Google ADB Client Mode

In this mode, this library talks to a Google ADB server, which is either running on the same machine or on a remote machine. This allows other ADB-based tools to work alongside this library.

## Compatibility

| Connection                                | Chromium-based Browsers        | Firefox   | Node.js                       |
| ----------------------------------------- | ------------------------------ | --------- | ----------------------------- |
| USB cable                                 | Supported using [WebUSB] API   | No        | Supported using `usb` package |
| Wireless through [WebSocket] <sup>1</sup> | Supported                      | Supported | Possible using `ws` package   |
| Wireless through TCP                      | Waiting for [Direct Sockets] API | No        | Possible using `net` module   |

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
-   📜 Terminal Emulator powered by [Tabby](https://github.com/Eugeny/tabby)
    -   Tabs and split panes
    -   Color themes
    -   Rich configuration
-   ⚙ Enable ADB over WiFi
-   📦 Install APK
-   🎥 [Scrcpy](https://github.com/Genymobile/scrcpy) compatible client
    -   Screen mirroring
    -   Audio forwarding (Android >= 11)
    -   Recording
    -   Control device with mouse, touch and keyboard
-   🐛 Chrome Remote Debugging that supporting
    -   Google Chrome (stable, beta, dev, canary)
    -   Microsoft Edge (stable, beta, dev, canary)
    -   Opera (stable, beta)
    -   Vivaldi
-   🔌 Power and reboot to different modes

## Contribute

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## Sponsors

[Become a backer](https://opencollective.com/ya-webadb) and get your image on our README on Github with a link to your site.

<a href="https://opencollective.com/ya-webadb/backer/0/website?requireActive=false" target="_blank"><img src="https://opencollective.com/ya-webadb/backer/0/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/ya-webadb/backer/1/website?requireActive=false" target="_blank"><img src="https://opencollective.com/ya-webadb/backer/1/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/ya-webadb/backer/2/website?requireActive=false" target="_blank"><img src="https://opencollective.com/ya-webadb/backer/2/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/ya-webadb/backer/3/website?requireActive=false" target="_blank"><img src="https://opencollective.com/ya-webadb/backer/3/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/ya-webadb/backer/4/website?requireActive=false" target="_blank"><img src="https://opencollective.com/ya-webadb/backer/4/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/ya-webadb/backer/5/website?requireActive=false" target="_blank"><img src="https://opencollective.com/ya-webadb/backer/5/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/ya-webadb/backer/6/website?requireActive=false" target="_blank"><img src="https://opencollective.com/ya-webadb/backer/6/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/ya-webadb/backer/7/website?requireActive=false" target="_blank"><img src="https://opencollective.com/ya-webadb/backer/7/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/ya-webadb/backer/8/website?requireActive=false" target="_blank"><img src="https://opencollective.com/ya-webadb/backer/8/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/ya-webadb/backer/9/website?requireActive=false" target="_blank"><img src="https://opencollective.com/ya-webadb/backer/9/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/ya-webadb/backer/10/website?requireActive=false" target="_blank"><img src="https://opencollective.com/ya-webadb/backer/10/avatar.svg?requireActive=false"></a>

## Used open-source projects

-   [ADB](https://android.googlesource.com/platform/packages/modules/adb) from Google ([Apache License 2.0](./adb.NOTICE))
-   [Scrcpy](https://github.com/Genymobile/scrcpy) from Romain Vimont ([Apache License 2.0](https://github.com/Genymobile/scrcpy/blob/master/LICENSE))
-   [Tabby](https://github.com/Eugeny/tabby) from Eugeny ([MIT License](https://github.com/Eugeny/tabby/blob/master/LICENSE))
-   [webm-muxer](https://github.com/Vanilagy/webm-muxer) from Vanilagy ([MIT License](https://github.com/Vanilagy/webm-muxer/blob/main/LICENSE))
-   [web-streams-polyfill](https://github.com/MattiasBuelens/web-streams-polyfill) from Mattias Buelens ([MIT License](https://github.com/MattiasBuelens/web-streams-polyfill/blob/master/LICENSE))
