# `@yume-chan/adb-credential-web`

Generate RSA keys using Web Crypto API ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)) and store them in IndexedDB ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)).

Local storage is not available in Web Workers (for example WebUSB API is supported in Chrome extension service workers), so IndexedDB is used instead.

-   [Constructor](#constructor)
-   [`generateKey`](#generatekey)
-   [`iterateKeys`](#iteratekeys)

## Constructor

```ts
public constructor();
```

Create a new instance of `AdbWebCredentialStore`.

## `generateKey`

```ts
async generateKey(): Promise<Uint8Array>
```

Generate a RSA private key and store it into LocalStorage.

Calling this method multiple times will overwrite the previous key.

The returned `Uint8Array` is the private key in PKCS #8 format.

## `iterateKeys`

```ts
async *iterateKeys(): AsyncGenerator<Uint8Array, void, void>
```

Yield the stored RSA private key. `AdbWebCredentialStore` only stores one key, so only one value will be yielded.

This method returns a generator, so `for await...of...` loop should be used to read the key.
