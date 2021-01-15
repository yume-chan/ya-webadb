import { StructDefaultOptions, StructDeserializationContext, StructValue } from '../basic';
import { ArrayBufferFieldType, ArrayBufferLikeFieldValue, StringFieldType, Uint8ClampedArrayFieldType } from './array-buffer';
import { FixedLengthArrayBufferLikeFieldDefinition } from './fixed-length-array-buffer';
import { NumberFieldDefinition, NumberFieldType, NumberFieldValue } from './number';
import { VariableLengthArrayBufferLikeFieldDefinition, VariableLengthArrayBufferLikeLengthStructFieldValue, VariableLengthArrayBufferLikeStructFieldValue } from './variable-length-array-buffer';

describe('Types', () => {
    describe('VariableLengthArrayBufferLikeFieldDefinition', () => {
        describe('#getSize', () => {
            it('should always return `0`', () => {
                const definition = new VariableLengthArrayBufferLikeFieldDefinition(ArrayBufferFieldType.instance, { lengthField: 'foo' });
                expect(definition.getSize()).toBe(0);
            });
        });

        describe('#getDeserializeSize', () => {
            it('should return value of its `lengthField`', async () => {
                const lengthField = 'foo';
                const size = 10;
                const definition = new VariableLengthArrayBufferLikeFieldDefinition(ArrayBufferFieldType.instance, { lengthField });
                const buffer = new ArrayBuffer(size);
                const read = jest.fn((length: number) => buffer);
                const context: StructDeserializationContext = {
                    read,
                    encodeUtf8(input) { throw new Error(''); },
                    decodeUtf8(buffer) { throw new Error(''); },
                };
                const struct = new StructValue();
                struct.set(
                    lengthField,
                    new NumberFieldValue(
                        new NumberFieldDefinition(
                            NumberFieldType.Int8
                        ),
                        StructDefaultOptions,
                        context,
                        struct,
                        size,
                    ),
                );

                const fieldValue = await definition.deserialize(StructDefaultOptions, context, struct);
                expect(read).toBeCalledTimes(1);
                expect(read).toBeCalledWith(size);
                expect(fieldValue).toHaveProperty('arrayBuffer', buffer);

                const value = fieldValue.get();
                expect(value).toBe(buffer);
            });

            it('should return value of its `lengthField` as number', async () => {
                const lengthField = 'foo';
                const size = 10;
                const definition = new VariableLengthArrayBufferLikeFieldDefinition(ArrayBufferFieldType.instance, { lengthField });
                const buffer = new ArrayBuffer(size);
                const read = jest.fn((length: number) => buffer);
                const context: StructDeserializationContext = {
                    read,
                    encodeUtf8(input) { throw new Error(''); },
                    decodeUtf8(buffer) { throw new Error(''); },
                };
                const struct = new StructValue();
                struct.set(
                    lengthField,
                    new ArrayBufferLikeFieldValue(
                        new FixedLengthArrayBufferLikeFieldDefinition(
                            StringFieldType.instance,
                            { length: 2 },
                        ),
                        StructDefaultOptions,
                        context,
                        struct,
                        size.toString()
                    ),
                );

                const fieldValue = await definition.deserialize(StructDefaultOptions, context, struct);
                expect(read).toBeCalledTimes(1);
                expect(read).toBeCalledWith(size);
                expect(fieldValue).toHaveProperty('arrayBuffer', buffer);

                const value = fieldValue.get();
                expect(value).toBe(buffer);
            });
        });
    });

    describe('VariableLengthArrayBufferLikeStructFieldValue', () => {
        describe('.constructor', () => {
            it('should replace `lengthField` on `struct`', () => {
                const lengthField = 'foo';
                const size = 10;
                const buffer = new ArrayBuffer(size);
                const read = jest.fn((length: number) => buffer);
                const context: StructDeserializationContext = {
                    read,
                    encodeUtf8(input) { throw new Error(''); },
                    decodeUtf8(buffer) { throw new Error(''); },
                };
                const struct = new StructValue();

                const originalLengthFieldValue = new ArrayBufferLikeFieldValue(
                    new FixedLengthArrayBufferLikeFieldDefinition(
                        StringFieldType.instance,
                        { length: 2 },
                    ),
                    StructDefaultOptions,
                    context,
                    struct,
                    size.toString()
                );

                struct.set(lengthField, originalLengthFieldValue,);

                const definition = new VariableLengthArrayBufferLikeFieldDefinition(
                    ArrayBufferFieldType.instance,
                    { lengthField },
                );
                const fieldValue = new VariableLengthArrayBufferLikeStructFieldValue(
                    definition,
                    StructDefaultOptions,
                    context,
                    struct,
                    buffer,
                );

                expect(fieldValue).toHaveProperty('definition', definition);

                expect(struct.fieldValues[lengthField]).not.toBe(originalLengthFieldValue);
            });
        });

        describe('#getSize', () => {
            it('should return size of `arrayBuffer` if exist', async () => {
                const lengthField = 'foo';
                const size = 10;
                const buffer = new ArrayBuffer(size);
                const read = jest.fn((length: number) => buffer);
                const context: StructDeserializationContext = {
                    read,
                    encodeUtf8(input) { throw new Error(''); },
                    decodeUtf8(buffer) { throw new Error(''); },
                };
                const struct = new StructValue();

                const originalLengthFieldValue = new ArrayBufferLikeFieldValue(
                    new FixedLengthArrayBufferLikeFieldDefinition(
                        StringFieldType.instance,
                        { length: 2 },
                    ),
                    StructDefaultOptions,
                    context,
                    struct,
                    size.toString()
                );
                struct.set(lengthField, originalLengthFieldValue,);

                const definition = new VariableLengthArrayBufferLikeFieldDefinition(
                    ArrayBufferFieldType.instance,
                    { lengthField },
                );

                const fieldValue = await definition.deserialize(StructDefaultOptions, context, struct);
                expect(fieldValue.getSize()).toBe(size);
            });

            it('should call `getSize` of its `type`', () => {
                const lengthField = 'foo';
                const size = 10;
                const buffer = new ArrayBuffer(size);

                const context: StructDeserializationContext = {
                    read(length) { throw new Error(''); },
                    encodeUtf8(input) { throw new Error(''); },
                    decodeUtf8(buffer) { throw new Error(''); },
                };
                const struct = new StructValue();

                const originalLengthFieldValue = new ArrayBufferLikeFieldValue(
                    new FixedLengthArrayBufferLikeFieldDefinition(
                        StringFieldType.instance,
                        { length: 2 },
                    ),
                    StructDefaultOptions,
                    context,
                    struct,
                    size.toString()
                );
                struct.set(lengthField, originalLengthFieldValue,);

                const fieldValue = new VariableLengthArrayBufferLikeStructFieldValue(
                    new VariableLengthArrayBufferLikeFieldDefinition(
                        ArrayBufferFieldType.instance,
                        { lengthField },
                    ),
                    StructDefaultOptions,
                    context,
                    struct,
                    buffer,
                );

                expect(fieldValue.getSize()).toBe(size);
            });

            it('should call `toArrayBuffer` of its `type` if it does not support `getSize`', () => {
                const lengthField = 'foo';
                const size = 10;
                const context: StructDeserializationContext = {
                    read(length) { throw new Error(''); },
                    encodeUtf8(input) {
                        return Buffer.from(input, 'utf-8');
                    },
                    decodeUtf8(buffer) { throw new Error(''); },
                };
                const struct = new StructValue();

                const originalLengthFieldValue = new ArrayBufferLikeFieldValue(
                    new FixedLengthArrayBufferLikeFieldDefinition(
                        StringFieldType.instance,
                        { length: 2 },
                    ),
                    StructDefaultOptions,
                    context,
                    struct,
                    size.toString()
                );
                struct.set(lengthField, originalLengthFieldValue,);

                const fieldValue = new VariableLengthArrayBufferLikeStructFieldValue(
                    new VariableLengthArrayBufferLikeFieldDefinition(
                        StringFieldType.instance,
                        { lengthField },
                    ),
                    StructDefaultOptions,
                    context,
                    struct,
                    'test',
                );

                expect(fieldValue.getSize()).toBe(4);
            });
        });

        describe('#set', () => {
            it('should store value', () => {
                const lengthField = 'foo';
                const size = 10;

                const array = new Uint8ClampedArray(size);
                const buffer = array.buffer;

                const read = jest.fn((length: number) => buffer);
                const context: StructDeserializationContext = {
                    read,
                    encodeUtf8(input) { throw new Error(''); },
                    decodeUtf8(buffer) { throw new Error(''); },
                };
                const struct = new StructValue();

                const originalLengthFieldValue = new ArrayBufferLikeFieldValue(
                    new FixedLengthArrayBufferLikeFieldDefinition(
                        StringFieldType.instance,
                        { length: 2 },
                    ),
                    StructDefaultOptions,
                    context,
                    struct,
                    size.toString()
                );

                struct.set(lengthField, originalLengthFieldValue,);

                const fieldValue = new VariableLengthArrayBufferLikeStructFieldValue(
                    new VariableLengthArrayBufferLikeFieldDefinition(
                        Uint8ClampedArrayFieldType.instance,
                        { lengthField },
                    ),
                    StructDefaultOptions,
                    context,
                    struct,
                    new Uint8ClampedArray(buffer),
                );

                const newArray = new Uint8ClampedArray(size);
                fieldValue.set(newArray);
                expect(fieldValue.get()).toBe(newArray);
            });

            it('should clear length', () => {
                const lengthField = 'foo';
                const size = 10;

                const array = new Uint8ClampedArray(size);
                const buffer = array.buffer;

                const read = jest.fn((length: number) => buffer);
                const context: StructDeserializationContext = {
                    read,
                    encodeUtf8(input) { throw new Error(''); },
                    decodeUtf8(buffer) { throw new Error(''); },
                };
                const struct = new StructValue();

                const originalLengthFieldValue = new ArrayBufferLikeFieldValue(
                    new FixedLengthArrayBufferLikeFieldDefinition(
                        StringFieldType.instance,
                        { length: 2 },
                    ),
                    StructDefaultOptions,
                    context,
                    struct,
                    size.toString()
                );

                struct.set(lengthField, originalLengthFieldValue,);

                const fieldValue = new VariableLengthArrayBufferLikeStructFieldValue(
                    new VariableLengthArrayBufferLikeFieldDefinition(
                        Uint8ClampedArrayFieldType.instance,
                        { lengthField },
                    ),
                    StructDefaultOptions,
                    context,
                    struct,
                    new Uint8ClampedArray(buffer),
                );

                const newArray = new Uint8ClampedArray(size);
                fieldValue.set(newArray);

                expect(fieldValue['length']).toBeUndefined();
            });
        });
    });

    describe('VariableLengthArrayBufferLikeLengthStructFieldValue', () => {
        describe('#getSize', () => {
            it('should return size of its original field value', () => {
                const struct = new StructValue();
                const originalFieldValue = new NumberFieldValue(
                    new NumberFieldDefinition(
                        NumberFieldType.Int8
                    ),
                    StructDefaultOptions,
                    {} as any,
                    struct,
                    42,
                );
                const fieldValue = new VariableLengthArrayBufferLikeLengthStructFieldValue(
                    originalFieldValue,
                    {} as any,
                );

                expect(fieldValue.getSize()).toBe(originalFieldValue.getSize());
            });
        });

        describe('#get', () => {
            it('should return size of its `arrayBufferField`', async () => {
                const lengthField = 'foo';
                const size = 10;
                const buffer = new ArrayBuffer(size);
                const read = jest.fn((length: number) => buffer);
                const context: StructDeserializationContext = {
                    read,
                    encodeUtf8(input) { throw new Error(''); },
                    decodeUtf8(buffer) { throw new Error(''); },
                };
                const struct = new StructValue();

                const originalLengthFieldValue = new NumberFieldValue(
                    new NumberFieldDefinition(
                        NumberFieldType.Int32
                    ),
                    StructDefaultOptions,
                    context,
                    struct,
                    size
                );
                struct.set(lengthField, originalLengthFieldValue,);

                const definition = new VariableLengthArrayBufferLikeFieldDefinition(
                    ArrayBufferFieldType.instance,
                    { lengthField },
                );

                const fieldValue = (await definition.deserialize(StructDefaultOptions, context, struct)) as any as VariableLengthArrayBufferLikeStructFieldValue;
                expect(fieldValue['lengthFieldValue'].get()).toBe(size);
            });

            it('should return size of its `arrayBufferField` as string', async () => {
                const lengthField = 'foo';
                const size = 10;
                const buffer = new ArrayBuffer(size);
                const read = jest.fn((length: number) => buffer);
                const context: StructDeserializationContext = {
                    read,
                    encodeUtf8(input) { throw new Error(''); },
                    decodeUtf8(buffer) { throw new Error(''); },
                };
                const struct = new StructValue();

                const originalLengthFieldValue = new ArrayBufferLikeFieldValue(
                    new FixedLengthArrayBufferLikeFieldDefinition(
                        StringFieldType.instance,
                        { length: 2 },
                    ),
                    StructDefaultOptions,
                    context,
                    struct,
                    size.toString()
                );
                struct.set(lengthField, originalLengthFieldValue,);

                const definition = new VariableLengthArrayBufferLikeFieldDefinition(
                    ArrayBufferFieldType.instance,
                    { lengthField },
                );

                const fieldValue = (await definition.deserialize(StructDefaultOptions, context, struct)) as any as VariableLengthArrayBufferLikeStructFieldValue;
                expect(fieldValue['lengthFieldValue'].get()).toBe(size.toString());
            });
        });

        describe('#serialize', () => {
            it('should call `serialize` of its `originalField`', async () => {
                const lengthField = 'foo';
                const size = 10;

                const buffer = new ArrayBuffer(size);
                const read = jest.fn((length: number) => buffer);
                const context: StructDeserializationContext = {
                    read,
                    encodeUtf8(input) {
                        return Buffer.from(input, 'utf-8');
                    },
                    decodeUtf8(buffer) { throw new Error(''); },
                };

                const struct = new StructValue();

                const originalLengthFieldValue = new ArrayBufferLikeFieldValue(
                    new FixedLengthArrayBufferLikeFieldDefinition(
                        StringFieldType.instance,
                        { length: 2 },
                    ),
                    StructDefaultOptions,
                    context,
                    struct,
                    size.toString()
                );
                struct.set(lengthField, originalLengthFieldValue,);

                const definition = new VariableLengthArrayBufferLikeFieldDefinition(
                    ArrayBufferFieldType.instance,
                    { lengthField },
                );

                const fieldValue = (await definition.deserialize(StructDefaultOptions, context, struct)) as any as VariableLengthArrayBufferLikeStructFieldValue;

                const targetArray = new Uint8Array(2);
                const targetView = new DataView(targetArray.buffer);
                fieldValue['lengthFieldValue'].serialize(targetView, 0, context);
                expect(targetArray).toEqual(new Uint8Array('10'.split('').map(c => c.charCodeAt(0))));
            });
        });
    });
});
