import { describe, expect, it, jest, test } from "@jest/globals";

import { SyncPromise } from "./sync-promise.js";

describe('SyncPromise', () => {
    describe('constructor', () => {
        it('should call executor', () => {
            const executor = jest.fn((resolve) => {
                setTimeout(() => {
                    resolve(42);
                }, 10);
            });
            new SyncPromise(executor);
            expect(executor).toHaveBeenCalledTimes(1);
        });

        it('should asynchronously resolve', async () => {
            const promise = new SyncPromise((resolve) => {
                setTimeout(() => {
                    resolve(42);
                }, 10);
            });
            await expect(promise).resolves.toBe(42);
            await expect(promise.then()).resolves.toBe(42);
            await expect(promise.valueOrPromise()).resolves.toBe(42);
        });

        it('should asynchronously reject', async () => {
            const promise = new SyncPromise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('error'));
                }, 10);
            });
            await expect(promise).rejects.toThrow('error');
            await expect(promise.then()).rejects.toThrow('error');
            await expect(promise.valueOrPromise()).rejects.toThrow('error');
        });

        it('should synchronously resolve with value', async () => {
            const promise = new SyncPromise((resolve) => {
                resolve(42);
            });
            await expect(promise).resolves.toBe(42);
            await expect(promise.then()).resolves.toBe(42);
            expect(promise.valueOrPromise()).toBe(42);
        });

        it('should synchronously resolve with promise', async () => {
            const promise = new SyncPromise((resolve) => {
                resolve(
                    new Promise(
                        resolve =>
                            setTimeout(
                                () => resolve(42),
                                10
                            )
                    )
                );
            });
            await expect(promise).resolves.toBe(42);
            await expect(promise.then()).resolves.toBe(42);
            await expect(promise.valueOrPromise()).resolves.toBe(42);
        });

        it('should synchronously resolve with resolved SyncPromise', async () => {
            const promise = new SyncPromise((resolve) => {
                resolve(
                    new SyncPromise(
                        resolve =>
                            resolve(42),
                    )
                );
            });
            await expect(promise).resolves.toBe(42);
            await expect(promise.then()).resolves.toBe(42);
            expect(promise.valueOrPromise()).toBe(42);
        });

        it('should synchronously resolve with rejected SyncPromise', async () => {
            const promise = new SyncPromise((resolve) => {
                resolve(
                    new SyncPromise(
                        (_, reject) =>
                            reject(new Error('error'))
                    )
                );
            });
            await expect(promise).rejects.toThrowError('error');
            await expect(promise.then()).rejects.toThrowError('error');
            expect(() => promise.valueOrPromise()).toThrowError('error');
        });

        it('should synchronously resolve with unsettled SyncPromise', async () => {
            const promise = new SyncPromise((resolve) => {
                resolve(
                    new SyncPromise(
                        resolve =>
                            setTimeout(
                                () => resolve(42),
                                10
                            )
                    )
                );
            });
            await expect(promise).resolves.toBe(42);
            await expect(promise.then()).resolves.toBe(42);
            await expect(promise.valueOrPromise()).resolves.toBe(42);
        });

        it('should synchronously reject with error', async () => {
            const promise = new SyncPromise((_, reject) => {
                reject(new Error('error'));
            });
            await expect(promise).rejects.toThrow('error');
            await expect(promise.then()).rejects.toThrow('error');
            expect(() => promise.valueOrPromise()).toThrow('error');
        });

        it('should catch synchronous error', async () => {
            const promise = new SyncPromise(() => {
                throw new Error('error');
            });
            await expect(promise).rejects.toThrow('error');
            await expect(promise.then()).rejects.toThrow('error');
            expect(() => promise.valueOrPromise()).toThrow('error');
        });

        describe('should ignore multiple result', () => {
            test('multiple resolves', async () => {
                const promise = new SyncPromise((resolve) => {
                    resolve(42);
                    resolve(43);
                });
                await expect(promise).resolves.toBe(42);
            });

            test('multiple rejects', async () => {
                const promise = new SyncPromise((_, reject) => {
                    reject(new Error('error'));
                    reject(new Error('error2'));
                });
                await expect(promise).rejects.toThrow('error');
            });

            test('mixed', async () => {
                const promise = new SyncPromise((resolve, reject) => {
                    resolve(42);
                    reject(new Error('error2'));
                });
                await expect(promise).resolves.toBe(42);
            });

            test('mixed with throw', async () => {
                const promise = new SyncPromise((resolve) => {
                    resolve(42);
                    throw new Error('error2');
                });
                await expect(promise).resolves.toBe(42);
            });
        });
    });

    describe('#then', () => {
        it('chain a sync value', async () => {
            let promise = new SyncPromise(resolve => resolve(42));
            promise = promise.then(() => 'foo');
            await expect(promise).resolves.toBe('foo');
            await expect(promise.then()).resolves.toBe('foo');
            expect(promise.valueOrPromise()).toBe('foo');
        });

        it('chain a async value', async () => {
            let promise = new SyncPromise(resolve => resolve(42));
            promise = promise.then(
                () =>
                    new Promise(
                        (resolve) =>
                            setTimeout(
                                () => resolve('foo'),
                                10
                            )
                    )
            );
            await expect(promise).resolves.toBe('foo');
            await expect(promise.then()).resolves.toBe('foo');
            expect(promise.valueOrPromise()).resolves.toBe('foo');
        });
    });
});
