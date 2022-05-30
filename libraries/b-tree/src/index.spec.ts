import { describe, expect, it } from '@jest/globals';
import { BTree } from "./index.js";

describe('BTree', () => {
    describe('insert', () => {
        function validate(log: any[], min = -Infinity) {
            for (const item of log) {
                if (Array.isArray(item)) {
                    min = validate(item, min);
                } else if (typeof item === 'number') {
                    if (item < min) {
                        throw new Error();
                    }
                    min = item;
                }
            }
            return min;
        }

        it('should work with incremental values', () => {
            const tree = new BTree(6);
            const values = Array.from({ length: 1024 }, (_, i) => i);

            for (let i = 0; i < values.length; i += 1) {
                tree.insert(values[i]!);
                expect(() => validate(tree.root.log())).not.toThrow();
            }
        });

        it('should work with random data', () => {
            const tree = new BTree(6);
            const values = Array.from({ length: 1024 }, () => Math.random() * 1024 | 0);
            // const values = Array.from({ length: 1024 }, (_, i) => 1024 - i);
            // const values = Array.from({ length: 1024 }, (_, i) => i);

            for (let i = 0; i < values.length; i += 1) {
                tree.insert(values[i]!);
                expect(() => validate(tree.root.log())).not.toThrow();
            }
        });
    });

    describe('has', () => {
        it('should return true for inserted values', () => {
            const tree = new BTree(6);
            const values = Array.from({ length: 1024 }, () => Math.random() * 512 + 512 | 0);
            for (const value of values) {
                tree.insert(value);
            }
            for (let i = -1024; i < 2048; i++) {
                expect(tree.has(i)).toBe(values.includes(i));
            }
        });
    });
});
