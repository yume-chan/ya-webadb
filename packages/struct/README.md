# @yume-chan/struct

C-style structure serializer and deserializer.

Fully compatible with TypeScript.

- [Compatibility](#compatibility)
- [Quick Start](#quick-start)
- [API](#api)
  - [`placeholder` method](#placeholder-method)
  - [`Struct` constructor](#struct-constructor)
  - [`Struct#int32`/`Struct#uint32` methods](#structint32structuint32-methods)
  - [`Struct#uint64` method](#structuint64-method)
  - [`extra` function](#extra-function)
  - [`afterParsed` method](#afterparsed-method)
  - [`deserialize` method](#deserialize-method)
  - [`serialize` method](#serialize-method)
- [Extend types](#extend-types)
  - [Backing Field](#backing-field)
  - [`FieldDescriptorBase` interface](#fielddescriptorbase-interface)
  - [`field` method](#field-method)
  - [`FieldTypeDefinition` interface](#fieldtypedefinition-interface)
    - [`deserialize` method](#deserialize-method-1)
    - [`getSize` method](#getsize-method)
    - [`getDynamicSize` method](#getdynamicsize-method)
    - [`initialize` method](#initialize-method)
    - [`serialize` method](#serialize-method-1)
  - [Array type](#array-type)
  - [`registerFieldTypeDefinition` method](#registerfieldtypedefinition-method)
  - [Data flow](#data-flow)

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

Usage of `uint64` requires [`BigInt`][MDN_BigInt] (**can't** be polyfilled), [`DataView#getBigUint64`][MDN_DataView_getBigUint64] and [`DataView#setBigUint64`][MDN_DataView_setBigUint64] (can be polyfilled).

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

## Quick Start

```ts
import Struct from '@yume-chan/struct';

const MyStruct =
    new Struct({ littleEndian: true })
        .int32('foo')
        .int32('bar');

const value = MyStruct.deserialize(someStream);
// TypeScript can infer type of the result object.
const { foo, bar } = value;
```

## API

### `placeholder` method

```ts
export function placeholder<T>(): T {
    return undefined as unknown as T;
}
```

Return a (fake) value of the given type.

Because TypeScript only supports supply all or none type arguments, this library allows all type parameters to be inferred from arguments.

This method can be used where an argument is only used to infer a type parameter.

**While all following APIs heavily rely on generic, DO NOT PASS ANY GENERIC ARGUMENTS MANUALLY!**

### `Struct` constructor

```ts
export default class Struct<
    TResult extends object = {},
    TInit extends object = {},
    TExtra extends object = {},
    TAfterParsed = undefined,
> {
    public constructor(options: Partial<StructOptions> = StructDefaultOptions);
}
```

Creates a new structure definition.

**Generic Parameters**

1. `TResult`: Type of the result object.
2. `TInit`: Type requirement to create such a structure. (Because some fields may implies other fields)
3. `TExtra`: Type of extra fields.
4. `TAfterParsed`: State of the `afterParsed` function.

**DO NOT PASS ANY GENERIC ARGUMENTS MANUALLY!**

These are considered "internal state" of the `Struct` and will be taken care of by methods below.

**Parameters**

1. `options`:
   * `littleEndian:boolean = false`: Whether all multi-byte fields are [little-endian encoded][Wikipeida_Endianess].

[Wikipeida_Endianess]: https://en.wikipedia.org/wiki/Endianness

### `Struct#int32`/`Struct#uint32` methods

```ts
public int32<
    TName extends string,
    TTypeScriptType = number
>(
    name: TName,
    options: FieldDescriptorBaseOptions = {},
    _typescriptType?: TTypeScriptType,
): Struct<
    TResult & Record<TName, TTypeScriptType>,
    TInit & Record<TName, TTypeScriptType>,
    TExtra,
    TAfterParsed,
>;

public uint32<
    TName extends string,
    TTypeScriptType = number
>(
    name: TName,
    options: {} = {},
    _typescriptType?: TTypeScriptType,
): Struct<
    TResult & Record<TName, TTypeScriptType>,
    TInit & Record<TName, TTypeScriptType>,
    TExtra,
    TAfterParsed,
>;
```

Return a new `Struct` instance with an `int32`/`uint32` field appended to the end.

The original `Struct` instance will not be changed.

TypeScript will also append a `name: TTypeScriptType` field into the result object and the init object.

**Generic Parameters**

1. `TName`: Literal type of the field's name.
2. `TTypeScriptType = number`: Type of the field in the result object.

**DO NOT PASS ANY GENERIC ARGUMENTS MANUALLY!**

TypeScript will infer them from arguments. See examples below.

**Parameters**

1. `name`: (Required) Field name. Should be a string literal to make types work.
1. `options`: currently unused.
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

3. Create a new struct by extending existing one

    ```ts
    const struct1 = new Struct()
        .int32('foo');

    const struct2 = struct1
        .int32('bar');

    assert(struct2 !== struct1);
    // `struct1` will not be changed
    ```

### `Struct#uint64` method

```ts
public uint64<
    TName extends string,
    TTypeScriptType = bigint
>(
    name: TName,
    options: FieldDescriptorBaseOptions = {},
    _typescriptType?: TTypeScriptType,
): Struct<
    TResult & Record<TName, TTypeScriptType>,
    TInit & Record<TName, TTypeScriptType>,
    TExtra,
    TAfterParsed,
>;
```

Return a new `Struct` instance with an `uint64` field appended to the end.

The original `Struct` instance will not be changed.

TypeScript will also append a `name: TTypeScriptType` field into the result object and the init object.

Require native `BigInt` support in runtime. See [compatibility](#compatibility).

### `extra` function

```ts
public extra<TValue extends object>(
    value: TValue & ThisType<WithBackingField<Overwrite<Overwrite<TExtra, TValue>, TResult>>>
): Struct<
    TResult,
    TInit,
    Overwrite<TExtra, TValue>,
    TAfterParsed
>;
```

Return a new `Struct` instance adding some extra fields.

The original `Struct` instance will not be changed.

TypeScript will also append all extra fields into the result object (if not already exited).

**Generic Parameters**

1. `TValue`: Type of the extra fields.

**DO NOT PASS ANY GENERIC ARGUMENTS MANUALLY!**

TypeScript will infer them from arguments. See examples below.

**Parameters**

1. `value`: An object containing anything you want to add to the result object. Accessors and methods are also allowed.

**Note**

1. If the current `Struct` already has some extra fields, it will be merged with `value`, with `value` taking precedence.
2. Extra fields will not be serialized.
3. Extra fields will be ignored if it has the same name with some defined fields.

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

### `afterParsed` method

```ts
public afterParsed(
    callback?: StructAfterParsed<TResult, void>
): Struct<TResult, TInit, TExtra, undefined>;
```

Return a new `Struct` instance, registering (or replacing) a custom callback to be run after deserialized.

The original `Struct` instance will not be changed.

```ts
public afterParsed<TAfterParsed>(
    callback?: StructAfterParsed<TResult, TAfterParsed>
): Struct<TResult, TInit, TExtra, TAfterParsed>;
```

Return a new `Struct` instance, registering (or replacing) a custom callback to be run after deserialized, and replacing the result object with the returned value.

The original `Struct` instance will not be changed.

**Generic Parameters**

1. `TAfterParsed`: Type of the new result object.

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
        .afterParsed(value => {
            throw new Error(value.message);
        });
    ```

2. Do anything you want

    ```ts
    // I think this one doesn't need any code example
    ```

3. Clear a previously set `afterParsed` callback

    ```ts
    // Most used with extending structures

    const struct1 = new Struct()
        .int32('foo')
        .afterParsed(value => {
            // do something
        });

    const struct2 = struct1
        .afterParsed() // don't inherit `struct1`'s `afterParsed`
        .int32('bar');
    ```

4. Replace result object

    ```ts
    const struct1 = new Struct()
        .int32('foo')
        .afterParsed(value => {
            return {
                bar: value.foo,
            };
        });

    const value = await struct.deserialize(stream);
    value.bar; // number
    ```

### `deserialize` method

```ts
public async deserialize(
    context: StructDeserializationContext
): Promise<TAfterParsed extends undefined ? Overwrite<TExtra, TResult> : TAfterParsed>;
```

Deserialize one structure from the `context`.

As you can see, if your `afterParsed` callback returns a value, that value will be returned by `deserialize`. Or the result object will be returned.

### `serialize` method

```ts
public serialize(init: TInit, context: StructSerializationContext): ArrayBuffer;
```

Serialize a value as the structure.

## Extend types

The library also supports adding custom types.

There are two concepts around the type plugin system.

### Backing Field

The result object has a hidden backing field, containing implementation details of each field.

```ts
import { getBackingField, setBackingField } from '@yume-chan/struct';

const value = getBackingField<number>(resultObject, 'foo');
setBackingField(resultObject, 'foo', value);
```

It's possible to access other fields' data if you know the type. But it's not recommended to modify them.

### `FieldDescriptorBase` interface

This interface describes one field, and will be stored in `Struct` class.

**Generic Parameters**

* `TName extends string = string`: Name of the field. Although `FieldDescriptorBase` doesn't need it to be generic, derived types will need it. So marking this way helps TypeScript infer the type.
* `TResultObject = {}`: Type that will be merged into the result object (`TResult`). Any key that has `never` type will be removed.
* `TInitObject = {}`: Type that will be merged into the init object (`TInit`). Any key that has `never` type will be removed. Normally you only need to add the current field into `TInit`, but sometimes one field will imply other fields, so you may want to also remove those implied fields from `TInit`.
* `TOptions extends FieldDescriptorBaseOptions = FieldDescriptorBaseOptions`: Type of the `options`. currently `FieldDescriptorBaseOptions` is empty but maybe something will happen later.

When declaring your own field descriptor, you need to extend `FieldDescriptorBase`, and correctly pass all generic arguments.

**Fields**

* `type: string`: The unique identifier of the type.
* `name: TName`: Field name in the result object.
* `options: TOptions`: You can store your options here.
* `resultObject?: TResultObject`: Make it possible for TypeScript to infer `TResultObject`. DO NOT TOUCH.
* `initObject?: TInitObject`: Make it possible for TypeScript to infer `TInitObject`. DO NOT TOUCH.

When declaring your own field descriptor, you can also add more fields to hold your data.

### `field` method

`Struct` class also has a `field` method to add a custom field descriptor.

Due to the limitation of TypeScript, you can't extend `Struct` class while keeping the fluent style API working.

So for type safety you should provide a function to generate your own field descriptor, then let the user call the `field` method.

### `FieldTypeDefinition` interface

This interface defines how to serialize and deserialize a type. You need to implement this interface for your type and register it.

**Generic Parameters**

* `TDescriptor extends FieldDescriptorBase = FieldDescriptorBase`: Type of the field descriptor. Just pass in your own field descriptor type.

**Fields**

* `type: string`: The unique identifier of the type. Make sure it's same as in `FieldDescriptor`.

#### `deserialize` method

```ts
deserialize(options: {
    context: StructDeserializationContext;
    field: TDescriptor;
    object: any;
    options: StructOptions;
}): Promise<void>;
```

Defines how to deserialize the field.

You should `read` data from the `context` according to your `field` descriptor, and set appropriate values onto `object` ("appropriate" means "same as `TDescriptor`'s `TResultObject`").

If you also defined `initialize` method, the result data shape of `object` should be same as the result of `initialize`.

#### `getSize` method

```ts
getSize(options: {
    field: TDescriptor;
    options: StructOptions;
}): number;
```

Get the size (in bytes) of the field.

If the size is (partially or fully) dynamic, returns the minimal size.

It's just a hint for how much data should be ready before parsing, not that important.

#### `getDynamicSize` method

```ts
getDynamicSize?(options: {
    context: StructSerializationContext,
    field: TDescriptor,
    object: any,
    options: StructOptions,
}): number;
```

Similar to `getSize`, but also has access to `object` and `context` so the actual size can be calculated.

This method will be called just before `serialize`, so you can also prepare your field to be serialized in it.

You can also modify `object` to store your lazily evaluated values so next serialization can reuse them. But make sure you have also defined a setter in `initialize` method to invalidate the cache.

#### `initialize` method

```ts
initialize?(options: {
    context: StructSerializationContext;
    field: TDescriptor;
    init: any;
    object: any;
    options: StructOptions;
}): void;
```

When creating or serializing an object, you can fine tune how to map fields from `init` object onto the result `object`.

You can modify the `object` as your wish, but a common practice is storing actual data on the backing field and define getter/setter on `object` to access them. Because fields may be overwritten by `extra` fields, where data on the backing field is still useful.

```ts
initialize({ field, init, object }) {
    object[BackingField][field.name] = {
        value: init[field.name],
        ...extraData,
    };

    Object.defineProperty(object, field.name, {
        configurable: true,
        enumerable: true,
        get() { return object[BackingField][field.name].value; }
        set(value) {
            object[BackingField][field.name].value = value;
            // set some other data
        }
    });
}
```

If omitted, value from `init` will be set into the backing field and a pair of simple getter/setter will be defined on `object`.

Some possible usages:

1. Do some calculations and then set it onto `object`.
2. Define getter/setter onto `object` to intercept read/write.
3. Maybe one field implies others, so you can define multiple fields onto `object` for a single `field`.

#### `serialize` method

```ts
serialize(options: {
    context: StructSerializationContext;
    dataView: DataView;
    field: TDescriptor;
    object: any;
    offset: number;
    options: StructOptions;
}): void;
```

Defines how to serialize the field.

You should serialize your `field`'s value on `object`, and write it to `dataView` at `offset`.

You must not write more data than `getSize`/`getDynamicSize` returned. Or an Error will be thrown.

### Array type

Instead of true "Array", the current array types (`arraybuffer` and `string`) are more like buffers.

### `registerFieldTypeDefinition` method

This library exports the `registerFieldTypeDefinition` method to register your custom type definitions.

Pass the `undefined as unknown as YourTypeDescriptor` as the first argument to make TypeScript infers the type.

### Data flow

Here are lists of methods calling order to help you understand how this library works.

| Method                        | Description                |
| ----------------------------- | -------------------------- |
| `Struct#field`                | Add a field descriptor     |
| `FieldTypeDefinition#getSize` | Add up struct's total size |

| Method                            | Description                          |
| --------------------------------- | ------------------------------------ |
| `Struct#deserialize`              | Start deserializing from a `context` |
| `FieldTypeDefinition#deserialize` | Deserialize each field               |

| Method                           | Description                                          |
| -------------------------------- | ---------------------------------------------------- |
| `Struct#create`                  | Validate and create a value of the current structure |
| `FieldTypeDefinition#initialize` | Initialize each field                                |

| Method                               | Description                                          |
| ------------------------------------ | ---------------------------------------------------- |
| `Struct#serialize`                   | Serialize a value into a buffer                      |
| `Struct#create`                      | Validate and create a value of the current structure |
| `FieldTypeDefinition#initialize`     | Initialize each field                                |
| `FieldTypeDefinition#getDynamicSize` | Get actual sizes of each field                       |
| `FieldTypeDefinition#serialize`      | Write each field into the allocated buffer           |
