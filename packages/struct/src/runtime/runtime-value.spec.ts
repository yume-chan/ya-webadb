import { createObjectWithRuntimeValues, getRuntimeValue, setRuntimeValue } from './runtime-value';

describe('Runtime', () => {
    describe('RuntimeValue', () => {
        it('`createObjectWithRuntimeValues` should create an object with symbol', () => {
            const object = createObjectWithRuntimeValues();
            expect(Object.getOwnPropertySymbols(object)).toHaveLength(1);
        });

        it('`getRuntimeValue` should return previously set value', () => {
            const object = createObjectWithRuntimeValues();
            const field = 'foo';
            const value = {} as any;
            setRuntimeValue(object, field, value);
            expect(getRuntimeValue(object, field)).toBe(value);
        });

        it('`setRuntimeValue` should define a proxy to underlying `RuntimeValue`', () => {
            const object = createObjectWithRuntimeValues();
            const field = 'foo';
            const getter = jest.fn(() => 42);
            const setter = jest.fn((value: number) => { });
            const value = { get: getter, set: setter } as any;
            setRuntimeValue(object, field, value);

            expect((object as any)[field]).toBe(42);
            expect(getter).toBeCalledTimes(1);

            (object as any)[field] = 100;
            expect(setter).toBeCalledTimes(1);
            expect(setter).lastCalledWith(100);
        });
    });
});
