# @yume-chan/dataview-bigint-polyfill

Polyfill for `DataView#getBigInt64`, `DataView#getBigUint64`, `DataView#setBigInt64` and `DataView#setBigUint64`.

Requires native `BigInt` support.

## Flavors

It ships with 3 flavors:

### Pure: provide alternative implementations.

```ts
import { getBigInt64, getBigUint64, setBigInt64, setBigUint64 } from '@yume-chan/dataview-bigint-polyfill';

getBigInt64(dataView, byteOffset, littleEndian);
getBigUint64(dataView, byteOffset, littleEndian);
setBigInt64(dataView, byteOffset, value, littleEndian);
setBigUint64(dataView, byteOffset, value, littleEndian);
```

### Fallback: use native implementations if available.

```ts
import { getBigInt64, getBigUint64, setBigInt64, setBigUint64 } from '@yume-chan/dataview-bigint-polyfill/esm/fallback';

getBigInt64(dataView, byteOffset, littleEndian);
getBigUint64(dataView, byteOffset, littleEndian);
setBigInt64(dataView, byteOffset, value, littleEndian);
setBigUint64(dataView, byteOffset, value, littleEndian);
```

### Polyfill: patch `DataView.prototype` when native support is not available.

```ts
import '@yume-chan/dataview-bigint-polyfill/esm/polyfill.js';

dataView.getBigInt64(byteOffset, littleEndian);
dataView.getBigUint64(byteOffset, littleEndian);
dataView.setBigInt64(byteOffset, value, littleEndian);
dataView.setBigUint64(byteOffset, value, littleEndian);
```
