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
                public createValue(): FieldRuntimeValue<FieldDefinition<any, any, any>> {
                    throw new Error('Method not implemented.');
                }
            }

            expect(new MockFieldDefinition(42)).toHaveProperty('options', 42);
        });
    });
});
