import type { ValueOrPromise } from '../utils';
import type { StructAsyncDeserializeStream, StructDeserializeStream, StructOptions } from './context';
import { StructFieldDefinition } from './definition';
import type { StructFieldValue } from './field-value';
import type { StructValue } from './struct-value';

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
                public create(options: Readonly<StructOptions>, struct: StructValue, value: unknown): StructFieldValue<this> {
                    throw new Error('Method not implemented.');
                }
                public override deserialize(
                    options: Readonly<StructOptions>,
                    stream: StructDeserializeStream,
                    struct: StructValue,
                ): StructFieldValue<this>;
                public override deserialize(
                    options: Readonly<StructOptions>,
                    stream: StructAsyncDeserializeStream,
                    struct: StructValue,
                ): Promise<StructFieldValue<this>>;
                public deserialize(
                    options: Readonly<StructOptions>,
                    stream: StructDeserializeStream | StructAsyncDeserializeStream,
                    struct: StructValue
                ): ValueOrPromise<StructFieldValue<this>> {
                    throw new Error('Method not implemented.');
                }
            }

            expect(new MockFieldDefinition(42)).toHaveProperty('options', 42);
        });
    });
});
