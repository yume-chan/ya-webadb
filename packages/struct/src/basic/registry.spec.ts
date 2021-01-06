import { StructDeserializationContext, StructSerializationContext } from './context';
import { GlobalStructFieldRuntimeTypeRegistry, StructFieldRuntimeTypeRegistry } from './registry';
import { FieldRuntimeValue } from './runtime-type';

describe('Runtime', () => {
    describe('StructFieldRuntimeTypeRegistry', () => {
        it('should be able to get registered type', () => {
            const registry = new StructFieldRuntimeTypeRegistry();

            const type = 'mock';
            const MockFieldRuntimeValue = class extends FieldRuntimeValue {
                static getSize() { return 0; }
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
            };

            registry.register(type, MockFieldRuntimeValue);
            expect(registry.get(type)).toBe(MockFieldRuntimeValue);
        });

        it('should throw an error if same type been registered twice', () => {
            const registry = new StructFieldRuntimeTypeRegistry();

            const type = 'mock';
            const MockFieldRuntimeValue = class extends FieldRuntimeValue {
                static getSize() { return 0; }
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
            };

            registry.register(type, MockFieldRuntimeValue);
            expect(() => registry.register(type, MockFieldRuntimeValue)).toThrowError();
        });
    });

    describe('GlobalStructFieldRuntimeTypeRegistry', () => {
        it('should be defined', () => {
            expect(GlobalStructFieldRuntimeTypeRegistry).toBeInstanceOf(StructFieldRuntimeTypeRegistry);
        });
    });
});
