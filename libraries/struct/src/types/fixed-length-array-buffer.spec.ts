import { ArrayBufferFieldType } from './array-buffer';
import { FixedLengthArrayBufferLikeFieldDefinition } from './fixed-length-array-buffer';

describe('Types', () => {
    describe('FixedLengthArrayBufferLikeFieldDefinition', () => {
        describe('#getSize', () => {
            it('should return size in its options', () => {
                const definition = new FixedLengthArrayBufferLikeFieldDefinition(
                    ArrayBufferFieldType.instance,
                    { length: 10 },
                );
                expect(definition.getSize()).toBe(10);
            });
        });
    });
});
