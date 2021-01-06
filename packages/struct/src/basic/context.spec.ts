import { StructDefaultOptions } from './context';

describe('Runtime', () => {
    describe('StructDefaultOptions', () => {
        it('should have `littleEndian` that equals to `false`', () => {
            expect(StructDefaultOptions).toHaveProperty('littleEndian', false);
        });
    });
});
