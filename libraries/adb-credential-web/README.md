# `@yume-chan/adb-credential-web`

Generate RSA keys using Web Crypto API ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)) and store them in LocalStorage ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)).

- [Constructor](#constructor)
- [`generateKey`](#generatekey)
- [`iterateKeys`](#iteratekeys)

## Constructor

```ts
public constructor(localStorageKey = "private-key");
```

Create a new instance of `AdbWebCredentialStore`.

The `localStorageKey` parameter specifies the key to use when reading and writing the private key in LocalStorage.

## `generateKey`

```ts
async generateKey(): Promise<Uint8Array>
```

Generate a RSA private key and store it into LocalStorage.

Calling this method multiple times will overwrite the previous key.

The returned `Uint8Array` is the private key in PKCS #8 format.

## `iterateKeys`

```ts
*iterateKeys(): Generator<Uint8Array, void, void>
```

Yield the stored RSA private key. `AdbWebCredentialStore` only stores one key, so only one value will be yielded.

This method returns a generator, so `for...of...` loop should be used to read the key.
