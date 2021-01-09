import { StructDefaultOptions, StructDeserializationContext, StructSerializationContext } from '../basic';
import { NumberFieldDefinition, NumberFieldRuntimeValue, NumberFieldType } from './number';

describe('Types', () => {
    describe('Number', () => {
        describe('NumberFieldType', () => {
            it('Int8 validation', () => {
                const key = 'Int8';
                expect(NumberFieldType[key]).toHaveProperty('size', 1);
                expect(NumberFieldType[key]).toHaveProperty('dataViewGetter', 'get' + key);
                expect(NumberFieldType[key]).toHaveProperty('dataViewSetter', 'set' + key);
            });

            it('Uint8 validation', () => {
                const key = 'Uint8';
                expect(NumberFieldType[key]).toHaveProperty('size', 1);
                expect(NumberFieldType[key]).toHaveProperty('dataViewGetter', 'get' + key);
                expect(NumberFieldType[key]).toHaveProperty('dataViewSetter', 'set' + key);
            });

            it('Int16 validation', () => {
                const key = 'Int16';
                expect(NumberFieldType[key]).toHaveProperty('size', 2);
                expect(NumberFieldType[key]).toHaveProperty('dataViewGetter', 'get' + key);
                expect(NumberFieldType[key]).toHaveProperty('dataViewSetter', 'set' + key);
            });

            it('Uint16 validation', () => {
                const key = 'Uint16';
                expect(NumberFieldType[key]).toHaveProperty('size', 2);
                expect(NumberFieldType[key]).toHaveProperty('dataViewGetter', 'get' + key);
                expect(NumberFieldType[key]).toHaveProperty('dataViewSetter', 'set' + key);
            });

            it('Int32 validation', () => {
                const key = 'Int32';
                expect(NumberFieldType[key]).toHaveProperty('size', 4);
                expect(NumberFieldType[key]).toHaveProperty('dataViewGetter', 'get' + key);
                expect(NumberFieldType[key]).toHaveProperty('dataViewSetter', 'set' + key);
            });

            it('Uint32 validation', () => {
                const key = 'Uint32';
                expect(NumberFieldType[key]).toHaveProperty('size', 4);
                expect(NumberFieldType[key]).toHaveProperty('dataViewGetter', 'get' + key);
                expect(NumberFieldType[key]).toHaveProperty('dataViewSetter', 'set' + key);
            });

            it('Int64 validation', () => {
                const key = 'Int64';
                expect(NumberFieldType[key]).toHaveProperty('size', 8);
                expect(NumberFieldType[key]).toHaveProperty('dataViewGetter', 'getBig' + key);
                expect(NumberFieldType[key]).toHaveProperty('dataViewSetter', 'setBig' + key);
            });

            it('Uint64 validation', () => {
                const key = 'Uint64';
                expect(NumberFieldType[key]).toHaveProperty('size', 8);
                expect(NumberFieldType[key]).toHaveProperty('dataViewGetter', 'getBig' + key);
                expect(NumberFieldType[key]).toHaveProperty('dataViewSetter', 'setBig' + key);
            });
        });

        describe('NumberFieldDefinition', () => {
            describe('getSize', () => {
                it('should return 1 for int8', () => {
                    expect(new NumberFieldDefinition(NumberFieldType.Int8).getSize()).toBe(1);
                });

                it('should return 1 for uint8', () => {
                    expect(new NumberFieldDefinition(NumberFieldType.Uint8).getSize()).toBe(1);
                });

                it('should return 2 for int16', () => {
                    expect(new NumberFieldDefinition(NumberFieldType.Int16).getSize()).toBe(2);
                });

                it('should return 2 for uint16', () => {
                    expect(new NumberFieldDefinition(NumberFieldType.Uint16).getSize()).toBe(2);
                });

                it('should return 4 for int32', () => {
                    expect(new NumberFieldDefinition(NumberFieldType.Int32).getSize()).toBe(4);
                });

                it('should return 4 for uint32', () => {
                    expect(new NumberFieldDefinition(NumberFieldType.Uint32).getSize()).toBe(4);
                });

                it('should return 8 for int64', () => {
                    expect(new NumberFieldDefinition(NumberFieldType.Int64).getSize()).toBe(8);
                });

                it('should return 8 for uint64', () => {
                    expect(new NumberFieldDefinition(NumberFieldType.Uint64).getSize()).toBe(8);
                });
            });

            describe('deserialize', () => {
                it('should deserialize Uint8', async () => {
                    const read = jest.fn((length: number) => new Uint8Array([1, 2, 3, 4]).buffer);
                    const context: StructDeserializationContext = {
                        read,
                        decodeUtf8(buffer) { throw new Error(''); },
                        encodeUtf8(input) { throw new Error(''); },
                    };

                    const definition = new NumberFieldDefinition(NumberFieldType.Uint8);
                    const value = await definition.deserialize(
                        StructDefaultOptions,
                        context,
                        {}
                    );

                    expect(value.get()).toBe(1);
                    expect(read).toBeCalledTimes(1);
                    expect(read).lastCalledWith(NumberFieldType.Uint8.size);
                });

                it('should deserialize Uint16', async () => {
                    const read = jest.fn((length: number) => new Uint8Array([1, 2, 3, 4]).buffer);
                    const context: StructDeserializationContext = {
                        read,
                        decodeUtf8(buffer) { throw new Error(''); },
                        encodeUtf8(input) { throw new Error(''); },
                    };

                    const definition = new NumberFieldDefinition(NumberFieldType.Uint16);
                    const value = await definition.deserialize(
                        StructDefaultOptions,
                        context,
                        {}
                    );

                    expect(value.get()).toBe((1 << 8) | 2);
                    expect(read).toBeCalledTimes(1);
                    expect(read).lastCalledWith(NumberFieldType.Uint16.size);
                });

                it('should deserialize Uint16LE', async () => {
                    const read = jest.fn((length: number) => new Uint8Array([1, 2, 3, 4]).buffer);
                    const context: StructDeserializationContext = {
                        read,
                        decodeUtf8(buffer) { throw new Error(''); },
                        encodeUtf8(input) { throw new Error(''); },
                    };

                    const definition = new NumberFieldDefinition(NumberFieldType.Uint16);
                    const value = await definition.deserialize(
                        { ...StructDefaultOptions, littleEndian: true },
                        context,
                        {}
                    );

                    expect(value.get()).toBe((2 << 8) | 1);
                    expect(read).toBeCalledTimes(1);
                    expect(read).lastCalledWith(NumberFieldType.Uint16.size);
                });
            });
        });

        describe('NumberRuntimeValue', () => {
            describe('getSize', () => {
                it('should return 1 for int8', () => {
                    const context: StructSerializationContext = {
                        encodeUtf8(input) { throw new Error(''); },
                    };
                    const definition = new NumberFieldDefinition(NumberFieldType.Int8);
                    const runtimeValue = definition.createValue(StructDefaultOptions, context, {}, 42);

                    expect(runtimeValue.getSize()).toBe(1);
                });

                it('should return 1 for uint8', () => {
                    const context: StructSerializationContext = {
                        encodeUtf8(input) { throw new Error(''); },
                    };
                    const definition = new NumberFieldDefinition(NumberFieldType.Uint8);
                    const runtimeValue = definition.createValue(StructDefaultOptions, context, {}, 42);

                    expect(runtimeValue.getSize()).toBe(1);
                });

                it('should return 2 for int16', () => {
                    const context: StructSerializationContext = {
                        encodeUtf8(input) { throw new Error(''); },
                    };
                    const definition = new NumberFieldDefinition(NumberFieldType.Int16);
                    const runtimeValue = definition.createValue(StructDefaultOptions, context, {}, 42);

                    expect(runtimeValue.getSize()).toBe(2);
                });

                it('should return 2 for uint16', () => {
                    const context: StructSerializationContext = {
                        encodeUtf8(input) { throw new Error(''); },
                    };
                    const definition = new NumberFieldDefinition(NumberFieldType.Uint16);
                    const runtimeValue = definition.createValue(StructDefaultOptions, context, {}, 42);

                    expect(runtimeValue.getSize()).toBe(2);
                });

                it('should return 4 for int32', () => {
                    const context: StructSerializationContext = {
                        encodeUtf8(input) { throw new Error(''); },
                    };
                    const definition = new NumberFieldDefinition(NumberFieldType.Int32);
                    const runtimeValue = definition.createValue(StructDefaultOptions, context, {}, 42);

                    expect(runtimeValue.getSize()).toBe(4);
                });

                it('should return 4 for uint32', () => {
                    const context: StructSerializationContext = {
                        encodeUtf8(input) { throw new Error(''); },
                    };
                    const definition = new NumberFieldDefinition(NumberFieldType.Uint32);
                    const runtimeValue = definition.createValue(StructDefaultOptions, context, {}, 42);

                    expect(runtimeValue.getSize()).toBe(4);
                });

                it('should return 8 for int64', () => {
                    const context: StructSerializationContext = {
                        encodeUtf8(input) { throw new Error(''); },
                    };
                    const definition = new NumberFieldDefinition(NumberFieldType.Int64);
                    const runtimeValue = definition.createValue(StructDefaultOptions, context, {}, BigInt(42));

                    expect(runtimeValue.getSize()).toBe(8);
                });

                it('should return 8 for uint64', () => {
                    const context: StructSerializationContext = {
                        encodeUtf8(input) { throw new Error(''); },
                    };
                    const definition = new NumberFieldDefinition(NumberFieldType.Uint64);
                    const runtimeValue = definition.createValue(StructDefaultOptions, context, {}, BigInt(42));

                    expect(runtimeValue.getSize()).toBe(8);
                });
            });

            describe('serialize', () => {
                it('should serialize uint8', () => {
                    const context: StructSerializationContext = {
                        encodeUtf8(input) { throw new Error(''); },
                    };
                    const definition = new NumberFieldDefinition(NumberFieldType.Int8);
                    const runtimeValue = definition.createValue(StructDefaultOptions, context, {}, 42);

                    const array = new Uint8Array(10);
                    const dataView = new DataView(array.buffer);
                    runtimeValue.serialize(dataView, 2);

                    expect(Array.from(array)).toEqual([0, 0, 42, 0, 0, 0, 0, 0, 0, 0]);
                });
            });
        });
    });
});
