# @yume-chan/adb-backend-webusb

Backend for `@yume-chan/adb` using WebUSB ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/USB), [Spec](https://wicg.github.io/webusb)) API.

-   [Use in browser](#use-in-browser)
-   [Use in Node.js](#use-in-nodejs)
-   [`AdbWebUsbBackend`](#adbwebusbbackend)
    -   [constructor](#constructor)
    -   [`connect`](#connect)
-   [`AdbWebUsbBackendManager`](#adbwebusbbackendmanager)
    -   [`BROWSER`](#browser)
    -   [constructor](#constructor-1)
    -   [`requestDevice`](#requestdevice)
    -   [`getDevices`](#getdevices)
-   [Note on secure context](#note-on-secure-context)

## Use in browser

| Chrome         | Edge           | Firefox | Internet Explorer | Safari |
| -------------- | -------------- | ------- | ----------------- | ------ |
| 61<sup>1</sup> | 79<sup>1</sup> | No      | No                | No     |

<sup>1</sup>: Chrome for Android is supported, Chrome for iOS is NOT supported.

## Use in Node.js

| Node.js | `usb` NPM Package |
| ------- | ----------------- |
| 10.5    | 2.8.1             |

Node.js doesn't have native support for WebUSB API, but the [`usb`](https://www.npmjs.com/package/usb) NPM package provides a WebUSB compatible API.

To use a custom WebUSB API implementation, pass it to the constructor of `AdbWebUsbBackend`, `AdbWebUsbBackendManager` and `AdbWebUsbBackendWatcher` via the `usb` parameter.

## `AdbWebUsbBackend`

### constructor

```ts
public constructor(
    device: USBDevice,
    filters: AdbDeviceFilter[] = [ADB_DEFAULT_DEVICE_FILTER]
    usb: USB
);
```

Create a new instance of `AdbWebBackend` using a specified `USBDevice` instance.

`USBDevice` and `USB` types are from WebUSB API.

The `filters` parameter specifies the `classCode`, `subclassCode` and `protocolCode` to use when searching for ADB interface. The default value is `[{ classCode: 0xff, subclassCode: 0x42, protocolCode: 0x1 }]`, defined by Google.

### `connect`

```ts
public async connect(): Promise<
    ReadableWritablePair<AdbPacketData, AdbPacketInit>
>
```

Claim the device and create a pair of `AdbPacket` streams to the ADB interface.

## `AdbWebUsbBackendManager`

A helper class that wraps the WebUSB API.

### `BROWSER`

```ts
public static readonly BROWSER: AdbWebUsbBackendManager | undefined;
```

Gets the instance of `AdbWebUsbBackendManager` using browser WebUSB implementation.

May be `undefined` if the browser does not support WebUSB.

### constructor

```ts
public constructor(usb: USB);
```

Create a new instance of `AdbWebUsbBackendManager` using the specified WebUSB API implementation.

### `requestDevice`

```ts
public async requestDevice(
    filters: AdbDeviceFilter[] = [ADB_DEFAULT_DEVICE_FILTER]
): Promise<AdbWebUsbBackend | undefined>
```

Request access to a connected device.
This is a convince method for `usb.requestDevice()`.

The `filters` parameter must have `classCode`, `subclassCode` and `protocolCode` fields for selecting the ADB interface. It can also have `vendorId`, `productId` or `serialNumber` fields to limit the displayed device list.

Returns an `AdbWebUsbBackend` instance, or `undefined` if the user cancelled the picker.

### `getDevices`

```ts
public async getDevices(
    filters: AdbDeviceFilter[] = [ADB_DEFAULT_DEVICE_FILTER]
): Promise<AdbWebUsbBackend[]>
```

Get all connected and authenticated devices.

This is a convince method for `usb.getDevices()`.

## Note on secure context

WebUSB requires a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) (HTTPS).

`localhost` is considered secure, so local development works. But to access a self-hosted server running on another machine, either add a certificate, or add the domain name to the allowlist on each client machine:

1. Open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Add the protocol and domain part of your url (e.g. `http://192.168.0.100:9000`) to the input box
3. Choose `Enable` from the dropdown menu
4. Restart browser
