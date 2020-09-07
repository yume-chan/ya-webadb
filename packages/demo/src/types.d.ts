declare module 'streamsaver' {
    type OriginalWriteableStream = typeof WritableStream;

    namespace StreamSaver {
        export interface Options<W = any> {
            size?: number;

            pathname?: string;

            writableStrategy?: QueuingStrategy<W>;

            readableStrategy?: QueuingStrategy<W>;
        }

        export function createWriteStream<W = any>(
            filename: string,
            options?: Options<W>
        ): WritableStream<W>;
        /** @deprecated */
        export function createWriteStream<W = any>(
            filename: string,
            size?: number,
            strategy?: QueuingStrategy<W>
        ): WritableStream<W>;
        /** @deprecated */
        export function createWriteStream<W = any>(
            filename: string,
            strategy?: QueuingStrategy<W>
        ): WritableStream<W>;

        export const WritableStream: OriginalWriteableStream;

        export const supported: true;

        export const version: { full: string; major: number, minor: number, dot: number; };

        export let mitm: string;
    }

    export = StreamSaver;
}
