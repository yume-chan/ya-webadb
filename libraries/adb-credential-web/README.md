# `@yume-chan/adb-credential-web`

Store ADB credentials in LocalStorage.

- [`generateKey`](#generatekey)
- [`iterateKeys`](#iteratekeys)

## `generateKey`

**Web Crypto API** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API))

**Web Storage API** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API))

Generate a RSA private key and store it into LocalStorage.

## `iterateKeys`

Return the stored RSA private key. (This backend only supports a single key)
