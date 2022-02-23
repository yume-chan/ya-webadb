import { Uint8ArrayBufferFieldSubType } from './base';
import { FixedLengthBufferLikeFieldDefinition } from './fixed-length';

describe('Types', () => {
    describe('FixedLengthArrayBufferLikeFieldDefinition', () => {
        describe('#getSize', () => {
            it('should return size in its options', () => {
                const definition = new FixedLengthBufferLikeFieldDefinition(
                    Uint8ArrayBufferFieldSubType.Instance,
                    { length: 10 },
                );
                expect(definition.getSize()).toBe(10);
            });
        });
    });
});
