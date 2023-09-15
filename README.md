# Tango

[![MIT license](https://img.shields.io/github/license/yume-chan/ya-webadb)](https://github.com/yume-chan/ya-webadb/blob/main/LICENSE)

A library and a Web app that allow browsers to interact with Android devices via ADB (Android Debugging Protocol).

All features work on Chrome for Android, use a C-to-C (or OTG) cable.

[🚀 Web App](https://tango-web-mu.vercel.app/) | [Old Demo](https://tango-adb.github.io/old-demo/)

## Working Modes

### Direct Connection Mode

In this mode, Google ADB is not required for this library to communicate with Android devices (in fact, Google ADB must not be running in order to use this mode).

This mode is suitable for running on end-users' devices where Google ADB is not installed, or on mobile devices where Google ADB is not available.

Before connecting, make sure to close Google ADB (Run `adb kill-server` in a terminal or close `adb.exe` from Task Manager) and all programs that may use ADB (e.g. Android Studio, Visual Studio, Godot Editor, etc.).

### Google ADB Client Mode

In this mode, this library talks to a Google ADB server, which is either running on the same machine or on a remote machine. This allows other ADB-based tools to work alongside this library.

## Compatibility

| Connection                       | Chromium-based Browsers          | Node.js                       |
| -------------------------------- | -------------------------------- | ----------------------------- |
| Direct Connection over USB cable | Supported using [WebUSB] API     | Supported using `usb` package |
| Direct Connection over TCP       | Waiting for [Direct Sockets] API | Possible using `net` module   |
| Google ADB client over TCP       | Waiting for [Direct Sockets] API | Supported using `net` module  |

[webusb]: https://wicg.github.io/webusb/
[direct sockets]: https://wicg.github.io/direct-sockets/

## API documentation

Currently the API is unstable and the documentation is lacking, but there are three sources you can refer to:

-   Each package's `README.md` file
-   The source code of old demo at https://github.com/tango-adb/old-demo (it's a React app)
-   The work-in-progress documentation site at https://tango-adb.github.io/docs/adb/installation

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
-   [web-streams-polyfill](https://github.com/MattiasBuelens/web-streams-polyfill) from Mattias Buelens ([MIT License](https://github.com/MattiasBuelens/web-streams-polyfill/blob/master/LICENSE))
