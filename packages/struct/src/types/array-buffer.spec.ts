import { StructDeserializationContext, StructSerializationContext } from '../basic';
import { ArrayBufferFieldType, StringFieldType, Uint8ClampedArrayFieldType } from './array-buffer';

describe('Types', () => {
    describe('ArrayBufferFieldType', () => {
        it('should have a static instance', () => {
            expect(ArrayBufferFieldType.instance).toBeInstanceOf(ArrayBufferFieldType);
        });

        it('`toArrayBuffer` should return the same `ArrayBuffer`', () => {
            const arrayBuffer = new ArrayBuffer(10);
            expect(ArrayBufferFieldType.instance.toArrayBuffer(arrayBuffer)).toBe(arrayBuffer);
        });

        it('`fromArrayBuffer` should return the same `ArrayBuffer`', () => {
            const arrayBuffer = new ArrayBuffer(10);
            expect(ArrayBufferFieldType.instance.fromArrayBuffer(arrayBuffer)).toBe(arrayBuffer);
        });

        it('`getSize` should return the `byteLength` of the `ArrayBuffer`', () => {
            const arrayBuffer = new ArrayBuffer(10);
            expect(ArrayBufferFieldType.instance.getSize(arrayBuffer)).toBe(10);
        });
    });

    describe('Uint8ClampedArrayFieldType', () => {
        it('should have a static instance', () => {
            expect(Uint8ClampedArrayFieldType.instance).toBeInstanceOf(Uint8ClampedArrayFieldType);
        });

        it('`toArrayBuffer` should return its `buffer`', () => {
            const array = new Uint8ClampedArray(10);
            const buffer = array.buffer;
            expect(Uint8ClampedArrayFieldType.instance.toArrayBuffer(array)).toBe(buffer);
        });

        it('`fromArrayBuffer` should return a view of the `ArrayBuffer`', () => {
            const arrayBuffer = new ArrayBuffer(10);
            const array = Uint8ClampedArrayFieldType.instance.fromArrayBuffer(arrayBuffer);
            expect(array).toHaveProperty('buffer', arrayBuffer);
            expect(array).toHaveProperty('byteOffset', 0);
            expect(array).toHaveProperty('byteLength', 10);
        });

        it('`getSize` should return the `byteLength` of the `ArrayBuffer`', () => {
            const array = new Uint8ClampedArray(10);
            expect(Uint8ClampedArrayFieldType.instance.getSize(array)).toBe(10);
        });
    });

    describe('StringFieldType', () => {
        it('should have a static instance', () => {
            expect(StringFieldType.instance).toBeInstanceOf(StringFieldType);
        });

        it('`toArrayBuffer` should return the decoded string', () => {
            const text = 'foo';
            const arrayBuffer = Buffer.from(text, 'utf-8');
            const context: StructSerializationContext = {
                encodeUtf8(input) {
                    return Buffer.from(input, 'utf-8');
                },
            };
            expect(StringFieldType.instance.toArrayBuffer(text, context)).toEqual(arrayBuffer);
        });

        it('`fromArrayBuffer` should return the encoded ArrayBuffer', () => {
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

        it('`getSize` should return -1', () => {
            expect(StringFieldType.instance.getSize()).toBe(-1);
        });
    });
});
