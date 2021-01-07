import { StructDeserializationContext, StructOptions, StructSerializationContext } from './context';
import { FieldDefinition } from './definition';
import { FieldRuntimeValue } from './runtime-value';

describe('FieldRuntimeValue', () => {
    describe('.constructor', () => {
        it('should save parameters', () => {
            class MockFieldRuntimeValue extends FieldRuntimeValue {
                public serialize(dataView: DataView, offset: number, context: StructSerializationContext): void {
                    throw new Error('Method not implemented.');
                }
            }

            const definition = 1 as any;
            const options = 2 as any;
            const context = 3 as any;
            const object = 4 as any;
            const value = 5 as any;

            const fieldRuntimeValue = new MockFieldRuntimeValue(definition, options, context, object, value);
            expect(fieldRuntimeValue).toHaveProperty('definition', definition);
            expect(fieldRuntimeValue).toHaveProperty('options', options);
            expect(fieldRuntimeValue).toHaveProperty('context', context);
            expect(fieldRuntimeValue).toHaveProperty('object', object);
            expect(fieldRuntimeValue.get()).toBe(value);
        });
    });

    describe('#getSize', () => {
        it('should return same value as definition\'s', () => {
            class MockFieldDefinition extends FieldDefinition {
                public getSize(): number {
                    return 42;
                }
                public deserialize(options: Readonly<StructOptions>, context: StructDeserializationContext, object: any): FieldRuntimeValue<FieldDefinition<void, unknown, never>> | Promise<FieldRuntimeValue<FieldDefinition<void, unknown, never>>> {
                    throw new Error('Method not implemented.');
                }
                public createValue(options: Readonly<StructOptions>, context: StructSerializationContext, object: any, value: unknown): FieldRuntimeValue<FieldDefinition<void, unknown, never>> {
                    throw new Error('Method not implemented.');
                }
            }

            class MockFieldRuntimeValue extends FieldRuntimeValue {
                public serialize(dataView: DataView, offset: number, context: StructSerializationContext): void {
                    throw new Error('Method not implemented.');
                }
            }

            const fieldDefinition = new MockFieldDefinition();
            const fieldRuntimeValue = new MockFieldRuntimeValue(fieldDefinition, undefined as any, undefined as any, undefined as any, undefined as any);
            expect(fieldRuntimeValue.getSize()).toBe(42);
        });
    });

    describe('#set', () => {
        it('should update interval value', () => {
            class MockFieldRuntimeValue extends FieldRuntimeValue {
                public serialize(dataView: DataView, offset: number, context: StructSerializationContext): void {
                    throw new Error('Method not implemented.');
                }
            }

            const fieldRuntimeValue = new MockFieldRuntimeValue(undefined as any, undefined as any, undefined as any, undefined as any, undefined as any);
            fieldRuntimeValue.set(1);
            expect(fieldRuntimeValue.get()).toBe(1);

            fieldRuntimeValue.set(2);
            expect(fieldRuntimeValue.get()).toBe(2);
        });
    });
});
