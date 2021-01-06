import { StructDeserializationContext, StructOptions, StructSerializationContext } from './context';
import { FieldDefinition } from './definition';
import { FieldRuntimeValue } from './runtime-value';

describe('FieldRuntimeValue', () => {
    describe('.constructor', () => {
        it('should save parameters', () => {
            class MockFieldRuntimeValue extends FieldRuntimeValue {
                public deserialize(context: StructDeserializationContext): void | Promise<void> {
                    throw new Error('Method not implemented.');
                }
                public get(): unknown {
                    throw new Error('Method not implemented.');
                }
                public set(value: unknown): void {
                    throw new Error('Method not implemented.');
                }
                public serialize(dataView: DataView, offset: number, context: StructSerializationContext): void {
                    throw new Error('Method not implemented.');
                }
            }

            const definition = 1 as any;
            const options = 2 as any;
            const context = 3 as any;
            const object = 4 as any;

            const fieldRuntimeValue = new MockFieldRuntimeValue(definition, options, context, object);
            expect(fieldRuntimeValue).toHaveProperty('definition', definition);
            expect(fieldRuntimeValue).toHaveProperty('options', options);
            expect(fieldRuntimeValue).toHaveProperty('context', context);
            expect(fieldRuntimeValue).toHaveProperty('object', object);
        });
    });

    describe('#getSize', () => {
        it('should return same value as definition\'s', () => {
            class MockFieldDefinition extends FieldDefinition {
                public getSize(): number {
                    return 42;
                }
                public createValue(options: Readonly<StructOptions>, context: StructSerializationContext, object: any): FieldRuntimeValue<FieldDefinition<any, any, any>> {
                    throw new Error('Method not implemented.');
                }
            }

            class MockFieldRuntimeValue extends FieldRuntimeValue {
                public deserialize(context: StructDeserializationContext): void | Promise<void> {
                    throw new Error('Method not implemented.');
                }
                public get(): unknown {
                    throw new Error('Method not implemented.');
                }
                public set(value: unknown): void {
                    throw new Error('Method not implemented.');
                }
                public serialize(dataView: DataView, offset: number, context: StructSerializationContext): void {
                    throw new Error('Method not implemented.');
                }
            }

            const fieldDefinition = new MockFieldDefinition();
            const fieldRuntimeValue = new MockFieldRuntimeValue(fieldDefinition, undefined as any, undefined as any, undefined as any);
            expect(fieldRuntimeValue.getSize()).toBe(42);
        });
    });
});
