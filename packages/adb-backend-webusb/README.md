# @yume-chan/adb-backend-webusb

Backend for `@yume-chan/adb` using WebUSB API.

- [Note](#note)
- [`pickDevice`](#pickdevice)
- [`fromDevice`](#fromdevice)
- [`read`/`write`](#readwrite)
- [`generateKey`](#generatekey)
- [`iterateKeys`](#iteratekeys)
- [`encodeUtf8`/`decodeUtf8`](#encodeutf8decodeutf8)

## Note

WebUSB API requires a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) (basically means HTTPS).

Chrome will treat `localhost` as secure, but if you want to access a dev server running on another machine, you need to add the domain to the allowlist:

1. Open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Add the protocol and domain part of your url (e.g. `http://192.168.0.100:9000`) to the input box
3. Choose `Enable` from the dropdown menu
4. Restart your browser

## `pickDevice`

```ts
static async pickDevice(): Promise<AdbWebBackend | undefined>
```

**WebUSB API** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/USB)) ([Spec](https://wicg.github.io/webusb))

Request browser to present a list of connected Android devices to let the user choose from.

Returns `undefined` if the user canceled the picker.

## `fromDevice`

```ts
static async fromDevice(device: USBDevice): Promise<AdbWebBackend>
```

**WebUSB API** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/USB)) ([Spec](https://wicg.github.io/webusb))

Create an `AdbWebBackend` instance from an exist `USBDevice` instance.

## `read`/`write`

**WebUSB API** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/USB)) ([Spec](https://wicg.github.io/webusb))

Read/write data from/to the underlying `USBDevice` instance.

## `generateKey`

**Web Crypto API** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API))

**Web Storage API** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API))

Generate a RSA private key and store it into LocalStorage.

## `iterateKeys`

Return the stored RSA private key. (This backend only supports a single key)

## `encodeUtf8`/`decodeUtf8`

Encode/decode string in UTF-8 with `TextEncoder` ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder/TextEncoder)) and `TextDecoder` ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/TextDecoder)).
