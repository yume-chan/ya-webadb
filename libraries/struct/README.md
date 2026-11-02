# @yume-chan/struct

<!--
cspell: ignore Codecov
-->

![license](https://img.shields.io/npm/l/@yume-chan/struct)
![npm type definitions](https://img.shields.io/npm/types/@yume-chan/struct)
[![npm version](https://img.shields.io/npm/v/@yume-chan/struct)](https://www.npmjs.com/package/@yume-chan/struct)
![npm bundle size](https://img.shields.io/bundlephobia/min/@yume-chan/struct)
![Codecov](https://img.shields.io/codecov/c/github/yume-chan/ya-webadb?flag=struct&token=2fU3Cx2Edq)

A C-style structure serializer and deserializer. Written in TypeScript and highly takes advantage of its type system.

The new API is inspired by [TypeGPU](https://docs.swmansion.com/TypeGPU/) which improves DX and tree-shaking.

**WARNING:** The public API is UNSTABLE. Open a GitHub discussion if you have any questions.

## Installation

```sh
$ npm i @yume-chan/struct
```

## Quick Start

```ts
import { struct, u8, u16, s32, buffer, string } from "@yume-chan/struct";

const Message = struct(
    {
        a: u8,
        b: u16,
        c: s32,
        d: buffer(4), // Fixed length Uint8Array
        e: buffer("b"), // Use value of `b` as length
        f: buffer(u32), // `u32` length prefix
        g: buffer(4, {
            // Custom conversion between `Uint8Array` and other types
            convert(value: Uint8Array) {
                return value[0];
            },
            back(value: number) {
                return new Uint8Array([value, 0, 0, 0]);
            },
        }),
        h: string(64), // `string` is an alias to `buffer` with UTF-8 string conversion
    },
    { littleEndian: true },
);

// Custom reader
const reader = {
    position: 0,
    readExactly(length) {
        const slice = new Uint8Array(100).slice(
            this.position,
            this.position + length,
        );
        this.position += length;
        return slice;
    },
};

const message1 = Message.deserialize(reader); // If `reader.readExactly` is synchronous, `deserialize` is also synchronous
const message2 = await Message.deserialize(reader); // If `reader.readExactly` is asynchronous, so do `deserialize`

const buffer: Uint8Array = Message.serialize(message1);
```

## Custom field types

```ts
import { Field, AsyncExactReadable, Struct, u8 } from "@yume-chan/struct";

const MyField: Field<number, never, never> = {
    size: 4, // `0` if dynamically sized,
    dynamicSize(value: number) {
        // Optional, return dynamic size for value
        return 0;
    },
    serialize(
        value: number,
        context: { buffer: Uint8Array; index: number; littleEndian: boolean },
    ) {
        // Serialize value to `context.buffer` at `context.index`
    },
    deserialize(context: {
        reader: AsyncExactReadable;
        littleEndian: boolean;
    }) {
        // Deserialize value from `context.reader`
        return 0;
    },
};

const Message2 = struct({
    a: u8,
    b: MyField,
});
```

## Bipedal

`bipedal` is a custom async helper that allows the same code to behave synchronously or asynchronously depends on the parameters.

It's inspired by [gensync](https://github.com/loganfsmyth/gensync).

The word `bipedal` refers to animals who walk using two legs.

```ts
import { bipedal } from "@yume-chan/struct";

const fn = bipedal(function* (then, name: string | Promise<string>) {
    name = yield* then(name);
    return "Hello, " + name;
});

fn("Simon"); // "Hello, Simon"
await fn(Promise.resolve("Simon")); // "Hello, Simon"
```
