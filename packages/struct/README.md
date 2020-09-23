# @yume-chan/struct

Serialize and deserialize C-style structures.

Fully compatible with TypeScript.

- [Quick Start](#quick-start)
- [API](#api)
  - [`Struct` constructor](#struct-constructor)
  - [`int32`/`uint32` methods](#int32uint32-methods)
  - [`extra` function](#extra-function)
  - [`afterParsed` method](#afterparsed-method)
  - [`deserialize` method](#deserialize-method)
  - [`serialize` method](#serialize-method)
- [Extend types](#extend-types)
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

## Quick Start

```ts
import Struct from '@yume-chan/struct';

const MyStruct =
    new Struct({ littleEndian: true })
        .int32('foo')
        .int32('bar');

const value = MyStruct.deserialize(someStream);
const { foo, bar } = value;
```

## API

**While all APIs heavily rely on generic, DO NOT PASS ANY GENERIC ARGUMENTS MANUALLY!**

### `Struct` constructor

```ts
declare class Struct<TObject = {}, TAfterParsed = undefined, TInit = {}> {
    public constructor(options: Partial<StructOptions> = StructDefaultOptions);
}
```

Create a new structure definition.

**Generic Parameters**

1. `TObject`: Type of the result object.
1. `TAfterParsed`: Special case for the `afterParsed` function.
1. `TInit`: Type requirement to create such a structure. (Because some fields may implies other fields, and there is the `extra` function)

**DO NOT PASS ANY GENERIC ARGUMENTS MANUALLY!**

These are considered "internal state" of the `Struct` and it will take care of them by itself.

**Parameters**

1. `options`:
   * `littleEndian:boolean = false`: Whether all multi-byte fields are little-endian encoded.

### `int32`/`uint32` methods

```ts
public int32<
    TName extends string,
    TTypeScriptType = number
>(
    name: TName,
    options: {} = {},
    _typescriptType?: () => TTypeScriptType,
): Struct<
    TObject & Record<TName, TTypeScriptType>,
    TAfterParsed,
    TInit & Record<TName, TTypeScriptType>
>;

public uint32<
    TName extends string,
    TTypeScriptType = number
>(
    name: TName,
    options: {} = {},
    _typescriptType?: () => TTypeScriptType,
): Struct<
    TObject & Record<TName, TTypeScriptType>,
    TAfterParsed,
    TInit & Record<TName, TTypeScriptType>
>;
```

Append an int32/uint32 field into the `Struct`.

**Generic Parameters**

1. `TName`: Literal type of the field's name.
1. `TTypeScriptType = number`: Type of the field in the result object.

**DO NOT PASS ANY GENERIC ARGUMENTS MANUALLY!**

TypeScript will infer them from arguments. See examples below.

**Parameters**

1. `name`: (Required) Field name. Should be a string literal to make types work.
1. `options`: currently unused.
1. `_typescriptType`: Supply a function to change the field's type. See examples below.

**Returns**

A new instance of `Struct`, with `{ [name]: TTypeScriptType }` added to its result object type.

**Examples**

1. Add an int32 field named `foo`

    ```ts
    const struct = new Struct()
        .int32('foo');

    const value = await struct.deserialize(stream);
    value.foo; // number

    struct.create({ }) // error: 'foo' is required
    struct.create({ foo: 'bar' }) // error: 'foo' must be a number
    struct.create({ foo: 42 }) // ok
    ```

2. Set `foo`'s type

    ```ts
    enum MyEnum {
        a,
        b,
    }

    const struct = new Struct()
        .int32('foo', () => MyEnum.a); // The inferred return type is `MyEnum`

    const value = await struct.deserialize(stream);
    value.foo; // MyEnum

    struct.create({ foo: 42 }); // error: 'foo' must be of type `MyEnum`
    struct.create({ foo: MyEnum.b }); // ok

    // Although there is no generic constraints on the `TTypeScriptType`
    // So it's possible to set it to an incompatible type, like `string`
    // But obviously, it's a bad idea
    ```

3. Create a new struct by extending exist one

    ```ts
    const struct1 = new Struct()
        .int32('foo');

    const struct2 = struct1
        .int32('bar'); // `struct1` was not changed
    ```

### `extra` function

```ts
public extra<TExtra extends object>(
    value: TExtra & ThisType<Omit<TObject, keyof TExtra> & TExtra>
): Struct<
    StructExtraResult<TObject, TExtra>,
    TAfterParsed,
    Omit<TInit, keyof TExtra>
>;
```

Add custom extra fields to the structure.

Extra fields will be added onto the result object after deserializing all fields, overwriting exist fields with same name.

If an extra field doesn't overlap the existing fields, it will not be serialized. However if it does, the value of extra field will be serialized instead of the parsed value.

**Generic Parameters**

1. `TExtra`: Type of your extra fields.

**DO NOT PASS ANY GENERIC ARGUMENTS MANUALLY!**

TypeScript will infer them from arguments. See examples below.

**Parameters**

1. `extra`: An object containing anything you want to add to the result object. Getters/setters and methods are also allowed.

**Returns**

A new instance of `Struct`, with `extra` merged with existing ones.

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
    callback: StructAfterParsed<TObject, never>
): Struct<TObject, never, TInit>
public afterParsed(
    callback?: StructAfterParsed<TObject, void>
): Struct<TObject, undefined, TInit>;
```

Run custom logic after deserializing.

Call `afterParsed` again will replace existing callback.

```ts
public afterParsed<TResult>(
    callback?: StructAfterParsed<TObject, TResult>
): Struct<TObject, TResult, TInit>;
```

Run custom logic after deserializing and replace the result object with the returned value.

Call `afterParsed` again will replace existing callback.

**Generic Parameters**

1. `TResult`: Type of the result object

**DO NOT PASS ANY GENERIC ARGUMENTS MANUALLY!**

TypeScript will infer them from arguments. See examples below.

**Parameters**

1. `callback`: An function contains the custom logic to be run, optionally returns a new result object. Or `undefined`, to clear the previously set `afterParsed` callback.

**Returns**

A new instance of `Struct`, with `afterParsed` callback replaced.

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
): Promise<TAfterParsed extends undefined ? TObject : TAfterParsed>
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

### `FieldDescriptorBase` interface

This interface describe one field in the struct, and will be stored in `Struct` class.

**Generic Parameters**

* `TName extends string = string`: Name of the field. Although `FieldDescriptorBase` doesn't need it to be generic, derived types will need it. So marking this way helps TypeScript infer the type.
* `TResultObject = {}`: Type that will be merged into the result object (`TObject`). Any key that has `never` type will be removed.
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

You can directly modify the `object` as your wish.

If omitted, value from `init` will be directly set onto `object`.

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
