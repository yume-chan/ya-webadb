# @yume-chan/struct

C-style structure serializer and deserializer.

Fully compatible with TypeScript.

- [Quick Start](#quick-start)
- [Compatibility](#compatibility)
- [API](#api)
  - [`placeholder` method](#placeholder-method)
  - [`Struct` constructor](#struct-constructor)
  - [`Struct#fields` method](#structfields-method)
  - [`Struct#uint8`/`uint16`/`int32`/`uint32` methods](#structuint8uint16int32uint32-methods)
  - [`Struct#int64`/`uint64` methods](#structint64uint64-methods)
  - [`extra` function](#extra-function)
  - [`postDeserialize` method](#postdeserialize-method)
  - [`deserialize` method](#deserialize-method)
  - [`serialize` method](#serialize-method)
- [Custom types](#custom-types)
  - [`Struct#field` method](#structfield-method)
  - [FieldDefinition](#fielddefinition)
  - [`FieldDefinition#getSize` method](#fielddefinitiongetsize-method)
  - [`FieldDefinition#deserialize` method](#fielddefinitiondeserialize-method)
  - [`FieldDefinition#createValue` method](#fielddefinitioncreatevalue-method)
  - [FieldRuntimeValue](#fieldruntimevalue)

## Quick Start

```ts
import Struct from '@yume-chan/struct';

const MyStruct =
    new Struct({ littleEndian: true })
        .int32('foo')
        .int32('bar');

const value = await MyStruct.deserialize(someStream);
// TypeScript can infer type of the result object.
const { foo, bar } = value;

const buffer = MyStruct.serialize({ foo, bar });
```

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

Usage of `int64`/`uint64` requires [`BigInt`][MDN_BigInt] (**can't** be polyfilled), [`DataView#getBigUint64`][MDN_DataView_getBigUint64] and [`DataView#setBigUint64`][MDN_DataView_setBigUint64] (can be polyfilled).

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

### `placeholder` method

```ts
export function placeholder<T>(): T {
    return undefined as unknown as T;
}
```

Return a (fake) value of the given type.

Because TypeScript only supports supply all or none type arguments, this method allows all type parameters to be inferred from arguments.

**While all following APIs heavily rely on generic, DO NOT PASS ANY GENERIC ARGUMENTS MANUALLY!**

### `Struct` constructor

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

Creates a new structure definition.

**Generic Parameters**

1. `TValue`: Type of the Struct instance.
2. `TInit`: Type requirement to create such a structure. (May not be same as `TValue` because some fields can implies others)
3. `TExtra`: Type of extra fields.
4. `TPostDeserialized`: State of the `postDeserialize` function.

**DO NOT PASS ANY GENERIC ARGUMENTS MANUALLY!**

These are considered "internal state" of the `Struct` and will be taken care of by methods below.

**Parameters**

1. `options`:
   * `littleEndian:boolean = false`: Whether all multi-byte fields in this struct are [little-endian encoded][Wikipeida_Endianess].

[Wikipeida_Endianess]: https://en.wikipedia.org/wiki/Endianness

### `Struct#fields` method

```ts
fields<
    TOther extends Struct<any, any, any, any>
>(
    struct: TOther
): Struct<
    TValue & TOther['valueType'],
    TInit & TOther['initType'],
    TExtra & TOther['extraType'],
    TPostDeserialized
>;
```

Merges (flats) another `Struct`'s fields and extra fields into this one.

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
    // Same result, but serialize/deserialize order is reversed
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
    // Fields are flatten
    ```

### `Struct#uint8`/`uint16`/`int32`/`uint32` methods

```ts
int32<
    TName extends PropertyKey,
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

(All method signatures are same)

Appends an `uint8`/`uint16`/`int32`/`uint32` field to the `Struct`

**Generic Parameters**

1. `TName`: Literal type of the field's name.
2. `TTypeScriptType = number`: Type of the field in the result object. For example you can declare it as a number literal type, or some enum type.

**DO NOT PASS ANY GENERIC ARGUMENTS MANUALLY!**

TypeScript will infer them from arguments. See examples below.

**Parameters**

1. `name`: (Required) Field name. Should be a string literal to make types work.
2. `_typescriptType`: Set field's type. See examples below.

**Note**

There is no generic constraints on the `TTypeScriptType` type because TypeScript doesn't allow casting enum types to `number`.

So it's technically possible to pass in an incompatible type (e.g. `string`).

But obviously, it's a bad idea.

**Examples**

1. Append an int32 field named `foo`

    ```ts
    const struct = new Struct()
        .int32('foo');

    const value = await struct.deserialize(stream);
    value.foo; // number

    struct.create({ }) // error: 'foo' is required
    struct.create({ foo: 'bar' }) // error: 'foo' must be a number
    struct.create({ foo: 42 }) // ok
    ```

2. Set `foo`'s type (can be used with the [`placeholder` method](#placeholder-method))

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

    struct.create({ foo: 42, bar: MyEnum.a }); // error: 'foo' must be of type `MyEnum`
    struct.create({ foo: MyEnum.a, bar: MyEnum.b }); // error: 'bar' must be of type `MyEnum.a`
    struct.create({ foo: MyEnum.a, bar: MyEnum.b }); // ok
    ```

### `Struct#int64`/`uint64` methods

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

Requires native `BigInt` support of runtime. See [compatibility](#compatibility).

### `extra` function

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

Adds some extra fields into every Struct instance.

Extra fields will not affect serialize or deserialize process.

Multiple calls to `extra` will merge all values together.

See examples below.

**Generic Parameters**

1. `T`: Type of the extra fields. The scary looking generic constraint is used to forbid overwriting any already existed fields.

**DO NOT PASS ANY GENERIC ARGUMENTS MANUALLY!**

TypeScript will infer them from arguments. See examples below.

**Parameters**

1. `value`: An object containing anything you want to add to the result object. Accessors and methods are also allowed.

**Note**

1. If the current `Struct` already has some extra fields, it will be merged with `value`, with `value` taking precedence.

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
                // `this` contains deserialized fields
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

### `postDeserialize` method

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

### `deserialize` method

```ts
deserialize(context: StructDeserializationContext): Promise<TPostDeserialized extends undefined ? Overwrite<TExtra, TValue> : TPostDeserialized>;
```

Deserialize a Struct instance from `context`.

As you can see, if your `postDeserialize` callback returns something, that value will be returned by `deserialize`.

### `serialize` method

```ts
public serialize(init: TInit, context: StructSerializationContext): ArrayBuffer;
```

Serialize a Struct instance into an `ArrayBuffer`.

## Custom types

It also supports adding custom types.

### `Struct#field` method

```ts
field<
    TName extends PropertyKey,
    TDefinition extends FieldDefinition<any, any, any>
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

Appends a `FieldDefinition` to the `Struct.

All above built-in methods are all alias to this method.

### FieldDefinition

```ts
abstract class FieldDefinition<TOptions = void, TValueType = unknown, TRemoveFields = never> {
    readonly options: TOptions;

    constructor(options: TOptions);
}
```

A `FieldDefinition` defines its type, size, etc.

It's an `abstract` class, means it lacks some method implementations, so it shouldn't be constructed.

To create a custom type, one should create its own derived classes of `FieldDefinition` and `FieldRuntimeValue`.

The custom `FieldDefinition` then can be passed to `Struct#field` method to append such a custom type field.

### `FieldDefinition#getSize` method

```ts
abstract getSize(): number;
```

Returns the size (or minimal size if it's dynamic) of this field.

Actual size should been returned from `FieldRuntimeValue#getSize`

### `FieldDefinition#deserialize` method

```ts
abstract deserialize(
    options: Readonly<StructOptions>,
    context: StructDeserializationContext,
    object: any,
): ValueOrPromise<FieldRuntimeValue<FieldDefinition<TOptions, TValueType, TRemoveInitFields>>>;
```

Defines how to deserialize a value from `context`. Can also return a `Promise`.

Usually implementations should be:

1. Some how parse the value from `context`
2. Pass the value into `FieldDefinition#createValue`

Sometimes, some metadata is present when deserializing, but need to be calculated when serializing, for example a UTF-8 encoded string may have different length between itself (character count) and serialized form (byte length). So `deserialize` and save those metadata on the `FieldRuntimeValue` instance.

### `FieldDefinition#createValue` method

```ts
abstract createValue(
    options: Readonly<StructOptions>,
    context: StructSerializationContext,
    object: any,
    value: TValueType,
): FieldRuntimeValue<FieldDefinition<TOptions, TValueType, TRemoveInitFields>>;
```

Similar to `deserialize`, creates a `FieldRuntimeValue` for this instance.

The difference is `createValue` will be called when a init value was provided to create a Struct instance.

### FieldRuntimeValue

One `FieldDefinition` instance represents one field declaration, and one `FieldRuntimeValue` instance represents one value.

It defines how to get, set, and serialize a value.
