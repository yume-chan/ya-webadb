import type { BuiltInFieldType } from './descriptor';
import type { FieldRuntimeType } from './runtime-type';

export class StructFieldRuntimeTypeRegistry {
    private store: Record<number | string, FieldRuntimeType> = {};

    public get(
        type: BuiltInFieldType | string
    ): FieldRuntimeType {
        return this.store[type];
    }

    public register<
        TConstructor extends FieldRuntimeType<any>
    >(
        type: BuiltInFieldType | string,
        Constructor: TConstructor
    ): void {
        if (type in this.store) {
            throw new Error(`Struct field runtime type '${type}' has already been registered`);
        }
        this.store[type] = Constructor;
    }
}

export const GlobalStructFieldRuntimeTypeRegistry = new StructFieldRuntimeTypeRegistry();
