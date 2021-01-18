# @yume-chan/struct

![license](https://img.shields.io/npm/l/@yume-chan/struct)
![npm type definitions](https://img.shields.io/npm/types/@yume-chan/struct)
[![npm version](https://img.shields.io/npm/v/@yume-chan/struct)](https://www.npmjs.com/package/@yume-chan/struct)
![npm bundle size](https://img.shields.io/bundlephobia/min/@yume-chan/struct)
![Codecov](https://img.shields.io/codecov/c/github/yume-chan/ya-webadb?flag=struct&token=2fU3Cx2Edq)

A C-style structure serializer and deserializer. Written in TypeScript and highly takes advantage of its type system.

## Installation

```sh
$ npm i @yume-chan/struct
```

## Quick Start

```ts
import Struct from '@yume-chan/struct';

const MyStruct =
    new Struct({ littleEndian: true })
        .int8('foo')
        .int64('bar')
        .int32('bazLength')
        .string('baz', { lengthField: 'bazLength' });

const value = await MyStruct.deserialize(stream);
value.foo // number
value.bar // bigint
value.bazLength // number
value.baz // string

const buffer = MyStruct.serialize({
    foo: 42,
    bar: 42n,
    // `bazLength` automatically set to `baz.length`
    baz: 'Hello, World!',
});
```

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Compatibility](#compatibility)
- [API](#api)
  - [`placeholder`](#placeholder)
  - [`Struct`](#struct)
    - [`int8`/`uint8`/`int16`/`uint16`/`int32`/`uint32`](#int8uint8int16uint16int32uint32)
    - [`int64`/`uint64`](#int64uint64)
    - [`arraybuffer`/`uint8ClampedArray`/`string`](#arraybufferuint8clampedarraystring)
    - [`fields`](#fields)
    - [`deserialize`](#deserialize)
    - [`serialize`](#serialize)
    - [`extra`](#extra)
    - [`postDeserialize`](#postdeserialize)
- [Custom field type](#custom-field-type)
  - [`Struct#field` method](#structfield-method)
  - [`StructFieldDefinition`](#structfielddefinition)
    - [`getSize`](#getsize)
    - [`deserialize`](#deserialize-1)
    - [`createValue`](#createvalue)
  - [`StructFieldValue`](#structfieldvalue)

## Compatibility

Basic usage requires [`Promise`][MDN_Promise], [`ArrayBuffer`][MDN_ArrayBuffer], [`Uint8Array`][MDN_Uint8Array] and [`DataView`][MDN_DataView]. All can be globally polyfilled to support older runtime.

[MDN_Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
[MDN_ArrayBuffer]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
[MDN_Uint8Array]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array
[MDN_DataView]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView

| Runtime               | Minimal Supported Version | Note                            |
| --------------------- | ------------------------- | ------------------------------- |
| **Chrome**            | 32                        |                                 |
| **Edge**              | 12                        |                                 |
| **Firefox**           | 29                        |                                 |
| **Internet Explorer** | 10                        | Requires polyfill for `Promise` |
| **Safari**            | 8                         |                                 |
| **Node.js**           | 0.12                      |                                 |

Use of `int64`/`uint64` requires [`BigInt`][MDN_BigInt] (**can't** be polyfilled), [`DataView#getBigUint64`][MDN_DataView_getBigUint64] and [`DataView#setBigUint64`][MDN_DataView_setBigUint64] (can be polyfilled).

[MDN_BigInt]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt
[MDN_DataView_getBigUint64]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView/getBigUint64
[MDN_DataView_setBigUint64]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView/setBigUint64

| Runtime               | Minimal Supported Version | Note                                                                   |
| --------------------- | ------------------------- | ---------------------------------------------------------------------- |
| **Chrome**            | 67                        |                                                                        |
| **Edge**              | 79                        |                                                                        |
| **Firefox**           | 68                        |                                                                        |
| **Internet Explorer** | *N/A*                     | Doesn't support `BigInt`, can't be polyfilled.                         |
| **Safari**            | 14                        | Requires polyfills for `DataView#getBigUint64`/`DataView#setBigUint64` |
| **Node.js**           | 10.4.0                    |                                                                        |

## API

### `placeholder`

```ts
function placeholder<T>(): T {
    return undefined as unknown as T;
}
```

Returns a (fake) value of the given type. It's only useful in TypeScript, if you are using JavaScript, you shouldn't care about it.

Many methods in this library have multiple generic parameters, but TypeScript only allows users to specify none (let TypeScript inference all of them from arguments), or all generic arguments. ([Microsoft/TypeScript#26242](https://github.com/microsoft/TypeScript/issues/26242))

<details>
<summary>Detail explanation (click to expand)</summary>

When you have a generic method, where half generic parameters can be inferred.

```ts
declare function fn<A, B>(a: A): [A, B];
fn(42); // Expected 2 type arguments, but got 1. ts(2558)
```

Rather than force users repeat the type `A`, I declare a parameter for `B`.

```ts
declare function fn2<A, B>(a: A, b: B): [A, B];
```

I don't really need a value of type `B`, I only require its type information

```ts
fn2(42, placeholder<boolean>()) // fn2<number, boolean>
```
</details>

To workaround this issue, these methods have an extra `_typescriptType` parameter, to let you specify a generic parameter, without pass all other generic arguments manually. The actual value of `_typescriptType` argument is never used, so you can pass any value, as long as it has the correct type, including values produced by this `placeholder` method.

**With that said, I don't expect you to specify any generic arguments manually when using this library.**

### `Struct`

```ts
class Struct<
    TValue extends object = {},
    TInit extends object = {},
    TExtra extends object = {},
    TPostDeserialized = undefined
> {
    public constructor(options: Partial<StructOptions> = StructDefaultOptions);
}
```

Creates a new structure declaration.

<details>
<summary>Generic parameters (click to expand)</summary>

This information was added to help you understand how does it work. These are considered as "internal state" so don't specify them manually.

1. `TValue`: Type of the Struct value. Modified when new fields are added.
2. `TInit`: Type requirement to create such a structure. (May not be same as `TValue` because some fields can implies others). Modified when new fields are added.
3. `TExtra`: Type of extra fields. Modified when `extra` is called.
4. `TPostDeserialized`: State of the `postDeserialize` function. Modified when `postDeserialize` is called. Affects return type of `deserialize`
</details>

**Parameters**

1. `options`:
   * `littleEndian:boolean = false`: Whether all multi-byte fields in this struct are [little-endian encoded][Wikipeida_Endianess].

[Wikipeida_Endianess]: https://en.wikipedia.org/wiki/Endianness

#### `int8`/`uint8`/`int16`/`uint16`/`int32`/`uint32`

```ts
int32<
    TName extends string | number | symbol,
    TTypeScriptType = number
>(
    name: TName,
    _typescriptType?: TTypeScriptType
): Struct<
    Evaluate<TValue & Record<TName, TTypeScriptType>>,
    Evaluate<TInit & Record<TName, TTypeScriptType>>,
    TExtra,
    TPostDeserialized
>;
```

Appends an `int8`/`uint8`/`int16`/`uint16`/`int32`/`uint32` field to the `Struct`

**Generic Parameters**

1. `TName`: Literal type of the field's name.
2. `TTypeScriptType = number`: Type of the field in the result object. For example you can declare it as a number literal type, or some enum type.

**Parameters**

1. `name`: (Required) Field name. Should be a string literal to make types work.
2. `_typescriptType`: Set field's type. See examples below.

**Note**

There is no generic constraints on the `TTypeScriptType` type because TypeScript doesn't allow casting enum types to `number`.

So it's technically possible to pass in an incompatible type (e.g. `string`). But obviously, it's a bad idea.

**Examples**

1. Append an `int32` field named `foo`

    ```ts
    const struct = new Struct()
        .int32('foo');

    const value = await struct.deserialize(stream);
    value.foo; // number

    struct.serialize({ }, context) // error: 'foo' is required
    struct.serialize({ foo: 'bar' }, context) // error: 'foo' must be a number
    struct.serialize({ foo: 42 }, context) // ok
    ```

2. Set `foo`'s type (can be used with [`placeholder` method](#placeholder))

    ```ts
    enum MyEnum {
        a,
        b,
    }

    const struct = new Struct()
        .int32('foo', placeholder<MyEnum>())
        .int32('bar', MyEnum.a as const);

    const value = await struct.deserialize(stream);
    value.foo; // MyEnum
    value.bar; // MyEnum.a

    struct.serialize({ foo: 42, bar: MyEnum.a }, context); // error: 'foo' must be of type `MyEnum`
    struct.serialize({ foo: MyEnum.a, bar: MyEnum.b }, context); // error: 'bar' must be of type `MyEnum.a`
    struct.serialize({ foo: MyEnum.a, bar: MyEnum.b }, context); // ok
    ```

#### `int64`/`uint64`

```ts
int64<
    TName extends PropertyKey,
    TTypeScriptType = bigint
>(
    name: TName,
    _typescriptType?: TTypeScriptType
): Struct<
    Evaluate<TValue & Record<TName, TTypeScriptType>>,
    Evaluate<TInit & Record<TName, TTypeScriptType>>,
    TExtra,
    TPostDeserialized
>;
```

Appends an `int64`/`uint64` field to the `Struct`.

Requires native runtime support for `BigInt`. Check [compatibility table](#compatibility) for more information.

#### `arraybuffer`/`uint8ClampedArray`/`string`

```ts
<
    TName extends PropertyKey,
    TTypeScriptType = TType['valueType'],
>(
    name: TName,
    options: FixedLengthArrayBufferLikeFieldOptions,
    typescriptType?: TTypeScriptType,
): AddFieldDescriptor<
    TValue,
    TInit,
    TExtra,
    TPostDeserialized,
    TName,
    FixedLengthArrayBufferLikeFieldDefinition<
        TType,
        FixedLengthArrayBufferLikeFieldOptions
    >
>;

<
    TName extends PropertyKey,
    TLengthField extends KeysOfType<TInit, number | string>,
    TOptions extends VariableLengthArrayBufferLikeFieldOptions<TInit, TLengthField>,
    TTypeScriptType = TType['valueType'],
>(
    name: TName,
    options: TOptions,
    typescriptType?: TTypeScriptType,
): AddFieldDescriptor<
    TValue,
    TInit,
    TExtra,
    TPostDeserialized,
    TName,
    VariableLengthArrayBufferLikeFieldDefinition<
        TType,
        TOptions
    >
>;
```

Appends an array type field to the `Struct`. The second, `options` parameter defines its length in byte.

* `{ length: number }`: When the `length` option is specified, it's a fixed length array.
* `{ lengthField: string }`: When the `lengthField` option is specified, and pointing to another `number` or `string` typed field that's defined before this one, it's a variable length array. It will use that field's value for its length when deserializing, and write its length to that field when serializing.

All these three are deserialized as `ArrayBuffer`, then converted to `Uint8ClampedArray` or `string` for ease of use.

#### `fields`

```ts
fields<
    TOther extends Struct<any, any, any, any>
>(
    other: TOther
): Struct<
    TValue & TOther['valueType'],
    TInit & TOther['initType'],
    TExtra & TOther['extraType'],
    TPostDeserialized
>;
```

Merges (flats) another `Struct`'s fields and extra fields into the current one.

**Examples**

1. Extending another `Struct`

    ```ts
    const MyStructV1 =
        new Struct()
            .int32('field1');

    const MyStructV2 =
        new Struct()
            .fields(MyStructV1)
            .int32('field2');

    const structV2 = await MyStructV2.deserialize(context);
    structV2.field1; // number
    structV2.field2; // number
    // Fields are flatten
    ```

2. Also possible in any order

    ```ts
    const MyStructV1 =
        new Struct()
            .int32('field1');

    const MyStructV2 =
        new Struct()
            .int32('field2')
            .fields(MyStructV1);

    const structV2 = await MyStructV2.deserialize(context);
    structV2.field1; // number
    structV2.field2; // number
    // Same result as above, but serialize/deserialize order is reversed
    ```

#### `deserialize`

```ts
export interface StructDeserializationContext {
    decodeUtf8(buffer: ArrayBuffer): string;

    read(length: number): ArrayBuffer | Promise<ArrayBuffer>;
}

deserialize(context: StructDeserializationContext): Promise<TPostDeserialized extends undefined ? Overwrite<TExtra, TValue> : TPostDeserialized>;
```

Deserialize a Struct value from `context`.

As you can see, if your `postDeserialize` callback returns something, that value will be returned by `deserialize`.

The `context` has a `read` method, that when called, should returns exactly `length` bytes of data (or throw an `Error` if it can't). So data can arrive asynchronously.

#### `serialize`

```ts
interface StructSerializationContext {
    encodeUtf8(input: string): ArrayBuffer;
}

serialize(init: TInit, context: StructSerializationContext): ArrayBuffer;
```

Serialize a Struct value into an `ArrayBuffer`.

#### `extra`

```ts
extra<
    T extends Record<
        Exclude<
            keyof T,
            Exclude<
                keyof T,
                keyof TValue
            >
        >,
        never
    >
>(
    value: T & ThisType<Overwrite<Overwrite<TExtra, T>, TValue>>
): Struct<
    TValue,
    TInit,
    Overwrite<TExtra, T>,
    TPostDeserialized
>;
```

Adds some extra fields into every Struct value.

Extra fields will not affect serialize or deserialize process.

Multiple calls to `extra` will merge all values together.

See examples below.

**Generic Parameters**

1. `T`: Type of the extra fields. The scary looking generic constraint is used to forbid overwriting any already existed fields.

**DO NOT PASS ANY GENERIC ARGUMENTS MANUALLY!**

TypeScript will infer them from arguments. See examples below.

**Parameters**

1. `value`: An object containing anything you want to add to the result object. Accessors and methods are also allowed.

**Examples**

1. Add an extra field

    ```ts
    const struct = new Struct()
        .int32('foo')
        .extra({
            bar: 'hello',
        });

    const value = await struct.deserialize(stream);
    value.foo; // number
    value.bar; // 'hello'

    struct.create({ foo: 42 }); // ok
    struct.create({ foo: 42, bar: 'hello' }); // error: 'bar' is redundant
    ```

2. Add getters and methods. `this` in functions refers to the result object.

    ```ts
    const struct = new Struct()
        .int32('foo')
        .extra({
            get bar() {
                // `this` is the result Struct value
                return this.foo + 1;
            },
            logBar() {
                // `this` also contains other extra fields
                console.log(this.bar);
            },
        });

    const value = await struct.deserialize(stream);
    value.foo; // number
    value.bar; // number
    value.logBar();
    ```

#### `postDeserialize`

```ts
postDeserialize(callback: StructPostDeserialized<TValue, never>): Struct<TValue, TInit, TExtra, never>;
postDeserialize(callback?: StructPostDeserialized<TValue, void>): Struct<TValue, TInit, TExtra, undefined>;
```

Registers (or replaces) a custom callback to be run after deserialized.

A callback returning `never` (always throw an error) will also change the return type of `deserialize` to `never`.

A callback returning `void` means it modify the result object in-place (or doesn't modify it at all), so `deserialize` will still return the result object.

```ts
postDeserialize<TPostSerialize>(callback?: StructPostDeserialized<TValue, TPostSerialize>): Struct<TValue, TInit, TExtra, TPostSerialize>;
```

Registers (or replaces) a custom callback to be run after deserialized.

A callback returning anything other than `undefined` will `deserialize` to return that object instead.

**Generic Parameters**

1. `TPostSerialize`: Type of the new result object.

**DO NOT PASS ANY GENERIC ARGUMENTS MANUALLY!**

TypeScript will infer them from arguments. See examples below.

**Parameters**

1. `callback`: An function contains the custom logic to be run, optionally returns a new result object. Or `undefined`, to clear the previously set `afterParsed` callback.

**Examples**

1. Handle an "error" packet

    ```ts
    // Say your protocol have an error packet,
    // You want to throw a JavaScript Error when received such a packet,
    // But you don't want to modify all receiving path

    const struct = new Struct()
        .int32('messageLength')
        .string('message', { lengthField: 'messageLength' })
        .postDeserialize(value => {
            throw new Error(value.message);
        });
    ```

2. Do anything you want

    ```ts
    // I think this one doesn't need any code example
    ```

3. Replace result object

    ```ts
    const struct1 = new Struct()
        .int32('foo')
        .postDeserialize(value => {
            return {
                bar: value.foo,
            };
        });

    const value = await struct.deserialize(stream);
    value.bar; // number
    ```

## Custom field type

This library has a plugin system to support adding fields with custom types.

### `Struct#field` method

```ts
field<
    TName extends PropertyKey,
    TDefinition extends StructFieldDefinition<any, any, any>
>(
    name: TName,
    definition: TDefinition
): Struct<
    Evaluate<TValue & Record<TFieldName, TDefinition['valueType']>>,
    Evaluate<Omit<TInit, TDefinition['removeFields']> & Record<TFieldName, TDefinition['valueType']>>,
    TExtra,
    TPostDeserialized
>;
```

Appends a `StructFieldDefinition` to the `Struct`.

All above built-in methods are alias of `field`. To add a field of a custom type, let users call `field` with your custom `StructFieldDefinition` implementation.

### `StructFieldDefinition`

```ts
abstract class StructFieldDefinition<TOptions = void, TValueType = unknown, TOmitInit = never> {
    readonly options: TOptions;

    constructor(options: TOptions);
}
```

A `StructFieldDefinition` describes type, size and runtime semantics of a field.

It's an `abstract` class, means it lacks some method implementations, so it shouldn't be constructed.

#### `getSize`

```ts
abstract getSize(): number;
```

Returns the size (or minimal size if it's dynamic) of this field.

Actual size should been returned from `StructFieldValue#getSize`

#### `deserialize`

```ts
abstract deserialize(
    options: Readonly<StructOptions>,
    context: StructDeserializationContext,
    object: any,
): ValueOrPromise<StructFieldValue<StructFieldDefinition<TOptions, TValueType, TRemoveInitFields>>>;
```

Defines how to deserialize a value from `context`. Can also return a `Promise`.

Usually implementations should be:

1. Somehow parse the value from `context`
2. Pass the value into `StructFieldDefinition#createValue`

Sometimes, some metadata is present when deserializing, but need to be calculated when serializing, for example a UTF-8 encoded string may have different length between itself (character count) and serialized form (byte length). So `deserialize` can save those metadata on the `StructFieldValue` instance for later use.

#### `createValue`

```ts
abstract createValue(
    options: Readonly<StructOptions>,
    context: StructSerializationContext,
    object: any,
    value: TValueType,
): StructFieldValue<StructFieldDefinition<TOptions, TValueType, TRemoveInitFields>>;
```

Similar to `deserialize`, creates a `StructFieldValue` for this instance.

The difference is `createValue` will be called when a init value was provided to create a Struct value.

### `StructFieldValue`

One `StructFieldDefinition` instance represents one field declaration, and one `StructFieldValue` instance represents one value.

It defines how to get, set, and serialize a value.
