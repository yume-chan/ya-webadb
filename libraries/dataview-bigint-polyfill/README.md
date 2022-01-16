# @yume-chan/dataview-bigint-polyfill

Polyfill for `DataView#getBigInt64`, `DataView#getBigUint64`, `DataView#setBigInt64` and `DataView#setBigUint64`.

Requires native `BigInt` support.

## Import functions

```ts
import { getBigInt64, getBigUint64, setBigInt64, setBigUint64 } from '@yume-chan/dataview-bigint-polyfill';

getBigInt64(dataView, byteOffset, littleEndian);
getBigUint64(dataView, byteOffset, littleEndian);
setBigInt64(dataView, byteOffset, value, littleEndian);
setBigUint64(dataView, byteOffset, value, littleEndian);
```

## Polyfill `DataView`

```ts
import '@yume-chan/dataview-bigint-polyfill/esm/polyfill.js';
```
