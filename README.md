# 📱 Android Debug Bridge (ADB) for Web Browsers

[![GitHub license](https://img.shields.io/github/license/yume-chan/ya-webadb)](https://github.com/yume-chan/ya-webadb/blob/master/LICENSE)

Manipulate Android devices from any (supported) web browsers, even from another Android device.

[🚀 Online Demo](https://yume-chan.github.io/ya-webadb)

## Compatibility

| Connection                            | Chromium-based Browsers                    | Firefox | Node.js  |
| ------------------------------------- | ------------------------------------------ | ------- | -------- |
| USB cable                             | Yes via [WebUSB]                           | No      | Possible |
| Wireless via [WebSocket] <sup>1</sup> | Yes                                        | Yes     | Possible |
| Wireless via TCP                      | Possible via [Direct Sockets] <sup>2</sup> | No      | Possible |

[WebUSB]: https://wicg.github.io/webusb/
[WebSocket]: https://websockets.spec.whatwg.org/
[Direct Sockets]: https://wicg.github.io/raw-sockets/

<sup>1</sup> Requires WebSockify softwares, see [instruction](https://github.com/yume-chan/ya-webadb/discussions/245#discussioncomment-384030) for detail.

<sup>2</sup> Under developemnt. Requires Chrome Canary (excluding Chrome for Android) and adding page URL to `chrome://flags/#restricted-api-origins`

## Security concerns

Accessing USB devices (especially your phone) directly from a web page can be **very dangerous**. Firefox developers even refused to implement the WebUSB standard because they [considered it to be **harmful**](https://mozilla.github.io/standards-positions/#webusb).

## Features

* 📁 File Management
  * 📋 List
  * ⬆ Upload
  * ⬇ Download
  * 🗑 Delete
* 📷 Screen Capture
* 📜 Interactiv Shell
* ⚙ Enable ADB over WiFi
* 📦 Install APK
* 🎥 [Scrcpy](https://github.com/Genymobile/scrcpy) compatible client (screen mirroring and controling device)

[📋 Project Roadmap](https://github.com/yume-chan/ya-webadb/issues/348)

## Contribute

See [CONTRIBUTE.md](./CONTRIBUTE.md)

## Credits

* Google for [ADB](https://android.googlesource.com/platform/packages/modules/adb) ([Apache License 2.0](./adb.NOTICE))
* Romain Vimont for [Scrcpy](https://github.com/Genymobile/scrcpy) ([Apache License 2.0](https://github.com/Genymobile/scrcpy/blob/master/LICENSE))
