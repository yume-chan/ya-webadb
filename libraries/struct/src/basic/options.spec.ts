import { StructDefaultOptions } from './options';

describe('StructDefaultOptions', () => {
    describe('.littleEndian', () => {
        it('should be `false`', () => {
            expect(StructDefaultOptions).toHaveProperty('littleEndian', false);
        });
    });
});
