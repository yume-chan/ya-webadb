import { StructDefaultOptions, StructDeserializationContext, StructOptions, StructSerializationContext, StructValue } from '../basic';
import { ArrayBufferFieldType, ArrayBufferLikeFieldDefinition, ArrayBufferLikeFieldType, ArrayBufferLikeFieldValue, StringFieldType, Uint8ClampedArrayFieldType } from './array-buffer';

describe('Types', () => {
    describe('ArrayBufferLike', () => {
        describe('ArrayBufferFieldType', () => {
            it('should have a static instance', () => {
                expect(ArrayBufferFieldType.instance).toBeInstanceOf(ArrayBufferFieldType);
            });

            it('`#toArrayBuffer` should return the same `ArrayBuffer`', () => {
                const arrayBuffer = new ArrayBuffer(10);
                expect(ArrayBufferFieldType.instance.toArrayBuffer(arrayBuffer)).toBe(arrayBuffer);
            });

            it('`#fromArrayBuffer` should return the same `ArrayBuffer`', () => {
                const arrayBuffer = new ArrayBuffer(10);
                expect(ArrayBufferFieldType.instance.fromArrayBuffer(arrayBuffer)).toBe(arrayBuffer);
            });

            it('`#getSize` should return the `byteLength` of the `ArrayBuffer`', () => {
                const arrayBuffer = new ArrayBuffer(10);
                expect(ArrayBufferFieldType.instance.getSize(arrayBuffer)).toBe(10);
            });
        });

        describe('Uint8ClampedArrayFieldType', () => {
            it('should have a static instance', () => {
                expect(Uint8ClampedArrayFieldType.instance).toBeInstanceOf(Uint8ClampedArrayFieldType);
            });

            it('`#toArrayBuffer` should return its `buffer`', () => {
                const array = new Uint8ClampedArray(10);
                const buffer = array.buffer;
                expect(Uint8ClampedArrayFieldType.instance.toArrayBuffer(array)).toBe(buffer);
            });

            it('`#fromArrayBuffer` should return a view of the `ArrayBuffer`', () => {
                const arrayBuffer = new ArrayBuffer(10);
                const array = Uint8ClampedArrayFieldType.instance.fromArrayBuffer(arrayBuffer);
                expect(array).toHaveProperty('buffer', arrayBuffer);
                expect(array).toHaveProperty('byteOffset', 0);
                expect(array).toHaveProperty('byteLength', 10);
            });

            it('`#getSize` should return the `byteLength` of the `Uint8ClampedArray`', () => {
                const array = new Uint8ClampedArray(10);
                expect(Uint8ClampedArrayFieldType.instance.getSize(array)).toBe(10);
            });
        });

        describe('StringFieldType', () => {
            it('should have a static instance', () => {
                expect(StringFieldType.instance).toBeInstanceOf(StringFieldType);
            });

            it('`#toArrayBuffer` should return the decoded string', () => {
                const text = 'foo';
                const arrayBuffer = Buffer.from(text, 'utf-8');
                const context: StructSerializationContext = {
                    encodeUtf8(input) {
                        return Buffer.from(input, 'utf-8');
                    },
                };
                expect(StringFieldType.instance.toArrayBuffer(text, context)).toEqual(arrayBuffer);
            });

            it('`#fromArrayBuffer` should return the encoded ArrayBuffer', () => {
                const text = 'foo';
                const arrayBuffer = Buffer.from(text, 'utf-8');
                const context: StructDeserializationContext = {
                    decodeUtf8(arrayBuffer: ArrayBuffer): string {
                        return Buffer.from(arrayBuffer).toString('utf-8');
                    },
                    encodeUtf8(input) {
                        throw new Error('Method not implemented.');
                    },
                    read(length) {
                        throw new Error('Method not implemented.');
                    },
                };
                expect(StringFieldType.instance.fromArrayBuffer(arrayBuffer, context)).toBe(text);
            });

            it('`#getSize` should return -1', () => {
                expect(StringFieldType.instance.getSize()).toBe(-1);
            });
        });

        class MockArrayBufferFieldDefinition<TType extends ArrayBufferLikeFieldType>
            extends ArrayBufferLikeFieldDefinition<TType, number> {
            public getSize(): number {
                return this.options;
            }
        }

        describe('ArrayBufferLikeFieldDefinition', () => {
            it('should work with `ArrayBufferFieldType`', async () => {
                const buffer = new ArrayBuffer(10);
                const read = jest.fn((length: number) => buffer);
                const context: StructDeserializationContext = {
                    read,
                    encodeUtf8(input) { throw new Error(''); },
                    decodeUtf8(buffer) { throw new Error(''); },
                };
                const struct = new StructValue();

                const size = 10;
                const definition = new MockArrayBufferFieldDefinition(ArrayBufferFieldType.instance, size);
                const fieldValue = await definition.deserialize(StructDefaultOptions, context, struct);
                expect(read).toBeCalledTimes(1);
                expect(read).toBeCalledWith(size);
                expect(fieldValue).toHaveProperty('arrayBuffer', buffer);

                const value = fieldValue.get();
                expect(value).toBe(buffer);
            });

            it('should work with `Uint8ClampedArrayFieldType`', async () => {
                const buffer = new ArrayBuffer(10);
                const read = jest.fn((length: number) => buffer);
                const context: StructDeserializationContext = {
                    read,
                    encodeUtf8(input) { throw new Error(''); },
                    decodeUtf8(buffer) { throw new Error(''); },
                };
                const struct = new StructValue();

                const size = 10;
                const definition = new MockArrayBufferFieldDefinition(Uint8ClampedArrayFieldType.instance, size);
                const fieldValue = await definition.deserialize(StructDefaultOptions, context, struct);
                expect(read).toBeCalledTimes(1);
                expect(read).toBeCalledWith(10);
                expect(fieldValue).toHaveProperty('arrayBuffer', buffer);

                const value = fieldValue.get();
                expect(value).toBeInstanceOf(Uint8ClampedArray);
                expect(value).toHaveProperty('buffer', buffer);
            });

            it('should work when `#getSize` returns `0`', async () => {
                const buffer = new ArrayBuffer(10);
                const read = jest.fn((length: number) => buffer);
                const context: StructDeserializationContext = {
                    read,
                    encodeUtf8(input) { throw new Error(''); },
                    decodeUtf8(buffer) { throw new Error(''); },
                };
                const struct = new StructValue();

                const size = 0;
                const definition = new MockArrayBufferFieldDefinition(ArrayBufferFieldType.instance, size);
                const fieldValue = await definition.deserialize(StructDefaultOptions, context, struct);
                expect(read).toBeCalledTimes(0);
                expect(fieldValue.arrayBuffer).toBeInstanceOf(ArrayBuffer);
                expect(fieldValue.arrayBuffer).toHaveProperty('byteLength', 0);

                const value = fieldValue.get();
                expect(value).toBeInstanceOf(ArrayBuffer);
                expect(value).toHaveProperty('byteLength', 0);
            });
        });

        describe('ArrayBufferLikeFieldValue', () => {
            describe('#set', () => {
                it('should clear `arrayBuffer` field', async () => {
                    const size = 10;
                    const definition = new MockArrayBufferFieldDefinition(ArrayBufferFieldType.instance, size);
                    const buffer = new ArrayBuffer(size);
                    const read = jest.fn((length: number) => buffer);
                    const context: StructDeserializationContext = {
                        read,
                        encodeUtf8(input) { throw new Error(''); },
                        decodeUtf8(buffer) { throw new Error(''); },
                    };
                    const struct = new StructValue();
                    const fieldValue = await definition.deserialize(StructDefaultOptions, context, struct);

                    fieldValue.set(new ArrayBuffer(20));
                    expect(fieldValue).toHaveProperty('arrayBuffer', undefined);
                });
            });

            describe('#serialize', () => {
                it('should be able to serialize a deserialized value', async () => {
                    const size = 10;
                    const definition = new MockArrayBufferFieldDefinition(ArrayBufferFieldType.instance, size);
                    const sourceArray = new Uint8Array(Array.from({ length: size }, (_, i) => i));
                    const sourceBuffer = sourceArray.buffer;
                    const read = jest.fn((length: number) => sourceBuffer);
                    const context: StructDeserializationContext = {
                        read,
                        encodeUtf8(input) { throw new Error(''); },
                        decodeUtf8(buffer) { throw new Error(''); },
                    };
                    const struct = new StructValue();
                    const fieldValue = await definition.deserialize(StructDefaultOptions, context, struct);

                    const targetArray = new Uint8Array(size);
                    const targetView = new DataView(targetArray.buffer);
                    fieldValue.serialize(targetView, 0, context);

                    expect(targetArray).toEqual(sourceArray);
                });

                it('should be able to serialize a modified value', async () => {
                    const size = 10;
                    const definition = new MockArrayBufferFieldDefinition(ArrayBufferFieldType.instance, size);
                    const sourceArray = new Uint8Array(Array.from({ length: size }, (_, i) => i));
                    const sourceBuffer = sourceArray.buffer;
                    const read = jest.fn((length: number) => sourceBuffer);
                    const context: StructDeserializationContext = {
                        read,
                        encodeUtf8(input) { throw new Error(''); },
                        decodeUtf8(buffer) { throw new Error(''); },
                    };
                    const struct = new StructValue();
                    const fieldValue = await definition.deserialize(StructDefaultOptions, context, struct);
                    fieldValue.set(sourceArray.buffer);

                    const targetArray = new Uint8Array(size);
                    const targetView = new DataView(targetArray.buffer);
                    fieldValue.serialize(targetView, 0, context);

                    expect(targetArray).toEqual(sourceArray);
                });
            });
        });
    });
});
