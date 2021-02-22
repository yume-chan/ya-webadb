import { StructDefaultOptions, StructDeserializationContext, StructFieldValue, StructSerializationContext, StructValue } from '../basic';
import { ArrayBufferFieldType, ArrayBufferLikeFieldType } from './array-buffer';
import { VariableLengthArrayBufferLikeFieldDefinition, VariableLengthArrayBufferLikeFieldLengthValue, VariableLengthArrayBufferLikeStructFieldValue } from './variable-length-array-buffer';

class MockDeserializationContext implements StructDeserializationContext {
    public buffer = new ArrayBuffer(0);

    public read = jest.fn((length: number) => this.buffer);

    public encodeUtf8 = jest.fn((input: string) => Buffer.from(input, 'utf-8'));

    public decodeUtf8 = jest.fn((buffer: ArrayBuffer) => Buffer.from(buffer).toString('utf-8'));
}

class MockOriginalFieldValue extends StructFieldValue {
    public constructor() {
        super({} as any, {} as any, {} as any, {} as any, {});
    }

    public value: string | number = 0;

    public get = jest.fn((): string | number => this.value);

    public size = 0;

    public getSize = jest.fn((): number => this.size);

    public set = jest.fn((value: string | number) => { });

    public serialize = jest.fn((dataView: DataView, offset: number, context: StructSerializationContext): void => { });
}

