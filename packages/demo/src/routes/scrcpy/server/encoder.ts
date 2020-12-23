import { PromiseResolver } from '@yume-chan/async-operation-manager';
import { createScrcpyConnection, ScrcpyOptions } from './connection';

const encoderRegex = /^\s+scrcpy --encoder-name '(.*?)'/;

export async function getEncoderList(options: ScrcpyOptions) {
    // Make a copy
    options = { ...options };

    // Provide an invalid encoder name
    // So the server will return all available encoders
    options.encoder = '_';

    const encoders: string[] = [];
    options.onError = message => {
        const match = message.match(encoderRegex);
        if (match) {
            encoders.push(match[1]);
        }
    };

    const resolver = new PromiseResolver<string[]>();
    options.onClose = () => {
        resolver.resolve(encoders);
    };

    await createScrcpyConnection(options);
    return resolver.promise;
}
