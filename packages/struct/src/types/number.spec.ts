import { StructDefaultOptions, StructDeserializationContext, StructSerializationContext, StructValue } from '../basic';
import { NumberFieldDefinition, NumberFieldType } from './number';

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
            describe('#getSize', () => {
                it('should return size of its type', () => {
                    expect(new NumberFieldDefinition(NumberFieldType.Int8).getSize()).toBe(1);
                    expect(new NumberFieldDefinition(NumberFieldType.Uint8).getSize()).toBe(1);
                    expect(new NumberFieldDefinition(NumberFieldType.Int16).getSize()).toBe(2);
                    expect(new NumberFieldDefinition(NumberFieldType.Uint16).getSize()).toBe(2);
                    expect(new NumberFieldDefinition(NumberFieldType.Int32).getSize()).toBe(4);
                    expect(new NumberFieldDefinition(NumberFieldType.Uint32).getSize()).toBe(4);
                    expect(new NumberFieldDefinition(NumberFieldType.Int64).getSize()).toBe(8);
                    expect(new NumberFieldDefinition(NumberFieldType.Uint64).getSize()).toBe(8);
                });
            });

            describe('#deserialize', () => {
                it('should deserialize Uint8', async () => {
                    const read = jest.fn((length: number) => new Uint8Array([1, 2, 3, 4]).buffer);
                    const context: StructDeserializationContext = {
                        read,
                        decodeUtf8(buffer) { throw new Error(''); },
                        encodeUtf8(input) { throw new Error(''); },
                    };

                    const definition = new NumberFieldDefinition(NumberFieldType.Uint8);
                    const struct = new StructValue();
                    const value = await definition.deserialize(
                        StructDefaultOptions,
                        context,
                        struct,
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
                    const struct = new StructValue();
                    const value = await definition.deserialize(
                        StructDefaultOptions,
                        context,
                        struct,
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
                    const struct = new StructValue();
                    const value = await definition.deserialize(
                        { ...StructDefaultOptions, littleEndian: true },
                        context,
                        struct,
                    );

                    expect(value.get()).toBe((2 << 8) | 1);
                    expect(read).toBeCalledTimes(1);
                    expect(read).lastCalledWith(NumberFieldType.Uint16.size);
                });
            });
        });

        describe('NumberFieldValue', () => {
            describe('#getSize', () => {
                it('should return size of its definition', () => {
                    const context: StructSerializationContext = {
                        encodeUtf8(input) { throw new Error(''); },
                    };
                    const struct = new StructValue();

                    expect(
                        new NumberFieldDefinition(NumberFieldType.Int8)
                            .create(
                                StructDefaultOptions,
                                context,
                                struct,
                                42,
                            )
                            .getSize()
                    ).toBe(1);

                    expect(
                        new NumberFieldDefinition(NumberFieldType.Uint8)
                            .create(
                                StructDefaultOptions,
                                context,
                                struct,
                                42,
                            )
                            .getSize()
                    ).toBe(1);

                    expect(
                        new NumberFieldDefinition(NumberFieldType.Int16)
                            .create(
                                StructDefaultOptions,
                                context,
                                struct,
                                42,
                            )
                            .getSize()
                    ).toBe(2);

                    expect(
                        new NumberFieldDefinition(NumberFieldType.Uint16)
                            .create(
                                StructDefaultOptions,
                                context,
                                struct,
                                42,
                            )
                            .getSize()
                    ).toBe(2);

                    expect(
                        new NumberFieldDefinition(NumberFieldType.Int32)
                            .create(
                                StructDefaultOptions,
                                context,
                                struct,
                                42,
                            )
                            .getSize()
                    ).toBe(4);

                    expect(
                        new NumberFieldDefinition(NumberFieldType.Uint32)
                            .create(
                                StructDefaultOptions,
                                context,
                                struct,
                                42,
                            )
                            .getSize()
                    ).toBe(4);

                    expect(
                        new NumberFieldDefinition(NumberFieldType.Int64)
                            .create(
                                StructDefaultOptions,
                                context,
                                struct,
                                BigInt(100),
                            )
                            .getSize()
                    ).toBe(8);

                    expect(
                        new NumberFieldDefinition(NumberFieldType.Uint64)
                            .create(
                                StructDefaultOptions,
                                context,
                                struct,
                                BigInt(100),
                            )
                            .getSize()
                    ).toBe(8);
                });
            });

            describe('#serialize', () => {
                it('should serialize uint8', () => {
                    const context: StructSerializationContext = {
                        encodeUtf8(input) { throw new Error(''); },
                    };
                    const definition = new NumberFieldDefinition(NumberFieldType.Int8);
                    const struct = new StructValue();
                    const value = definition.create(
                        StructDefaultOptions,
                        context,
                        struct,
                        42,
                    );

                    const array = new Uint8Array(10);
                    const dataView = new DataView(array.buffer);
                    value.serialize(dataView, 2);

                    expect(Array.from(array)).toEqual([0, 0, 42, 0, 0, 0, 0, 0, 0, 0]);
                });
            });
        });
    });
});
