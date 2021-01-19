import { StructDefaultOptions, StructDeserializationContext, StructFieldDefinition, StructFieldValue, StructOptions, StructSerializationContext, StructValue } from './basic';
import { Struct } from './struct';
import { ArrayBufferFieldType, FixedLengthArrayBufferLikeFieldDefinition, NumberFieldDefinition, NumberFieldType, StringFieldType, Uint8ClampedArrayFieldType, VariableLengthArrayBufferLikeFieldDefinition } from './types';
import { ValueOrPromise } from './utils';

class MockDeserializationContext implements StructDeserializationContext {
    public buffer = new ArrayBuffer(0);

    public read = jest.fn((length: number) => this.buffer);

    public encodeUtf8 = jest.fn((input: string) => Buffer.from(input, 'utf-8'));

    public decodeUtf8 = jest.fn((buffer: ArrayBuffer) => Buffer.from(buffer).toString('utf-8'));
}

describe('Struct', () => {
    describe('.constructor', () => {
        it('should initialize fields', () => {
            const struct = new Struct();
            expect(struct).toHaveProperty('options', StructDefaultOptions);
            expect(struct).toHaveProperty('size', 0);
        });
    });

    describe('#field', () => {
        class MockFieldDefinition extends StructFieldDefinition<number>{
            public constructor(size: number) {
                super(size);
            }

            public getSize = jest.fn(() => {
                return this.options;
            });

            public create(options: Readonly<StructOptions>, context: StructSerializationContext, struct: StructValue, value: unknown): StructFieldValue<this> {
                throw new Error('Method not implemented.');
            }
            public deserialize(options: Readonly<StructOptions>, context: StructDeserializationContext, struct: StructValue): ValueOrPromise<StructFieldValue<this>> {
                throw new Error('Method not implemented.');
            }
        }

        it('should push a field and update size', () => {
            const struct = new Struct();

            const field1 = 'foo';
            const fieldDefinition1 = new MockFieldDefinition(4);

            struct.field(field1, fieldDefinition1);
            expect(struct).toHaveProperty('size', 4);
            expect(fieldDefinition1.getSize).toBeCalledTimes(1);
            expect(struct['_fields']).toEqual([[field1, fieldDefinition1]]);

            const field2 = 'bar';
            const fieldDefinition2 = new MockFieldDefinition(8);
            struct.field(field2, fieldDefinition2);
            expect(struct).toHaveProperty('size', 12);
            expect(fieldDefinition2.getSize).toBeCalledTimes(1);
            expect(struct['_fields']).toEqual([
                [field1, fieldDefinition1],
                [field2, fieldDefinition2],
            ]);
        });

        it('should throw an error if field name already exists', () => {
            const struct = new Struct();
            const fieldName = 'foo';
            struct.field(fieldName, new MockFieldDefinition(4));
            expect(() => struct.field(fieldName, new MockFieldDefinition(4))).toThrowError();
        });
    });

    describe('#number', () => {
        it('`int8` should append an `int8` field', () => {
            const struct = new Struct();
            struct.int8('foo');
            expect(struct).toHaveProperty('size', 1);

            const definition = struct['_fields'][0][1] as NumberFieldDefinition;
            expect(definition).toBeInstanceOf(NumberFieldDefinition);
            expect(definition.type).toBe(NumberFieldType.Int8);
        });

        it('`uint8` should append an `uint8` field', () => {
            const struct = new Struct();
            struct.uint8('foo');
            expect(struct).toHaveProperty('size', 1);

            const definition = struct['_fields'][0][1] as NumberFieldDefinition;
            expect(definition).toBeInstanceOf(NumberFieldDefinition);
            expect(definition.type).toBe(NumberFieldType.Uint8);
        });

        it('`int16` should append an `int16` field', () => {
            const struct = new Struct();
            struct.int16('foo');
            expect(struct).toHaveProperty('size', 2);

            const definition = struct['_fields'][0][1] as NumberFieldDefinition;
            expect(definition).toBeInstanceOf(NumberFieldDefinition);
            expect(definition.type).toBe(NumberFieldType.Int16);
        });

        it('`uint16` should append an `uint16` field', () => {
            const struct = new Struct();
            struct.uint16('foo');
            expect(struct).toHaveProperty('size', 2);

            const definition = struct['_fields'][0][1] as NumberFieldDefinition;
            expect(definition).toBeInstanceOf(NumberFieldDefinition);
            expect(definition.type).toBe(NumberFieldType.Uint16);
        });

        it('`int32` should append an `int32` field', () => {
            const struct = new Struct();
            struct.int32('foo');
            expect(struct).toHaveProperty('size', 4);

            const definition = struct['_fields'][0][1] as NumberFieldDefinition;
            expect(definition).toBeInstanceOf(NumberFieldDefinition);
            expect(definition.type).toBe(NumberFieldType.Int32);
        });

        it('`uint32` should append an `uint32` field', () => {
            const struct = new Struct();
            struct.uint32('foo');
            expect(struct).toHaveProperty('size', 4);

            const definition = struct['_fields'][0][1] as NumberFieldDefinition;
            expect(definition).toBeInstanceOf(NumberFieldDefinition);
            expect(definition.type).toBe(NumberFieldType.Uint32);
        });

        it('`int64` should append an `int64` field', () => {
            const struct = new Struct();
            struct.int64('foo');
            expect(struct).toHaveProperty('size', 8);

            const definition = struct['_fields'][0][1] as NumberFieldDefinition;
            expect(definition).toBeInstanceOf(NumberFieldDefinition);
            expect(definition.type).toBe(NumberFieldType.Int64);
        });

        it('`uint64` should append an `uint64` field', () => {
            const struct = new Struct();
            struct.uint64('foo');
            expect(struct).toHaveProperty('size', 8);

            const definition = struct['_fields'][0][1] as NumberFieldDefinition;
            expect(definition).toBeInstanceOf(NumberFieldDefinition);
            expect(definition.type).toBe(NumberFieldType.Uint64);
        });

        describe('#arrayBufferLike', () => {
            describe('FixedLengthArrayBufferLikeFieldDefinition', () => {
                it('`#arrayBuffer` with fixed length', () => {
                    let struct = new Struct();
                    struct.arrayBuffer('foo', { length: 10 });
                    expect(struct).toHaveProperty('size', 10);

                    const definition = struct['_fields'][0][1] as FixedLengthArrayBufferLikeFieldDefinition;
                    expect(definition).toBeInstanceOf(FixedLengthArrayBufferLikeFieldDefinition);
                    expect(definition.type).toBeInstanceOf(ArrayBufferFieldType);
                    expect(definition.options.length).toBe(10);
                });

                it('`#uint8ClampedArray` with fixed length', () => {
                    let struct = new Struct();
                    struct.uint8ClampedArray('foo', { length: 10 });
                    expect(struct).toHaveProperty('size', 10);

                    const definition = struct['_fields'][0][1] as FixedLengthArrayBufferLikeFieldDefinition;
                    expect(definition).toBeInstanceOf(FixedLengthArrayBufferLikeFieldDefinition);
                    expect(definition.type).toBeInstanceOf(Uint8ClampedArrayFieldType);
                    expect(definition.options.length).toBe(10);
                });

                it('`#string` with fixed length', () => {
                    let struct = new Struct();
                    struct.string('foo', { length: 10 });
                    expect(struct).toHaveProperty('size', 10);

                    const definition = struct['_fields'][0][1] as FixedLengthArrayBufferLikeFieldDefinition;
                    expect(definition).toBeInstanceOf(FixedLengthArrayBufferLikeFieldDefinition);
                    expect(definition.type).toBeInstanceOf(StringFieldType);
                    expect(definition.options.length).toBe(10);
                });
            });

            describe('VariableLengthArrayBufferLikeFieldDefinition', () => {
                it('`#arrayBuffer` with variable length', () => {
                    const struct = new Struct().int8('barLength');
                    expect(struct).toHaveProperty('size', 1);

                    struct.arrayBuffer('bar', { lengthField: 'barLength' });
                    expect(struct).toHaveProperty('size', 1);

                    const definition = struct['_fields'][1][1] as VariableLengthArrayBufferLikeFieldDefinition;
                    expect(definition).toBeInstanceOf(VariableLengthArrayBufferLikeFieldDefinition);
                    expect(definition.type).toBeInstanceOf(ArrayBufferFieldType);
                    expect(definition.options.lengthField).toBe('barLength');
                });

                it('`#uint8ClampedArray` with variable length', () => {
                    const struct = new Struct().int8('barLength');
                    expect(struct).toHaveProperty('size', 1);

                    struct.uint8ClampedArray('bar', { lengthField: 'barLength' });
                    expect(struct).toHaveProperty('size', 1);

                    const definition = struct['_fields'][1][1] as VariableLengthArrayBufferLikeFieldDefinition;
                    expect(definition).toBeInstanceOf(VariableLengthArrayBufferLikeFieldDefinition);
                    expect(definition.type).toBeInstanceOf(Uint8ClampedArrayFieldType);
                    expect(definition.options.lengthField).toBe('barLength');
                });


                it('`#string` with variable length', () => {
                    const struct = new Struct().int8('barLength');
                    expect(struct).toHaveProperty('size', 1);

                    struct.string('bar', { lengthField: 'barLength' });
                    expect(struct).toHaveProperty('size', 1);

                    const definition = struct['_fields'][1][1] as VariableLengthArrayBufferLikeFieldDefinition;
                    expect(definition).toBeInstanceOf(VariableLengthArrayBufferLikeFieldDefinition);
                    expect(definition.type).toBeInstanceOf(StringFieldType);
                    expect(definition.options.lengthField).toBe('barLength');
                });
            });
        });

        describe('#fields', () => {
            it('should append all fields from other struct', async () => {
                const sub = new Struct()
                    .int16('int16')
                    .int32('int32');

                const struct = new Struct()
                    .int8('int8')
                    .fields(sub)
                    .int64('int64');

                const field0 = struct['_fields'][0];
                expect(field0).toHaveProperty('0', 'int8');
                expect(field0[1]).toHaveProperty('type', NumberFieldType.Int8);

                const field1 = struct['_fields'][1];
                expect(field1).toHaveProperty('0', 'int16');
                expect(field1[1]).toHaveProperty('type', NumberFieldType.Int16);

                const field2 = struct['_fields'][2];
                expect(field2).toHaveProperty('0', 'int32');
                expect(field2[1]).toHaveProperty('type', NumberFieldType.Int32);

                const field3 = struct['_fields'][3];
                expect(field3).toHaveProperty('0', 'int64');
                expect(field3[1]).toHaveProperty('type', NumberFieldType.Int64);
            });
        });

        describe('deserialize', () => {
            it('should deserialize without dynamic size fields', async () => {
                const struct = new Struct()
                    .int8('foo')
                    .int16('bar');

                const context = new MockDeserializationContext();
                context.read
                    .mockReturnValueOnce(new Uint8Array([2]).buffer)
                    .mockReturnValueOnce(new Uint8Array([0, 16]).buffer);

                const result = await struct.deserialize(context);
                expect(result).toEqual({ foo: 2, bar: 16 });

                expect(context.read).toBeCalledTimes(2);
                expect(context.read).nthCalledWith(1, 1);
                expect(context.read).nthCalledWith(2, 2);
            });

            it('should deserialize with dynamic size fields', async () => {
                const struct = new Struct()
                    .int8('fooLength')
                    .uint8ClampedArray('foo', { lengthField: 'fooLength' });

                const context = new MockDeserializationContext();
                context.read
                    .mockReturnValueOnce(new Uint8Array([2]).buffer)
                    .mockReturnValueOnce(new Uint8Array([3, 4]).buffer);

                const result = await struct.deserialize(context);
                expect(result).toEqual({ fooLength: 2, foo: new Uint8ClampedArray([3, 4]) });
                expect(context.read).toBeCalledTimes(2);
                expect(context.read).nthCalledWith(1, 1);
                expect(context.read).nthCalledWith(2, 2);
            });
        });

        describe('#extra', () => {
            it('should accept plain field', async () => {
                const struct = new Struct()
                    .extra({ foo: 42, bar: true });

                const context = new MockDeserializationContext();
                const result = await struct.deserialize(context);

                expect(Object.entries(Object.getOwnPropertyDescriptors(result))).toEqual([
                    ['foo', { configurable: true, enumerable: true, writable: true, value: 42 }],
                    ['bar', { configurable: true, enumerable: true, writable: true, value: true }],
                ]);
            });

            it('should accept accessors', async () => {
                const struct = new Struct()
                    .extra({
                        get foo() { return 42; },
                        get bar() { return true; },
                        set bar(value) { },
                    });

                const context = new MockDeserializationContext();
                const result = await struct.deserialize(context);

                expect(Object.entries(Object.getOwnPropertyDescriptors(result))).toEqual([
                    ['foo', { configurable: true, enumerable: true, get: expect.any(Function) }],
                    ['bar', { configurable: true, enumerable: true, get: expect.any(Function), set: expect.any(Function) }],
                ]);
            });
        });

        describe('#postDeserialize', () => {
            it('can throw errors', async () => {
                const struct = new Struct();
                const callback = jest.fn(() => { throw new Error('mock'); });
                struct.postDeserialize(callback);

                const context = new MockDeserializationContext();
                expect(struct.deserialize(context)).rejects.toThrowError('mock');
                expect(callback).toBeCalledTimes(1);
            });

            it('can replace return value', async () => {
                const struct = new Struct();
                const callback = jest.fn(() => 'mock');
                struct.postDeserialize(callback);

                const context = new MockDeserializationContext();
                expect(struct.deserialize(context)).resolves.toBe('mock');
                expect(callback).toBeCalledTimes(1);
                expect(callback).toBeCalledWith({});
            });

            it('can return nothing', async () => {
                const struct = new Struct();
                const callback = jest.fn();
                struct.postDeserialize(callback);

                const context = new MockDeserializationContext();
                const result = await struct.deserialize(context);

                expect(callback).toBeCalledTimes(1);
                expect(callback).toBeCalledWith(result);
            });

            it('should overwrite callback', async () => {
                const struct = new Struct();

                const callback1 = jest.fn();
                struct.postDeserialize(callback1);

                const callback2 = jest.fn();
                struct.postDeserialize(callback2);

                const context = new MockDeserializationContext();
                await struct.deserialize(context);

                expect(callback1).toBeCalledTimes(0);
                expect(callback2).toBeCalledTimes(1);
                expect(callback2).toBeCalledWith({});
            });
        });

        describe('#serialize', () => {
            it('should serialize without dynamic size fields', () => {
                const struct = new Struct()
                    .int8('foo')
                    .int16('bar');

                const context = new MockDeserializationContext();
                const result = new Uint8Array(struct.serialize({ foo: 0x42, bar: 0x1024 }, context));

                expect(result).toEqual(new Uint8Array([0x42, 0x10, 0x24]));
            });

            it('should serialize with dynamic size fields', () => {
                const struct = new Struct()
                    .int8('fooLength')
                    .arrayBuffer('foo', { lengthField: 'fooLength' });

                const context = new MockDeserializationContext();
                const result = new Uint8Array(struct.serialize({ foo: new Uint8Array([0x03, 0x04, 0x05]).buffer }, context));

                expect(result).toEqual(new Uint8Array([0x03, 0x03, 0x04, 0x05]));
            });
        });
    });
});
