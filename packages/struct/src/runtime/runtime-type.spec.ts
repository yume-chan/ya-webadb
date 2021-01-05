import { StructDeserializationContext, StructSerializationContext } from './context';
import { FieldRuntimeValue } from './runtime-type';

describe('Runtime', () => {
    describe('FieldRuntimeValue', () => {
        it('`getSize` should return same value as static `getSize`', () => {
            class MockFieldRuntimeValue extends FieldRuntimeValue {
                static getSize() { return 42; }
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

            const instance = new MockFieldRuntimeValue(undefined as any, undefined as any, undefined as any, undefined as any);
            expect(instance.getSize()).toBe(42);
        });
    });
});
