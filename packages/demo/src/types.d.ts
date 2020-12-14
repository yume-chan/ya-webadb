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

declare module 'file-loader!*';
declare module 'worker-loader!*' {
    class WebpackWorker extends Worker {
        constructor();
    }

    export default WebpackWorker;
}

declare module 'jmuxer' {
    export interface JMuxerOptions {
        node: string | HTMLVideoElement;

        mode?: 'video' | 'audio' | 'both';

        flushingTime?: number;

        clearBuffer?: boolean;

        fps?: number;

        onReady?: () => void;

        debug?: boolean;
    }

    export interface JMuxerData {
        video?: Uint8Array;

        audio?: Uint8Array;

        duration?: number;
    }

    export default class JMuxer {
        constructor(options: JMuxerOptions);

        feed(data: JMuxerData): void;

        destroy(): void;
    }
}
