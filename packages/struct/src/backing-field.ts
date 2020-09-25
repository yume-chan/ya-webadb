export const BackingField = Symbol('BackingField');

export function getBackingField<T = unknown>(object: unknown, field: string): T {
    return (object as any)[BackingField][field] as T;
}

export function setBackingField(object: unknown, field: string, value: any): void {
    (object as any)[BackingField][field] = value;
}

export function defineSimpleAccessors(object: unknown, field: string): void {
    Object.defineProperty(object, field, {
        configurable: true,
        enumerable: true,
        get() { return getBackingField(object, field); },
        set(value) { setBackingField(object, field, value); },
    });
}

export type WithBackingField<T> = T & { [BackingField]: any; };
