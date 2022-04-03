# @yume-chan/adb-backend-webusb

Backend for `@yume-chan/adb` using WebUSB ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/USB), [Spec](https://wicg.github.io/webusb)) API.

- [Note](#note)
- [`pickDevice`](#pickdevice)
- [`fromDevice`](#fromdevice)
- [`connect`](#connect)

## Note

WebUSB API requires [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) (basically means HTTPS).

Chrome will treat `localhost` as secure, but if you want to access a dev server running on another machine, you need to add the domain to the allowlist:

1. Open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Add the protocol and domain part of your url (e.g. `http://192.168.0.100:9000`) to the input box
3. Choose `Enable` from the dropdown menu
4. Restart your browser

## `pickDevice`

```ts
static async pickDevice(): Promise<AdbWebBackend | undefined>
```

Request browser to present a list of connected Android devices to let the user choose from.

Returns `undefined` if the user canceled the picker.

## `fromDevice`

```ts
static async fromDevice(device: USBDevice): Promise<AdbWebBackend>
```

Create an `AdbWebBackend` instance from an exist `USBDevice` instance.

## `connect`

```ts
async connect(): Promise<ReadableWritablePair<AdbPacketCore, AdbPacketInit>>
```

Connect to a device and create a pair of `AdbPacket` streams.
