import { DuplexStreamFactory } from './transform.js';

describe('DuplexStreamFactory', () => {
    it('should close all readable', async () => {
        const factory = new DuplexStreamFactory();
        const readable = factory.createReadable();
        const reader = readable.getReader();
        await factory.close();
        await reader.closed;
    });
});
