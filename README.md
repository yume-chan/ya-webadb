# Yet Another WebADB

Connect to your Android phones from everything that can run (supported) web browser, including PC, mac, and even another Android phone.

Inspired by [webadb.js](https://github.com/webadb/webadb.js), but completely rewritten.

## How does it work

Currently only the interactive shell (`adb shell`) is implemented, but I think it's the most difficult but interesting part.

WebUSB API gives JavaScript running in supported web browsers access to USB devices, including Android phones.

ADB uses a fairly simple protocol to communicate, so it's pretty easy to reimplement with JavaScript.

`adb shell`, the interactive shell, uses plain PTY protocol, and [xterm.js](https://github.com/xtermjs/xterm.js/) can handle it very well.

## Build

```shell
npm run build
```

## Run

```shell
npm start
```

And navigate to `http://localhost:8080/test.html`.

WebUSB API requires a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) (basically means HTTPS).

Chrome will treat `localhost` as one, but if you want to access test server running on another machine, you can configure you Chrome as following:

1. Open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Add the protocol and domain part of your url (e.g. `http://192.168.0.100:8080`) to the input box
3. Choose `Enable` from the dropdown menu
4. Restart your browser

## Useful links

* [ADB protocol overview](https://github.com/aosp-mirror/platform_system_core/blob/master/adb/OVERVIEW.TXT)
* [ADB commands](https://github.com/aosp-mirror/platform_system_core/blob/d7c1bc73dc5b4e43b8288d43052a8b8890c4bf5a/adb/SERVICES.TXT#L145)
