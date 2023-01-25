# @yume-chan/adb-backend-webusb

Backend for `@yume-chan/adb` using WebUSB ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/USB), [Spec](https://wicg.github.io/webusb)) API.

- [Note](#note)
- [Use in Node.js](#use-in-nodejs)
- [API](#api)
  - [Constructor](#constructor)
  - [`isSupported()`](#issupported)
  - [`requestDevice`](#requestdevice)
  - [`connect`](#connect)

## Note

WebUSB API requires [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) (HTTPS).

Chrome will treat `localhost` as secure, but if you want to access a dev server running on another machine, follow the steps to add the domain name to allowlist:

1. Open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Add the protocol and domain part of your url (e.g. `http://192.168.0.100:9000`) to the input box
3. Choose `Enable` from the dropdown menu
4. Restart browser

## Use in Node.js

Node.js doesn't support WebUSB API, but you might be able to use this package with the [`usb`](https://www.npmjs.com/package/usb) package (I didn't test this. If you have any results, please open a discussion to share with us).

All static methods will not work, but the constructor only requires an object that's structurally compatible with `USBDevice` interface. The `WebUSBDevice` class in `usb` package should satisfy this requirement.

## API

### Constructor

```ts
public constructor(
    device: USBDevice,
    filters: AdbDeviceFilter[] = [ADB_DEFAULT_DEVICE_FILTER]
);
```

Create a new instance of `AdbWebBackend` using a `USBDevice` instance you already have.

`USBDevice` type is from WebUSB API.

The `filters` parameter specifies the `classCode`, `subclassCode` and `protocolCode`  to use when searching for ADB interface. The default value is `[{ classCode: 0xff, subclassCode: 0x42, protocolCode: 0x1 }]`, defined by Google.

### `isSupported()`

```ts
public static isSupported(): boolean;
```

Check if WebUSB API is supported by the browser.

### `requestDevice`

```ts
public static async requestDevice(
    filters: AdbDeviceFilter[] = [ADB_DEFAULT_DEVICE_FILTER]
): Promise<AdbWebUsbBackend | undefined>
```

Request access to a connected device from browser. The browser will display a list of devices to the user and let them choose one.

Only available in browsers that support WebUSB API (When `isSupported()` returns `true`).

The `filters` parameter must have `classCode`, `subclassCode` and `protocolCode` fields for selecting the ADB interface. It can also have `vendorId`, `productId` or `serialNumber` fields to limit the displayed device list.

Returns an `AdbWebUsbBackend` instance, or `undefined` if the user cancelled the picker.

### `connect`

```ts
public async connect(): Promise<
    ReadableWritablePair<AdbPacketData, AdbPacketInit>
>
```

Claim the device and create a pair of `AdbPacket` streams to the ADB interface.
