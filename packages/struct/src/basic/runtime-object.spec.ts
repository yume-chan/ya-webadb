import { createRuntimeObject, getRuntimeValue, setRuntimeValue } from './runtime-object';

describe('RuntimeObject', () => {
    describe('createRuntimeObject', () => {
        it('should create a special object', () => {
            const object = createRuntimeObject();
            expect(Object.getOwnPropertySymbols(object)).toHaveLength(1);
        });
    });

    describe('getRuntimeValue', () => {
        it('should return previously set value', () => {
            const object = createRuntimeObject();
            const field = 'foo';
            const value = {} as any;
            setRuntimeValue(object, field, value);
            expect(getRuntimeValue(object, field)).toBe(value);
        });
    });

    describe('setRuntimeValue', () => {
        it('should define a proxy property to underlying `RuntimeValue`', () => {
            const object = createRuntimeObject();
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
