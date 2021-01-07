import { StructDefaultOptions, StructDeserializationContext } from '../basic';
import { NumberFieldDefinition, NumberFieldRuntimeValue, NumberFieldType } from './number';

describe('Types', () => {
    describe('Number', () => {
        describe('NumberFieldType', () => {
            it('Uint8 validation', () => {
                const key = 'Uint8';
                expect(NumberFieldType[key]).toHaveProperty('size', 1);
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
});
