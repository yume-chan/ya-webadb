import { StructDefaultOptions } from './context';
import { GlobalStructFieldRuntimeTypeRegistry } from './registry';

describe('Runtime', () => {
    describe('StructDefaultOptions', () => {
        it('should have `littleEndian` equals to `false`', () => {
            expect(StructDefaultOptions.littleEndian).toBe(false);
        });

        it('should have `fieldRuntimeTypeRegistry` equals to `GlobalStructFieldRuntimeTypeRegistry`', () => {
            expect(StructDefaultOptions.fieldRuntimeTypeRegistry).toBe(GlobalStructFieldRuntimeTypeRegistry);
        });
    });
});
