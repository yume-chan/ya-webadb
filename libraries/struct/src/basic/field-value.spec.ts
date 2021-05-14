import type { ValueOrPromise } from '../utils';
import type { StructDeserializationContext, StructOptions, StructSerializationContext } from './context';
import { StructFieldDefinition } from './definition';
import { StructFieldValue } from './field-value';
import type { StructValue } from './struct-value';

describe('StructFieldValue', () => {
    describe('.constructor', () => {
        it('should save parameters', () => {
            class MockStructFieldValue extends StructFieldValue {
                public serialize(dataView: DataView, offset: number, context: StructSerializationContext): void {
                    throw new Error('Method not implemented.');
                }
            }

            const definition = 1 as any;
            const options = 2 as any;
            const context = 3 as any;
            const struct = 4 as any;
            const value = 5 as any;

            const fieldValue = new MockStructFieldValue(definition, options, context, struct, value);
            expect(fieldValue).toHaveProperty('definition', definition);
            expect(fieldValue).toHaveProperty('options', options);
            expect(fieldValue).toHaveProperty('context', context);
            expect(fieldValue).toHaveProperty('struct', struct);
            expect(fieldValue.get()).toBe(value);
        });
    });

    describe('#getSize', () => {
        it('should return same value as definition\'s', () => {
            class MockFieldDefinition extends StructFieldDefinition {
                public getSize(): number {
                    return 42;
                }
                public create(options: Readonly<StructOptions>, context: StructSerializationContext, struct: StructValue, value: unknown): StructFieldValue<this> {
                    throw new Error('Method not implemented.');
                }
                public deserialize(options: Readonly<StructOptions>, context: StructDeserializationContext, struct: StructValue): ValueOrPromise<StructFieldValue<this>> {
                    throw new Error('Method not implemented.');
                }
            }

            class MockStructFieldValue extends StructFieldValue {
                public serialize(dataView: DataView, offset: number, context: StructSerializationContext): void {
                    throw new Error('Method not implemented.');
                }
            }

            const fieldDefinition = new MockFieldDefinition();
            const fieldValue = new MockStructFieldValue(fieldDefinition, undefined as any, undefined as any, undefined as any, undefined as any);
            expect(fieldValue.getSize()).toBe(42);
        });
    });

    describe('#set', () => {
        it('should update its internal value', () => {
            class MockStructFieldValue extends StructFieldValue {
                public serialize(dataView: DataView, offset: number, context: StructSerializationContext): void {
                    throw new Error('Method not implemented.');
                }
            }

            const fieldValue = new MockStructFieldValue(undefined as any, undefined as any, undefined as any, undefined as any, undefined as any);
            fieldValue.set(1);
            expect(fieldValue.get()).toBe(1);

            fieldValue.set(2);
            expect(fieldValue.get()).toBe(2);
        });
    });
});
