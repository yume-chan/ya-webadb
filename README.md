
github pages 不能识别下划线开头的文件
使用sphinx创建的文档，资源文件夹前面会带着下划线，本地使用没有问题，提交到github上面，想使用github pages的时候提示404，原因为github pages的jekyll模版会忽略下划线开头的文件，所以要禁用jekyll 禁用方法就是在项目根目录下添加一个空白文件，命名为：.nojekyll

使用步骤
1. rush install
2. rush update
3. rush rebuild

# Tango

[![GitHub license](https://img.shields.io/github/license/yume-chan/ya-webadb)](https://github.com/yume-chan/ya-webadb/blob/main/LICENSE)

A library and application for browsers to interact with Android devices via ADB.

All features are working on Chrome for Android, use a C-to-C cable or run WebSockify in Termux to connect.

[🚀 Online Demo](https://yume-chan.github.io/ya-webadb)

For USB connection, close Google ADB (Run `adb kill-server` in a terminal or close `adb.exe` from Task Manager) and all programs that may use ADB (e.g. Android Studio, Visual Studio, Godot Editor, etc.) before connecting.

## Compatibility

| Connection                                | Chromium-based Browsers        | Firefox   | Node.js                       |
| ----------------------------------------- | ------------------------------ | --------- | ----------------------------- |
| USB cable                                 | Supported using [WebUSB] API   | No        | Supported using `usb` package |
| Wireless through [WebSocket] <sup>1</sup> | Supported                      | Supported | Possible using `ws` package   |
| Wireless through TCP                      | WIP using [Direct Sockets] API | No        | Possible using `net` module   |

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

## Used open-source projects

-   [ADB](https://android.googlesource.com/platform/packages/modules/adb) from Google ([Apache License 2.0](./adb.NOTICE))
-   [Scrcpy](https://github.com/Genymobile/scrcpy) from Romain Vimont ([Apache License 2.0](https://github.com/Genymobile/scrcpy/blob/master/LICENSE))
-   [Tabby](https://github.com/Eugeny/tabby) from Eugeny ([MIT License](https://github.com/Eugeny/tabby/blob/master/LICENSE))
-   [webm-muxer](https://github.com/Vanilagy/webm-muxer) from Vanilagy ([MIT License](https://github.com/Vanilagy/webm-muxer/blob/main/LICENSE))
-   [web-streams-polyfill](https://github.com/MattiasBuelens/web-streams-polyfill) from Mattias Buelens ([MIT License](https://github.com/MattiasBuelens/web-streams-polyfill/blob/master/LICENSE))
