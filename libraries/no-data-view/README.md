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
