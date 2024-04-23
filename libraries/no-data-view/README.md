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

(Assigning a number to `Uint8Array` directly translates to byte storing CPU instruction so it's very fast)

In fact, `setIntXX` and `setUintXX` is the same method, they are both provided only for consistency.

```ts
import { getInt8 } from "@yume-chan/no-data-view";

const array = new Uint8Array(1);
array[0] = -1;
console.log(array[0]); // 255
console.log(new Int8Array(array.buffer)[0]); // -1
console.log(getInt8(array, 0)); // -1
```

## Why `setIntXX` doesn't need `& 0xFF`?

Similarly, `Uint8Array` only stores the lowest 8 bits of a number, so there is no need to mask the number.

```ts
const array = new Uint8Array(2);
array[0] = 0x1234;
console.log(array[0]); // 52 (0x34)
console.log(array[1]); // 0
```

## But why `setBigUint64` have `& 0xFFn`?

Because `BigInt` can contain a super huge value, that even when shifted to the right, is still not representable by `Number`. So they must be masked with `0xFFn` before converting to `Number`.

(Converting between `BigInt` and `Number` has very little performance impact, because they only need one number extension or truncation CPU instruction)

```ts
const value = (BigInt(Number.MAX_SAFE_INTEGER) + 2n) << 8n;
console.log((value >> 8n) & 0xffn); // 1n
console.log(Number(value >> 8n) & 0xff); // 0
```
