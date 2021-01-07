import { StructOptions, StructDeserializationContext, StructSerializationContext } from './context';
import { FieldDefinition } from './definition';
import { FieldRuntimeValue } from './runtime-value';

describe('FieldDefinition', () => {
    describe('new', () => {
        it('should save the `options` parameter', () => {
            class MockFieldDefinition extends FieldDefinition<number>{
                public constructor(options: number) {
                    super(options);
                }
                public getSize(): number {
                    throw new Error('Method not implemented.');
                }
                public deserialize(options: Readonly<StructOptions>, context: StructDeserializationContext, object: any): FieldRuntimeValue<FieldDefinition<number, unknown, never>> | Promise<FieldRuntimeValue<FieldDefinition<number, unknown, never>>> {
                    throw new Error('Method not implemented.');
                }
                public createValue(options: Readonly<StructOptions>, context: StructSerializationContext, object: any, value: unknown): FieldRuntimeValue<FieldDefinition<number, unknown, never>> {
                    throw new Error('Method not implemented.');
                }
            }

            expect(new MockFieldDefinition(42)).toHaveProperty('options', 42);
        });
    });
});
