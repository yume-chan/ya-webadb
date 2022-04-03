# `@yume-chan/adb-credential-web`

Generate RSA keys using Web Crypto API ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)) and store them in LocalStorage ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)).

- [`generateKey`](#generatekey)
- [`iterateKeys`](#iteratekeys)

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

Return the stored RSA private key. (This implementation doesn't support storing multiple keys)