describe('Types', () => {
    describe('VariableLengthArrayBufferLikeFieldLengthValue', () => {
        class MockArrayBufferFieldValue extends StructFieldValue {
            public constructor() {
                super({ options: {} } as any, {} as any, {} as any, {} as any, {});
            }

            public size = 0;

            public getSize = jest.fn(() => this.size);

            public serialize(dataView: DataView, offset: number, context: StructSerializationContext): void {
                throw new Error('Method not implemented.');
            }
        }

        describe('#getSize', () => {
            it('should return size of its original field value', () => {
                const mockOriginalFieldValue = new MockOriginalFieldValue();
                const mockArrayBufferFieldValue = new MockArrayBufferFieldValue();
                const lengthFieldValue = new VariableLengthArrayBufferLikeFieldLengthValue(
                    mockOriginalFieldValue,
                    mockArrayBufferFieldValue,
                );

                mockOriginalFieldValue.size = 0;
                expect(lengthFieldValue.getSize()).toBe(0);
                expect(mockOriginalFieldValue.getSize).toBeCalledTimes(1);

                mockOriginalFieldValue.getSize.mockClear();
                mockOriginalFieldValue.size = 100;
                expect(lengthFieldValue.getSize()).toBe(100);
                expect(mockOriginalFieldValue.getSize).toBeCalledTimes(1);
            });
        });

        describe('#get', () => {
            it('should return size of its `arrayBufferField`', async () => {
                const mockOriginalFieldValue = new MockOriginalFieldValue();
                const mockArrayBufferFieldValue = new MockArrayBufferFieldValue();
                const lengthFieldValue = new VariableLengthArrayBufferLikeFieldLengthValue(
                    mockOriginalFieldValue,
                    mockArrayBufferFieldValue,
                );

                mockOriginalFieldValue.value = 0;
                mockArrayBufferFieldValue.size = 0;
                expect(lengthFieldValue.get()).toBe(0);
                expect(mockArrayBufferFieldValue.getSize).toBeCalledTimes(1);
                expect(mockOriginalFieldValue.get).toBeCalledTimes(1);

                mockArrayBufferFieldValue.getSize.mockClear();
                mockOriginalFieldValue.get.mockClear();
                mockArrayBufferFieldValue.size = 100;
                expect(lengthFieldValue.get()).toBe(100);
                expect(mockArrayBufferFieldValue.getSize).toBeCalledTimes(1);
                expect(mockOriginalFieldValue.get).toBeCalledTimes(1);
            });

            it('should return size of its `arrayBufferField` as string', async () => {
                const mockOriginalFieldValue = new MockOriginalFieldValue();
                const mockArrayBufferFieldValue = new MockArrayBufferFieldValue();
                const lengthFieldValue = new VariableLengthArrayBufferLikeFieldLengthValue(
                    mockOriginalFieldValue,
                    mockArrayBufferFieldValue,
                );

                mockOriginalFieldValue.value = '0';
                mockArrayBufferFieldValue.size = 0;
                expect(lengthFieldValue.get()).toBe('0');
                expect(mockArrayBufferFieldValue.getSize).toBeCalledTimes(1);
                expect(mockOriginalFieldValue.get).toBeCalledTimes(1);

                mockArrayBufferFieldValue.getSize.mockClear();
                mockOriginalFieldValue.get.mockClear();
                mockArrayBufferFieldValue.size = 100;
                expect(lengthFieldValue.get()).toBe('100');
                expect(mockArrayBufferFieldValue.getSize).toBeCalledTimes(1);
                expect(mockOriginalFieldValue.get).toBeCalledTimes(1);
            });
        });

        describe('#set', () => {
            it('should does nothing', async () => {
                const mockOriginalFieldValue = new MockOriginalFieldValue();
                const mockArrayBufferFieldValue = new MockArrayBufferFieldValue();
                const lengthFieldValue = new VariableLengthArrayBufferLikeFieldLengthValue(
                    mockOriginalFieldValue,
                    mockArrayBufferFieldValue,
                );

                mockOriginalFieldValue.value = 0;
                mockArrayBufferFieldValue.size = 0;
                expect(lengthFieldValue.get()).toBe(0);

                (lengthFieldValue as StructFieldValue).set(100);
                expect(lengthFieldValue.get()).toBe(0);
            });
        });

        describe('#serialize', () => {
            it('should call `serialize` of its `originalField`', async () => {
                const mockOriginalFieldValue = new MockOriginalFieldValue();
                const mockArrayBufferFieldValue = new MockArrayBufferFieldValue();
                const lengthFieldValue = new VariableLengthArrayBufferLikeFieldLengthValue(
                    mockOriginalFieldValue,
                    mockArrayBufferFieldValue,
                );

                let dataView = 0 as any;
                let offset = 1 as any;
                let context = 2 as any;

                mockOriginalFieldValue.value = 10;
                mockArrayBufferFieldValue.size = 0;
                lengthFieldValue.serialize(dataView, offset, context);
                expect(mockOriginalFieldValue.get).toBeCalledTimes(1);
                expect(mockOriginalFieldValue.get).toReturnWith(10);
                expect(mockOriginalFieldValue.set).toBeCalledTimes(1);
                expect(mockOriginalFieldValue.set).toBeCalledWith(0);
                expect(mockOriginalFieldValue.serialize).toBeCalledTimes(1);
                expect(mockOriginalFieldValue.serialize).toBeCalledWith(dataView, offset, context);

                mockOriginalFieldValue.set.mockClear();
                mockOriginalFieldValue.serialize.mockClear();
                mockArrayBufferFieldValue.size = 100;
                lengthFieldValue.serialize(dataView, offset, context);
                expect(mockOriginalFieldValue.set).toBeCalledTimes(1);
                expect(mockOriginalFieldValue.set).toBeCalledWith(100);
                expect(mockOriginalFieldValue.serialize).toBeCalledTimes(1);
                expect(mockOriginalFieldValue.serialize).toBeCalledWith(dataView, offset, context);
            });

            it('should stringify its length if `originalField` is a string', async () => {
                const mockOriginalFieldValue = new MockOriginalFieldValue();
                const mockArrayBufferFieldValue = new MockArrayBufferFieldValue();
                const lengthFieldValue = new VariableLengthArrayBufferLikeFieldLengthValue(
                    mockOriginalFieldValue,
                    mockArrayBufferFieldValue,
                );

                let dataView = 0 as any;
                let offset = 1 as any;
                let context = 2 as any;

                mockOriginalFieldValue.value = '10';
                mockArrayBufferFieldValue.size = 0;
                lengthFieldValue.serialize(dataView, offset, context);
                expect(mockOriginalFieldValue.get).toBeCalledTimes(1);
                expect(mockOriginalFieldValue.get).toReturnWith('10');
                expect(mockOriginalFieldValue.set).toBeCalledTimes(1);
                expect(mockOriginalFieldValue.set).toBeCalledWith('0');
                expect(mockOriginalFieldValue.serialize).toBeCalledTimes(1);
                expect(mockOriginalFieldValue.serialize).toBeCalledWith(dataView, offset, context);

                mockOriginalFieldValue.set.mockClear();
                mockOriginalFieldValue.serialize.mockClear();
                mockArrayBufferFieldValue.size = 100;
                lengthFieldValue.serialize(dataView, offset, context);
                expect(mockOriginalFieldValue.set).toBeCalledTimes(1);
                expect(mockOriginalFieldValue.set).toBeCalledWith('100');
                expect(mockOriginalFieldValue.serialize).toBeCalledTimes(1);
                expect(mockOriginalFieldValue.serialize).toBeCalledWith(dataView, offset, context);
            });

            it('should stringify its length in specified base if `originalField` is a string', async () => {
                const mockOriginalFieldValue = new MockOriginalFieldValue();
                const mockArrayBufferFieldValue = new MockArrayBufferFieldValue();
                const lengthFieldValue = new VariableLengthArrayBufferLikeFieldLengthValue(
                    mockOriginalFieldValue,
                    mockArrayBufferFieldValue,
                );

                const base = 16;
                mockArrayBufferFieldValue.definition.options.lengthFieldBase = base;

                let dataView = 0 as any;
                let offset = 1 as any;
                let context = 2 as any;

                mockOriginalFieldValue.value = '10';
                mockArrayBufferFieldValue.size = 0;
                lengthFieldValue.serialize(dataView, offset, context);
                expect(mockOriginalFieldValue.get).toBeCalledTimes(1);
                expect(mockOriginalFieldValue.get).toReturnWith('10');
                expect(mockOriginalFieldValue.set).toBeCalledTimes(1);
                expect(mockOriginalFieldValue.set).toBeCalledWith('0');
                expect(mockOriginalFieldValue.serialize).toBeCalledTimes(1);
                expect(mockOriginalFieldValue.serialize).toBeCalledWith(dataView, offset, context);

                mockOriginalFieldValue.set.mockClear();
                mockOriginalFieldValue.serialize.mockClear();
                mockArrayBufferFieldValue.size = 100;
                lengthFieldValue.serialize(dataView, offset, context);
                expect(mockOriginalFieldValue.set).toBeCalledTimes(1);
                expect(mockOriginalFieldValue.set).toBeCalledWith((100).toString(base));
                expect(mockOriginalFieldValue.serialize).toBeCalledTimes(1);
                expect(mockOriginalFieldValue.serialize).toBeCalledWith(dataView, offset, context);
            });
        });
    });

    describe('VariableLengthArrayBufferLikeStructFieldValue', () => {
        describe('.constructor', () => {
            it('should forward parameters', () => {
                const struct = new StructValue();

                const lengthField = 'foo';
                const originalLengthFieldValue = new MockOriginalFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const arrayBufferFieldDefinition = new VariableLengthArrayBufferLikeFieldDefinition(
                    ArrayBufferFieldType.instance,
                    { lengthField },
                );

                const context = new MockDeserializationContext();
                const value = new ArrayBuffer(0);

                const arrayBufferFieldValue = new VariableLengthArrayBufferLikeStructFieldValue(
                    arrayBufferFieldDefinition,
                    StructDefaultOptions,
                    context,
                    struct,
                    value,
                );

                expect(arrayBufferFieldValue).toHaveProperty('definition', arrayBufferFieldDefinition);
                expect(arrayBufferFieldValue).toHaveProperty('options', StructDefaultOptions);
                expect(arrayBufferFieldValue).toHaveProperty('context', context);
                expect(arrayBufferFieldValue).toHaveProperty('struct', struct);
                expect(arrayBufferFieldValue).toHaveProperty('value', value);
                expect(arrayBufferFieldValue).toHaveProperty('arrayBuffer', undefined);
                expect(arrayBufferFieldValue).toHaveProperty('length', undefined);
            });

            it('should forward parameters with `arrayBuffer`', () => {
                const struct = new StructValue();

                const lengthField = 'foo';
                const originalLengthFieldValue = new MockOriginalFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const arrayBufferFieldDefinition = new VariableLengthArrayBufferLikeFieldDefinition(
                    ArrayBufferFieldType.instance,
                    { lengthField },
                );

                const context = new MockDeserializationContext();
                const value = new ArrayBuffer(100);

                const arrayBufferFieldValue = new VariableLengthArrayBufferLikeStructFieldValue(
                    arrayBufferFieldDefinition,
                    StructDefaultOptions,
                    context,
                    struct,
                    value,
                    value,
                );

                expect(arrayBufferFieldValue).toHaveProperty('definition', arrayBufferFieldDefinition);
                expect(arrayBufferFieldValue).toHaveProperty('options', StructDefaultOptions);
                expect(arrayBufferFieldValue).toHaveProperty('context', context);
                expect(arrayBufferFieldValue).toHaveProperty('struct', struct);
                expect(arrayBufferFieldValue).toHaveProperty('value', value);
                expect(arrayBufferFieldValue).toHaveProperty('arrayBuffer', value);
                expect(arrayBufferFieldValue).toHaveProperty('length', 100);
            });

            it('should replace `lengthField` on `struct`', () => {
                const struct = new StructValue();

                const lengthField = 'foo';
                const originalLengthFieldValue = new MockOriginalFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const arrayBufferFieldDefinition = new VariableLengthArrayBufferLikeFieldDefinition(
                    ArrayBufferFieldType.instance,
                    { lengthField },
                );

                const context = new MockDeserializationContext();
                const value = new ArrayBuffer(0);

                const arrayBufferFieldValue = new VariableLengthArrayBufferLikeStructFieldValue(
                    arrayBufferFieldDefinition,
                    StructDefaultOptions,
                    context,
                    struct,
                    value,
                );

                expect(arrayBufferFieldValue['lengthFieldValue']).toBeInstanceOf(StructFieldValue);
                expect(struct.fieldValues[lengthField]).toBe(arrayBufferFieldValue['lengthFieldValue']);
            });
        });

        describe('#getSize', () => {
            class MockArrayBufferFieldType extends ArrayBufferLikeFieldType<ArrayBuffer> {
                public toArrayBuffer = jest.fn((value: ArrayBuffer, context: StructSerializationContext): ArrayBuffer => {
                    return value;
                });

                public fromArrayBuffer = jest.fn((arrayBuffer: ArrayBuffer, context: StructDeserializationContext): ArrayBuffer => {
                    return arrayBuffer;
                });

                public size = 0;

                public getSize = jest.fn((value: ArrayBuffer): number => {
                    return this.size;
                });
            }

            it('should return cached size if exist', async () => {
                const struct = new StructValue();

                const lengthField = 'foo';
                const originalLengthFieldValue = new MockOriginalFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const arrayBufferFieldType = new MockArrayBufferFieldType();
                const arrayBufferFieldDefinition = new VariableLengthArrayBufferLikeFieldDefinition(
                    arrayBufferFieldType,
                    { lengthField },
                );

                const context = new MockDeserializationContext();
                const value = new ArrayBuffer(100);

                const arrayBufferFieldValue = new VariableLengthArrayBufferLikeStructFieldValue(
                    arrayBufferFieldDefinition,
                    StructDefaultOptions,
                    context,
                    struct,
                    value,
                    value,
                );

                expect(arrayBufferFieldValue.getSize()).toBe(100);
                expect(arrayBufferFieldType.fromArrayBuffer).toBeCalledTimes(0);
                expect(arrayBufferFieldType.toArrayBuffer).toBeCalledTimes(0);
                expect(arrayBufferFieldType.getSize).toBeCalledTimes(0);
            });

            it('should call `getSize` of its `type`', () => {
                const struct = new StructValue();

                const lengthField = 'foo';
                const originalLengthFieldValue = new MockOriginalFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const arrayBufferFieldType = new MockArrayBufferFieldType();
                const arrayBufferFieldDefinition = new VariableLengthArrayBufferLikeFieldDefinition(
                    arrayBufferFieldType,
                    { lengthField },
                );

                const context = new MockDeserializationContext();
                const value = new ArrayBuffer(100);

                const arrayBufferFieldValue = new VariableLengthArrayBufferLikeStructFieldValue(
                    arrayBufferFieldDefinition,
                    StructDefaultOptions,
                    context,
                    struct,
                    value,
                );

                arrayBufferFieldType.size = 100;
                expect(arrayBufferFieldValue.getSize()).toBe(100);
                expect(arrayBufferFieldType.fromArrayBuffer).toBeCalledTimes(0);
                expect(arrayBufferFieldType.toArrayBuffer).toBeCalledTimes(0);
                expect(arrayBufferFieldType.getSize).toBeCalledTimes(1);
                expect(arrayBufferFieldValue).toHaveProperty('arrayBuffer', undefined);
                expect(arrayBufferFieldValue).toHaveProperty('length', 100);
            });

            it('should call `toArrayBuffer` of its `type` if it does not support `getSize`', () => {
                const struct = new StructValue();

                const lengthField = 'foo';
                const originalLengthFieldValue = new MockOriginalFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const arrayBufferFieldType = new MockArrayBufferFieldType();
                const arrayBufferFieldDefinition = new VariableLengthArrayBufferLikeFieldDefinition(
                    arrayBufferFieldType,
                    { lengthField },
                );

                const context = new MockDeserializationContext();
                const value = new ArrayBuffer(100);

                const arrayBufferFieldValue = new VariableLengthArrayBufferLikeStructFieldValue(
                    arrayBufferFieldDefinition,
                    StructDefaultOptions,
                    context,
                    struct,
                    value,
                );

                arrayBufferFieldType.size = -1;
                expect(arrayBufferFieldValue.getSize()).toBe(100);
                expect(arrayBufferFieldType.fromArrayBuffer).toBeCalledTimes(0);
                expect(arrayBufferFieldType.toArrayBuffer).toBeCalledTimes(1);
                expect(arrayBufferFieldType.getSize).toBeCalledTimes(1);
                expect(arrayBufferFieldValue).toHaveProperty('arrayBuffer', value);
                expect(arrayBufferFieldValue).toHaveProperty('length', 100);
            });
        });

        describe('#set', () => {
            it('should call `ArrayBufferLikeFieldValue#set`', () => {
                const struct = new StructValue();

                const lengthField = 'foo';
                const originalLengthFieldValue = new MockOriginalFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const arrayBufferFieldDefinition = new VariableLengthArrayBufferLikeFieldDefinition(
                    ArrayBufferFieldType.instance,
                    { lengthField },
                );

                const context = new MockDeserializationContext();
                const value = new ArrayBuffer(100);

                const arrayBufferFieldValue = new VariableLengthArrayBufferLikeStructFieldValue(
                    arrayBufferFieldDefinition,
                    StructDefaultOptions,
                    context,
                    struct,
                    value,
                    value,
                );

                const newValue = new ArrayBuffer(100);
                arrayBufferFieldValue.set(newValue);
                expect(arrayBufferFieldValue.get()).toBe(newValue);
                expect(arrayBufferFieldValue).toHaveProperty('arrayBuffer', undefined);
            });

            it('should clear length', () => {
                const struct = new StructValue();

                const lengthField = 'foo';
                const originalLengthFieldValue = new MockOriginalFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const arrayBufferFieldDefinition = new VariableLengthArrayBufferLikeFieldDefinition(
                    ArrayBufferFieldType.instance,
                    { lengthField },
                );

                const context = new MockDeserializationContext();
                const value = new ArrayBuffer(100);

                const arrayBufferFieldValue = new VariableLengthArrayBufferLikeStructFieldValue(
                    arrayBufferFieldDefinition,
                    StructDefaultOptions,
                    context,
                    struct,
                    value,
                    value,
                );

                const newValue = new ArrayBuffer(100);
                arrayBufferFieldValue.set(newValue);
                expect(arrayBufferFieldValue).toHaveProperty('length', undefined);
            });
        });
    });

    describe('VariableLengthArrayBufferLikeFieldDefinition', () => {
        describe('#getSize', () => {
            it('should always return `0`', () => {
                const definition = new VariableLengthArrayBufferLikeFieldDefinition(
                    ArrayBufferFieldType.instance,
                    { lengthField: 'foo' },
                );
                expect(definition.getSize()).toBe(0);
            });
        });

        describe('#getDeserializeSize', () => {
            it('should return value of its `lengthField`', async () => {
                const struct = new StructValue();

                const lengthField = 'foo';
                const originalLengthFieldValue = new MockOriginalFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const definition = new VariableLengthArrayBufferLikeFieldDefinition(
                    ArrayBufferFieldType.instance,
                    { lengthField },
                );

                originalLengthFieldValue.value = 0;
                expect(definition['getDeserializeSize'](struct)).toBe(0);
                expect(originalLengthFieldValue.get).toBeCalledTimes(1);

                originalLengthFieldValue.get.mockClear();
                originalLengthFieldValue.value = 100;
                expect(definition['getDeserializeSize'](struct)).toBe(100);
                expect(originalLengthFieldValue.get).toBeCalledTimes(1);
            });

            it('should return value of its `lengthField` as number', async () => {
                const struct = new StructValue();

                const lengthField = 'foo';
                const originalLengthFieldValue = new MockOriginalFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const definition = new VariableLengthArrayBufferLikeFieldDefinition(
                    ArrayBufferFieldType.instance,
                    { lengthField },
                );

                originalLengthFieldValue.value = '0';
                expect(definition['getDeserializeSize'](struct)).toBe(0);
                expect(originalLengthFieldValue.get).toBeCalledTimes(1);

                originalLengthFieldValue.get.mockClear();
                originalLengthFieldValue.value = '100';
                expect(definition['getDeserializeSize'](struct)).toBe(100);
                expect(originalLengthFieldValue.get).toBeCalledTimes(1);
            });

            it('should return value of its `lengthField` as number with specified base', async () => {
                const struct = new StructValue();

                const lengthField = 'foo';
                const originalLengthFieldValue = new MockOriginalFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const base = 8;
                const definition = new VariableLengthArrayBufferLikeFieldDefinition(
                    ArrayBufferFieldType.instance,
                    { lengthField, lengthFieldBase: base },
                );

                originalLengthFieldValue.value = '0';
                expect(definition['getDeserializeSize'](struct)).toBe(0);
                expect(originalLengthFieldValue.get).toBeCalledTimes(1);

                originalLengthFieldValue.get.mockClear();
                originalLengthFieldValue.value = '100';
                expect(definition['getDeserializeSize'](struct)).toBe(Number.parseInt('100', base));
                expect(originalLengthFieldValue.get).toBeCalledTimes(1);
            });
        });

        describe('#create', () => {
            it('should create a `VariableLengthArrayBufferLikeFieldValue`', () => {
                const struct = new StructValue();

                const lengthField = 'foo';
                const originalLengthFieldValue = new MockOriginalFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const definition = new VariableLengthArrayBufferLikeFieldDefinition(
                    ArrayBufferFieldType.instance,
                    { lengthField },
                );

                const context = new MockDeserializationContext();
                const value = new ArrayBuffer(100);
                const arrayBufferFieldValue = definition.create(
                    StructDefaultOptions,
                    context,
                    struct,
                    value,
                );

                expect(arrayBufferFieldValue).toHaveProperty('definition', definition);
                expect(arrayBufferFieldValue).toHaveProperty('options', StructDefaultOptions);
                expect(arrayBufferFieldValue).toHaveProperty('context', context);
                expect(arrayBufferFieldValue).toHaveProperty('struct', struct);
                expect(arrayBufferFieldValue).toHaveProperty('value', value);
                expect(arrayBufferFieldValue).toHaveProperty('arrayBuffer', undefined);
                expect(arrayBufferFieldValue).toHaveProperty('length', undefined);
            });

            it('should create a `VariableLengthArrayBufferLikeFieldValue` with `arrayBuffer`', () => {
                const struct = new StructValue();

                const lengthField = 'foo';
                const originalLengthFieldValue = new MockOriginalFieldValue();
                struct.set(lengthField, originalLengthFieldValue);

                const definition = new VariableLengthArrayBufferLikeFieldDefinition(
                    ArrayBufferFieldType.instance,
                    { lengthField },
                );

                const context = new MockDeserializationContext();
                const value = new ArrayBuffer(100);
                const arrayBufferFieldValue = definition.create(
                    StructDefaultOptions,
                    context,
                    struct,
                    value,
                    value,
                );

                expect(arrayBufferFieldValue).toHaveProperty('definition', definition);
                expect(arrayBufferFieldValue).toHaveProperty('options', StructDefaultOptions);
                expect(arrayBufferFieldValue).toHaveProperty('context', context);
                expect(arrayBufferFieldValue).toHaveProperty('struct', struct);
                expect(arrayBufferFieldValue).toHaveProperty('value', value);
                expect(arrayBufferFieldValue).toHaveProperty('arrayBuffer', value);
                expect(arrayBufferFieldValue).toHaveProperty('length', 100);
            });
        });
    });
});
