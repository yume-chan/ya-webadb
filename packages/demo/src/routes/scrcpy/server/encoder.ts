import { createScrcpyConnection, ScrcpyOptions } from './connection';

export async function getEncoderList(options: ScrcpyOptions) {
    options.encoder = '_';
    const connection = await createScrcpyConnection(options);
    connection.onError(message => {
        let encoders: string[] = [];
        for (const line of message.split('\r')) {

        }
    });
}
