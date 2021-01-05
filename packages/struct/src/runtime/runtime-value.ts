import { FieldRuntimeValue } from './runtime-type';

const RuntimeValues = Symbol('RuntimeValues');

export interface WithRuntimeValues {
    [RuntimeValues]: Record<string, FieldRuntimeValue>;
}

export function createObjectWithRuntimeValues(): WithRuntimeValues {
    const object = {} as any;
    object[RuntimeValues] = {};
    return object;
}

export function getRuntimeValue(object: WithRuntimeValues, field: string): FieldRuntimeValue {
    return (object as any)[RuntimeValues][field] as FieldRuntimeValue;
}

export function setRuntimeValue(object: WithRuntimeValues, field: string, runtimeValue: FieldRuntimeValue): void {
    (object as any)[RuntimeValues][field] = runtimeValue;
    delete (object as any)[field];
    Object.defineProperty(object, field, {
        configurable: true,
        enumerable: true,
        get() { return runtimeValue.get(); },
        set(value) { runtimeValue.set(value); },
    });
}
