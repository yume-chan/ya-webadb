import { ValueOrPromise } from '../utils';
import { StructDeserializationContext, StructOptions, StructSerializationContext } from './context';
import { StructFieldDefinition } from './definition';
import { StructFieldValue } from './field-value';
import { StructValue } from './struct-value';

describe('StructFieldDefinition', () => {
    describe('.constructor', () => {
        it('should save the `options` parameter', () => {
            class MockFieldDefinition extends StructFieldDefinition<number>{
                public constructor(options: number) {
                    super(options);
                }
                public getSize(): number {
                    throw new Error('Method not implemented.');
                }
                public create(options: Readonly<StructOptions>, context: StructSerializationContext, object: StructValue, struct: unknown): StructFieldValue<this> {
                    throw new Error('Method not implemented.');
                }
                public deserialize(options: Readonly<StructOptions>, context: StructDeserializationContext, struct: StructValue): ValueOrPromise<StructFieldValue<this>> {
                    throw new Error('Method not implemented.');
                }
            }

            expect(new MockFieldDefinition(42)).toHaveProperty('options', 42);
        });
    });
});
