import { FieldRuntimeValue } from './runtime-value';

const RuntimeValues = Symbol('RuntimeValues');

export interface RuntimeObject {
    [RuntimeValues]: Record<PropertyKey, FieldRuntimeValue>;
}

/** Creates a new runtime object that can be used with `getRuntimeValue` and `setRuntimeValue` */
export function createRuntimeObject(): RuntimeObject {
    return {
        [RuntimeValues]: {},
    };
}

/** Gets the previously set `RuntimeValue` for specified `key` on `object` */
export function getRuntimeValue(object: RuntimeObject, key: PropertyKey): FieldRuntimeValue {
    return object[RuntimeValues][key as any] as FieldRuntimeValue;
}

/**
 * Sets the `RuntimeValue` for specified `key` on `object`,
 * also sets up property accessors so reads/writes to `object`'s `key` will be forwarded to
 * the underlying `RuntimeValue`
 */
export function setRuntimeValue(object: RuntimeObject, key: PropertyKey, runtimeValue: FieldRuntimeValue): void {
    delete (object as any)[key];

    object[RuntimeValues][key as any] = runtimeValue;
    Object.defineProperty(object, key, {
        configurable: true,
        enumerable: true,
        get() { return runtimeValue.get(); },
        set(value) { runtimeValue.set(value); },
    });
}
