import { StructDefaultOptions, StructDeserializeStream, StructValue } from '../basic';
import { ArrayBufferFieldType, ArrayBufferLikeFieldDefinition, ArrayBufferLikeFieldType, StringFieldType, ArrayBufferViewFieldType } from './array-buffer';

class MockDeserializationStream implements StructDeserializeStream {
    public buffer = new ArrayBuffer(0);

    public read = jest.fn((length: number) => this.buffer);
}

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
                expect(ArrayBufferViewFieldType.instance).toBeInstanceOf(ArrayBufferViewFieldType);
            });

            it('`#toArrayBuffer` should return its `buffer`', () => {
                const array = new Uint8ClampedArray(10);
                const buffer = array.buffer;
                expect(ArrayBufferViewFieldType.instance.toArrayBuffer(array)).toBe(buffer);
            });

            it('`#fromArrayBuffer` should return a view of the `ArrayBuffer`', () => {
                const arrayBuffer = new ArrayBuffer(10);
                const array = ArrayBufferViewFieldType.instance.fromArrayBuffer(arrayBuffer);
                expect(array).toHaveProperty('buffer', arrayBuffer);
                expect(array).toHaveProperty('byteOffset', 0);
                expect(array).toHaveProperty('byteLength', 10);
            });

            it('`#getSize` should return the `byteLength` of the `Uint8ClampedArray`', () => {
                const array = new Uint8ClampedArray(10);
                expect(ArrayBufferViewFieldType.instance.getSize(array)).toBe(10);
            });
        });

        describe('StringFieldType', () => {
            it('should have a static instance', () => {
                expect(StringFieldType.instance).toBeInstanceOf(StringFieldType);
            });

            it('`#toArrayBuffer` should return the decoded string', () => {
                const text = 'foo';
                const arrayBuffer = Buffer.from(text, 'utf-8');
                expect(StringFieldType.instance.toArrayBuffer(text)).toEqual(arrayBuffer);
            });

            it('`#fromArrayBuffer` should return the encoded ArrayBuffer', () => {
                const text = 'foo';
                const arrayBuffer = Buffer.from(text, 'utf-8');
                expect(StringFieldType.instance.fromArrayBuffer(arrayBuffer)).toBe(text);
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
                const size = 10;
                const definition = new MockArrayBufferFieldDefinition(ArrayBufferFieldType.instance, size);

                const context = new MockDeserializationStream();
                const buffer = new ArrayBuffer(size);
                context.buffer = buffer;
                const struct = new StructValue();

                const fieldValue = await definition.deserialize(StructDefaultOptions, context, struct);
                expect(context.read).toBeCalledTimes(1);
                expect(context.read).toBeCalledWith(size);
                expect(fieldValue).toHaveProperty('arrayBuffer', buffer);

                expect(fieldValue.get()).toBe(buffer);
            });

            it('should work with `Uint8ClampedArrayFieldType`', async () => {
                const size = 10;
                const definition = new MockArrayBufferFieldDefinition(ArrayBufferViewFieldType.instance, size);

                const context = new MockDeserializationStream();
                const buffer = new ArrayBuffer(size);
                context.buffer = buffer;
                const struct = new StructValue();

                const fieldValue = await definition.deserialize(StructDefaultOptions, context, struct);
                expect(context.read).toBeCalledTimes(1);
                expect(context.read).toBeCalledWith(size);
                expect(fieldValue).toHaveProperty('arrayBuffer', buffer);

                const value = fieldValue.get();
                expect(value).toBeInstanceOf(Uint8ClampedArray);
                expect(value).toHaveProperty('buffer', buffer);
            });

            it('should work when `#getSize` returns `0`', async () => {
                const size = 0;
                const definition = new MockArrayBufferFieldDefinition(ArrayBufferFieldType.instance, size);

                const context = new MockDeserializationStream();
                const buffer = new ArrayBuffer(size);
                context.buffer = buffer;
                const struct = new StructValue();

                const fieldValue = await definition.deserialize(StructDefaultOptions, context, struct);
                expect(context.read).toBeCalledTimes(0);
                expect(fieldValue['arrayBuffer']).toBeInstanceOf(ArrayBuffer);
                expect(fieldValue['arrayBuffer']).toHaveProperty('byteLength', 0);

                const value = fieldValue.get();
                expect(value).toBeInstanceOf(ArrayBuffer);
                expect(value).toHaveProperty('byteLength', 0);
            });
        });

        describe('ArrayBufferLikeFieldValue', () => {
            describe('#set', () => {
                it('should clear `arrayBuffer` field', async () => {
                    const size = 0;
                    const definition = new MockArrayBufferFieldDefinition(ArrayBufferFieldType.instance, size);

                    const context = new MockDeserializationStream();
                    const buffer = new ArrayBuffer(size);
                    context.buffer = buffer;
                    const struct = new StructValue();

                    const fieldValue = await definition.deserialize(StructDefaultOptions, context, struct);

                    const newValue = new ArrayBuffer(20);
                    fieldValue.set(newValue);
                    expect(fieldValue.get()).toBe(newValue);
                    expect(fieldValue).toHaveProperty('arrayBuffer', undefined);
                });
            });

            describe('#serialize', () => {
                it('should be able to serialize with cached `arrayBuffer`', async () => {
                    const size = 0;
                    const definition = new MockArrayBufferFieldDefinition(ArrayBufferFieldType.instance, size);

                    const context = new MockDeserializationStream();
                    const sourceArray = new Uint8Array(Array.from({ length: size }, (_, i) => i));
                    const buffer = sourceArray.buffer;
                    context.buffer = buffer;
                    const struct = new StructValue();

                    const fieldValue = await definition.deserialize(StructDefaultOptions, context, struct);

                    const targetArray = new Uint8Array(size);
                    const targetView = new DataView(targetArray.buffer);
                    fieldValue.serialize(targetView, 0);

                    expect(targetArray).toEqual(sourceArray);
                });

                it('should be able to serialize a modified value', async () => {
                    const size = 0;
                    const definition = new MockArrayBufferFieldDefinition(ArrayBufferFieldType.instance, size);

                    const context = new MockDeserializationStream();
                    const sourceArray = new Uint8Array(Array.from({ length: size }, (_, i) => i));
                    const buffer = sourceArray.buffer;
                    context.buffer = buffer;
                    const struct = new StructValue();

                    const fieldValue = await definition.deserialize(StructDefaultOptions, context, struct);

                    fieldValue.set(sourceArray.buffer);

                    const targetArray = new Uint8Array(size);
                    const targetView = new DataView(targetArray.buffer);
                    fieldValue.serialize(targetView, 0);

                    expect(targetArray).toEqual(sourceArray);
                });
            });
        });
    });
});
