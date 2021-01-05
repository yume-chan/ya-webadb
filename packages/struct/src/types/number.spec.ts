import { StructDefaultOptions, StructDeserializationContext } from '../runtime';
import { NumberFieldSubType, NumberFieldRuntimeValue } from './number';

describe('Types', () => {
    describe('Number', () => {
        describe('NumberFieldSubType', () => {
            it('Uint8 validation', () => {
                const key = 'Uint8';
                expect(NumberFieldSubType[key]).toHaveProperty('size', 1);
                expect(NumberFieldSubType[key]).toHaveProperty('dataViewGetter', 'get' + key);
                expect(NumberFieldSubType[key]).toHaveProperty('dataViewSetter', 'set' + key);
            });

            it('Uint16 validation', () => {
                const key = 'Uint16';
                expect(NumberFieldSubType[key]).toHaveProperty('size', 2);
                expect(NumberFieldSubType[key]).toHaveProperty('dataViewGetter', 'get' + key);
                expect(NumberFieldSubType[key]).toHaveProperty('dataViewSetter', 'set' + key);
            });

            it('Int32 validation', () => {
                const key = 'Int32';
                expect(NumberFieldSubType[key]).toHaveProperty('size', 4);
                expect(NumberFieldSubType[key]).toHaveProperty('dataViewGetter', 'get' + key);
                expect(NumberFieldSubType[key]).toHaveProperty('dataViewSetter', 'set' + key);
            });

            it('Uint32 validation', () => {
                const key = 'Uint32';
                expect(NumberFieldSubType[key]).toHaveProperty('size', 4);
                expect(NumberFieldSubType[key]).toHaveProperty('dataViewGetter', 'get' + key);
                expect(NumberFieldSubType[key]).toHaveProperty('dataViewSetter', 'set' + key);
            });

            it('Int64 validation', () => {
                const key = 'Int64';
                expect(NumberFieldSubType[key]).toHaveProperty('size', 8);
                expect(NumberFieldSubType[key]).toHaveProperty('dataViewGetter', 'getBig' + key);
                expect(NumberFieldSubType[key]).toHaveProperty('dataViewSetter', 'setBig' + key);
            });

            it('Uint64 validation', () => {
                const key = 'Uint64';
                expect(NumberFieldSubType[key]).toHaveProperty('size', 8);
                expect(NumberFieldSubType[key]).toHaveProperty('dataViewGetter', 'getBig' + key);
                expect(NumberFieldSubType[key]).toHaveProperty('dataViewSetter', 'setBig' + key);
            });
        });

        describe('NumberFieldRuntimeValue', () => {
            it('should deserialize Uint8', async () => {
                const read = jest.fn((length: number) => new Uint8Array([1, 2, 3, 4]).buffer);
                const context: StructDeserializationContext = {
                    read,
                    decodeUtf8(buffer) { throw new Error(''); },
                    encodeUtf8(input) { throw new Error(''); },
                };

                const value = new NumberFieldRuntimeValue(
                    { subType: NumberFieldSubType.Uint8 } as any,
                    StructDefaultOptions,
                    undefined as any,
                    undefined as any,
                );
                await value.deserialize(context);

                expect(value.get()).toBe(1);
                expect(read).toBeCalledTimes(1);
                expect(read).lastCalledWith(NumberFieldSubType.Uint8.size);
            });

            it('should deserialize Uint16', async () => {
                const read = jest.fn((length: number) => new Uint8Array([1, 2, 3, 4]).buffer);
                const context: StructDeserializationContext = {
                    read,
                    decodeUtf8(buffer) { throw new Error(''); },
                    encodeUtf8(input) { throw new Error(''); },
                };

                const value = new NumberFieldRuntimeValue(
                    { subType: NumberFieldSubType.Uint16 } as any,
                    StructDefaultOptions,
                    undefined as any,
                    undefined as any,
                );
                await value.deserialize(context);

                expect(value.get()).toBe((1 << 8) | 2);
                expect(read).toBeCalledTimes(1);
                expect(read).lastCalledWith(NumberFieldSubType.Uint16.size);
            });

            it('should deserialize Uint16LE', async () => {
                const read = jest.fn((length: number) => new Uint8Array([1, 2, 3, 4]).buffer);
                const context: StructDeserializationContext = {
                    read,
                    decodeUtf8(buffer) { throw new Error(''); },
                    encodeUtf8(input) { throw new Error(''); },
                };

                const value = new NumberFieldRuntimeValue(
                    { subType: NumberFieldSubType.Uint16 } as any,
                    { ...StructDefaultOptions, littleEndian: true },
                    undefined as any,
                    undefined as any,
                );
                await value.deserialize(context);

                expect(value.get()).toBe((2 << 8) | 1);
                expect(read).toBeCalledTimes(1);
                expect(read).lastCalledWith(NumberFieldSubType.Uint16.size);
            });
        });
    });
});
