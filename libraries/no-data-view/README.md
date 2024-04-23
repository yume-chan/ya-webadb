# @yume-chan/no-data-view

Plain methods to avoid creating `DataView`s.

## Why?

If you have many short `Uint8Array`s and you want to read numbers from them, creating `DataView`s for each of them is not a good idea:

Each `DataView` needs to allocate some memory, it impacts the performance, increases the memory usage, and adds GC pressure.

(If you are using `DataView`s for large `ArrayBuffer`s, it's fine)

## How does it work?

This package provides a set of methods to read/write numbers from `Uint8Array`s without creating `DataView`s.

Because they are very basic number operations, the performance between a JavaScript implementation and the native `DataView` is nearly identical.

(Except for `getBigUint64` and `setBigUint64`, Chrome uses an inefficient implementation, so this JavaScript implementation is even faster than the native one).

Check the [benchmark](./benchmark.md) for more details.

## Why there is no `setInt8`?

Assign a negative number to a `Uint8Array` will treat it as an unsigned number, so there is no need to provide a `setInt8` method.

```ts
import { getInt8 } from '@yume-chan/no-data-view';

const array = new Uint8Array(1);
array[0] = -1;
console.log(array[0]); // 255
console.log(new Int8Array(array.buffer)[0]); // -1
console.log(getInt8(array, 0)); // -1
```
