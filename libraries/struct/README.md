# @yume-chan/struct

<!--
cspell: ignore Codecov
cspell: ignore uint8arraystring
-->

![license](https://img.shields.io/npm/l/@yume-chan/struct)
![npm type definitions](https://img.shields.io/npm/types/@yume-chan/struct)
[![npm version](https://img.shields.io/npm/v/@yume-chan/struct)](https://www.npmjs.com/package/@yume-chan/struct)
![npm bundle size](https://img.shields.io/bundlephobia/min/@yume-chan/struct)
![Codecov](https://img.shields.io/codecov/c/github/yume-chan/ya-webadb?flag=struct&token=2fU3Cx2Edq)

A C-style structure serializer and deserializer. Written in TypeScript and highly takes advantage of its type system.

**WARNING:** The public API is UNSTABLE. If you have any questions, please open an issue.

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
    // `bazLength` automatically set to `baz`'s byte length
    baz: 'Hello, World!',
});
```

<!-- cspell: disable -->

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Compatibility](#compatibility)
  - [Basic usage](#basic-usage)
  - [`int64`/`uint64`](#int64uint64)
  - [`string`](#string)
- [API](#api)
  - [`placeholder`](#placeholder)
  - [`Struct`](#struct)
    - [`int8`/`uint8`/`int16`/`uint16`/`int32`/`uint32`](#int8uint8int16uint16int32uint32)
    - [`int64`/`uint64`](#int64uint64-1)
    - [`uint8Array`/`string`](#uint8arraystring)
    - [`fields`](#fields)
    - [`extra`](#extra)
    - [`postDeserialize`](#postdeserialize)
    - [`deserialize`](#deserialize)
    - [`serialize`](#serialize)
- [Custom field type](#custom-field-type)
  - [`Struct#field`](#structfield)
  - [Relationship between types](#relationship-between-types)
  - [`StructFieldDefinition`](#structfielddefinition)
    - [`TValue`/`TOmitInitKey`](#tvaluetomitinitkey)
    - [`getSize`](#getsize)
    - [`create`](#create)
    - [`deserialize`](#deserialize-1)
  - [`StructFieldValue`](#structfieldvalue)
    - [`getSize`](#getsize-1)
    - [`get`/`set`](#getset)
    - [`serialize`](#serialize-1)

<!-- cspell: enable -->

## Compatibility

Here is a list of features, their used APIs, and their compatibilities. If an optional feature is not actually used, its requirements can be ignored.

Some features can be polyfilled to support older runtimes, but this library doesn't ship with any polyfills.

### Basic usage

| API                              | Chrome | Edge | Firefox | Internet Explorer | Safari | Node.js |
| -------------------------------- | ------ | ---- | ------- | ----------------- | ------ | ------- |
| [`Promise`][MDN_Promise]         | 32     | 12   | 29      | No                | 8      | 0.12    |
| [`ArrayBuffer`][MDN_ArrayBuffer] | 7      | 12   | 4       | 10                | 5.1    | 0.10    |
| [`Uint8Array`][MDN_Uint8Array]   | 7      | 12   | 4       | 10                | 5.1    | 0.10    |
| [`DataView`][MDN_DataView]       | 9      | 12   | 15      | 10                | 5.1    | 0.10    |
| *Overall*                        | 32     | 12   | 29      | No                | 8      | 0.12    |

### [`int64`/`uint64`](#int64uint64-1)

| API                                | Chrome | Edge | Firefox | Internet Explorer | Safari | Node.js |
| ---------------------------------- | ------ | ---- | ------- | ----------------- | ------ | ------- |
| [`BigInt`][MDN_BigInt]<sup>1</sup> | 67     | 79   | 68      | No                | 14     | 10.4    |

<sup>1</sup> Can't be polyfilled

### [`string`](#uint8arraystring)

| API                              | Chrome | Edge | Firefox | Internet Explorer | Safari | Node.js             |
| -------------------------------- | ------ | ---- | ------- | ----------------- | ------ | ------------------- |
| [`TextEncoder`][MDN_TextEncoder] | 38     | 79   | 19      | No                | 10.1   | 8.3<sup>1</sup>, 11 |

<sup>1</sup> `TextEncoder` and `TextDecoder` are only available in `util` module. Need to be assigned to `globalThis`.

[MDN_Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
[MDN_ArrayBuffer]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
[MDN_Uint8Array]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array
[MDN_DataView]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView
[MDN_BigInt]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt
[MDN_DataView]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView
[MDN_TextEncoder]: https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder

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

To workaround this issue, these methods have an extra `_typescriptType` parameter, to let you specify a generic parameter, without passing all other generic arguments manually. The actual value of `_typescriptType` argument is never used, so you can pass any value, as long as it has the correct type, including values produced by this `placeholder` method.

**With that said, I don't expect you to specify any generic arguments manually when using this library.**

### `Struct`

```ts
class Struct<
    TFields extends object = {},
    TOmitInitKey extends string | number | symbol = never,
    TExtra extends object = {},
    TPostDeserialized = undefined
> {
    public constructor(options: Partial<StructOptions> = StructDefaultOptions);
}
```

Creates a new structure definition.

<details>
<summary>Generic parameters (click to expand)</summary>

This information was added to help you understand how does it work. These are considered as "internal state" so don't specify them manually.

1. `TFields`: Type of the Struct value. Modified when new fields are added.
2. `TOmitInitKey`: When serializing a structure containing variable length buffers, the length field can be calculate from the buffer field, so they doesn't need to be provided explicitly.
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
    TFields & Record<TName, TTypeScriptType>,
    TOmitInitKey,
    TExtra,
    TPostDeserialized
>;
```

Appends an `int8`/`uint8`/`int16`/`uint16`/`int32`/`uint32` field to the `Struct`.

<details>
<summary>Generic parameters (click to expand)</summary>

1. `TName`: Literal type of the field's name.
2. `TTypeScriptType = number`: Type of the field in the result object. For example you can declare it as a number literal type, or some enum type.
</details>

**Parameters**

1. `name`: (Required) Field name. Must be a string literal.
2. `_typescriptType`: Set field's type. See examples below.

**Note**

There is no generic constraints on the `TTypeScriptType`, because TypeScript doesn't allow casting enum types to `number`.

So it's technically possible to pass in an incompatible type (e.g. `string`). But obviously, it's a bad idea.

**Examples**

1. Append an `int32` field named `foo`

    ```ts
    const struct = new Struct()
        .int32('foo');

    const value = await struct.deserialize(stream);
    value.foo; // number

    struct.serialize({ }) // error: 'foo' is required
    struct.serialize({ foo: 'bar' }) // error: 'foo' must be a number
    struct.serialize({ foo: 42 }) // ok
    ```

2. Set fields' type (can be used with [`placeholder` method](#placeholder))

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

    struct.serialize({ foo: 42, bar: MyEnum.a }); // error: 'foo' must be of type `MyEnum`
    struct.serialize({ foo: MyEnum.a, bar: MyEnum.b }); // error: 'bar' must be of type `MyEnum.a`
    struct.serialize({ foo: MyEnum.a, bar: MyEnum.b }); // ok
    ```

#### `int64`/`uint64`

```ts
int64<
    TName extends string | number | symbol,
    TTypeScriptType = bigint
>(
    name: TName,
    _typescriptType?: TTypeScriptType
): Struct<
    TFields & Record<TName, TTypeScriptType>,
    TOmitInitKey,
    TExtra,
    TPostDeserialized
>;
```

Appends an `int64`/`uint64` field to the `Struct`. The usage is same as `uint32`/`uint32`.

Requires native support for `BigInt`. Check [compatibility table](#compatibility) for more information.

#### `uint8Array`/`string`

```ts
uint8Array<
    TName extends string | number | symbol,
    TTypeScriptType = ArrayBuffer
>(
    name: TName,
    options: FixedLengthBufferLikeFieldOptions,
    _typescriptType?: TTypeScriptType,
): Struct<
    TFields & Record<TName, TTypeScriptType>,
    TOmitInitKey,
    TExtra,
    TPostDeserialized
>;

uint8Array<
    TName extends string | number | symbol,
    TLengthField extends LengthField<TFields>,
    TOptions extends VariableLengthBufferLikeFieldOptions<TFields, TLengthField>,
    TTypeScriptType = ArrayBuffer,
>(
    name: TName,
    options: TOptions,
    _typescriptType?: TTypeScriptType,
): Struct<
    TFields & Record<TName, TTypeScriptType>,
    TOmitInitKey | TLengthField,
    TExtra,
    TPostDeserialized
>;
```

Appends an `uint8Array`/`string` field to the `Struct`.

The `options` parameter defines its length, it can be in two formats:

* `{ length: number }`: Presence of the `length` option indicates that it's a fixed length array.
* `{ lengthField: string; lengthFieldRadix?: number }`: Presence of the `lengthField` option indicates it's a variable length array. The `lengthField` options must refers to a `number` or `string` (can't be `bigint`) typed field that's already defined in this `Struct`. If the length field is a `string`, the optional `lengthFieldRadix` option (defaults to `10`) defines the radix when converting the string to a number. When deserializing, it will use that field's value as its length. When serializing, it will write its length to that field.

#### `fields`

```ts
fields<
    TOther extends Struct<any, any, any, any>
>(
    other: TOther
): Struct<
    TFields & TOther['fieldsType'],
    TOmitInitKey | TOther['omitInitType'],
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

    const structV2 = await MyStructV2.deserialize(stream);
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

    const structV2 = await MyStructV2.deserialize(stream);
    structV2.field1; // number
    structV2.field2; // number
    // Same result as above, but serialize/deserialize order is reversed
    ```

#### `extra`

```ts
extra<
    T extends Record<
        Exclude<
            keyof T,
            Exclude<
                keyof T,
                keyof TFields
            >
        >,
        never
    >
>(
    value: T & ThisType<Overwrite<Overwrite<TExtra, T>, TFields>>
): Struct<
    TFields,
    TInit,
    Overwrite<TExtra, T>,
    TPostDeserialized
>;
```

Adds extra fields into the `Struct`. Extra fields will be defined on prototype of each Struct values, so they don't affect serialize and deserialize process, and deserialized fields will overwrite extra fields.

Multiple calls merge all extra fields together.

**Generic Parameters**

1. `T`: Type of the extra fields. The scary looking generic constraint is used to forbid overwriting any already existed fields.

**Parameters**

1. `value`: An object containing anything you want to add to Struct values. Accessors and methods are also allowed.

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

    struct.serialize({ foo: 42 }); // ok
    struct.serialize({ foo: 42, bar: 'hello' }); // error: 'bar' is redundant
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
postDeserialize(): Struct<TFields, TOmitInitKey, TExtra, undefined>;
```

Remove any registered post-deserialization callback.

```ts
postDeserialize(
    callback: (this: TFields, object: TFields) => never
): Struct<TFields, TOmitInitKey, TExtra, never>;
postDeserialize(
    callback: (this: TFields, object: TFields) => void
): Struct<TFields, TOmitInitKey, TExtra, undefined>;
```

Registers (or replaces) a custom callback to be run after deserialized.

`this` in `callback`, along with the first parameter `object` will both be the deserialized Struct value.

A callback returning `never` (always throws errors) will change the return type of `deserialize` to `never`.

A callback returning `void` means it modify the result object in-place (or doesn't modify it at all), so `deserialize` will still return the result object.

```ts
postDeserialize<TPostSerialize>(
    callback: (this: TFields, object: TFields) => TPostSerialize
): Struct<TFields, TOmitInitKey, TExtra, TPostSerialize>;
```

Registers (or replaces) a custom callback to be run after deserialized.

A callback returning anything other than `undefined` will cause `deserialize` to return that value instead.

**Generic Parameters**

1. `TPostSerialize`: Type of the new result.

**Parameters**

1. `callback`: An function contains the custom logic to be run, optionally returns a new result. Or `undefined`, to remove any previously set `postDeserialize` callback.

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
    value.foo // error: not exist
    value.bar; // number
    ```

#### `deserialize`

```ts
interface StructDeserializeStream {
    /**
     * Read data from the underlying data source.
     *
     * The stream must return exactly `length` bytes or data. If that's not possible
     * (due to end of file or other error condition), it must throw an error.
     */
    read(length: number): Uint8Array;
}

interface StructAsyncDeserializeStream {
    /**
     * Read data from the underlying data source.
     *
     * The stream must return exactly `length` bytes or data. If that's not possible
     * (due to end of file or other error condition), it must throw an error.
     */
    read(length: number): Promise<Uint8Array>;
}

deserialize(
    stream: StructDeserializeStream,
): TPostDeserialized extends undefined
    ? Overwrite<TExtra, TValue>
    : TPostDeserialized
>;
deserialize(
    stream: StructAsyncDeserializeStream,
): Promise<
    TPostDeserialized extends undefined
        ? Overwrite<TExtra, TValue>
        : TPostDeserialized
    >
>;
```

Deserialize a struct value from `stream`.

It will be synchronous (returns a value) or asynchronous (returns a `Promise`) depending on the type of `stream`.

As the signature shows, if the `postDeserialize` callback returns any value, `deserialize` will return that value instead.

The `read` method of `stream`, when being called, should returns exactly `length` bytes of data (or throw an `Error` if it can't).

#### `serialize`

```ts
serialize(init: Evaluate<Omit<TFields, TOmitInitKey>>): Uint8Array;
serialize(init: Evaluate<Omit<TFields, TOmitInitKey>>, output: Uint8Array): number;
```

Serialize a struct value into an `Uint8Array`.

If an `output` is given, it will serialize the struct into it, and returns the number of bytes written.

## Custom field type

It's also possible to create your own field types.

### `Struct#field`

```ts
field<
    TName extends string | number | symbol,
    TDefinition extends StructFieldDefinition<any, any, any>
>(
    name: TName,
    definition: TDefinition
): Struct<
    TFields & Record<TName, TDefinition['TValue']>,
    TOmitInitKey | TDefinition['TOmitInitKey'],
    TExtra,
    TPostDeserialized
>;
```

Appends a `StructFieldDefinition` to the `Struct`.

All built-in field type methods are actually aliases to it. For example, calling

```ts
struct.int8('foo')
```

is same as

```ts
struct.field(
    'foo',
    new NumberFieldDefinition(
        NumberFieldType.Int8
    )
)
```

### Relationship between types

* `StructFieldValue`: Contains value of a field, with optional metadata and accessor methods.
* `StructFieldDefinition`: Definition of a field, can deserialize `StructFieldValue`s from a stream or create them from exist values.
* `StructValue`: A map between field names and `StructFieldValue`s.
* `Struct`: Definiton of a struct, a map between field names and `StructFieldDefintion`s. May contain extra metadata.
* Result of `Struct#deserialize()`: A map between field names and results of `StructFieldValue#get()`.

### `StructFieldDefinition`

```ts
abstract class StructFieldDefinition<
    TOptions = void,
    TValue = unknown,
    TOmitInitKey extends PropertyKey = never,
> {
    public readonly options: TOptions;

    public constructor(options: TOptions);
}
```

A field definition defines how to deserialize a field.

It's an `abstract` class, means it can't be constructed (`new`ed) directly. It's only used as a base class for other field types.

#### `TValue`/`TOmitInitKey`

These two fields provide type information to TypeScript compiler. Their values will always be `undefined`, but having correct types is enough. You don't need to touch them.

#### `getSize`

```ts
abstract getSize(): number;
```

Derived classes must implement this method to return size (or minimal size if it's dynamic) of this field.

Actual size should be returned from `StructFieldValue#getSize`

#### `create`

```ts
abstract create(
    options: Readonly<StructOptions>,
    struct: StructValue,
    value: TValue,
): StructFieldValue<this>;
```

Derived classes must implement this method to create its own field value instance for the current definition.

`Struct#serialize` will call this method, then call `StructFieldValue#serialize` to serialize one field value.

#### `deserialize`

```ts
abstract deserialize(
    options: Readonly<StructOptions>,
    stream: StructDeserializeStream,
    struct: StructValue,
): StructFieldValue<this>;
abstract deserialize(
    options: Readonly<StructOptions>,
    stream: StructAsyncDeserializeStream,
    struct: StructValue,
): Promise<StructFieldValue<this>>;
```

Derived classes must implement this method to define how to deserialize a value from `stream`.

It must be synchronous (returns a value) or asynchronous (returns a `Promise`) depending on the type of `stream`.

Usually implementations should be:

1. Read required bytes from `stream`
2. Parse it to your type
3. Pass the value into your own `create` method

Sometimes, extra metadata is present when deserializing, but need to be calculated when serializing, for example a UTF-8 encoded string may have different length between itself (character count) and serialized form (byte length). So `deserialize` can save those metadata on the `StructFieldValue` instance for later use.

### `StructFieldValue`

```ts
abstract class StructFieldValue<
    TDefinition extends StructFieldDefinition<any, any, any>
>
```

A field value defines how to serialize a field.

#### `getSize`

```ts
getSize(): number;
```

Gets size of this field. By default, it returns its `definition`'s size.

If this field's size can change based on some criteria, one must override `getSize` to return its actual size.

#### `get`/`set`

```ts
get(): TDefinition['TValue'];
set(value: TDefinition['TValue']): void;
```

Defines how to get or set this field's value. By default, it reads/writes its `value` field.

If one needs to manipulate other states when getting/setting values, they can override these methods.

#### `serialize`

```ts
abstract serialize(
    dataView: DataView,
    offset: number
): void;
```

Derived classes must implement this method to serialize current value into `dataView`, from `offset`. It must not write more bytes than what its `getSize` returned.
