import type {
    ScrcpyMediaStreamPacket,
    ScrcpyVideoSize,
    ScrcpyVideoStreamMetadata,
} from "@yume-chan/scrcpy";
import {
    Av1,
    h264ParseConfiguration,
    h265ParseConfiguration,
    ScrcpyVideoCodecId,
    ScrcpyVideoSizeImpl,
} from "@yume-chan/scrcpy";
import type { ReadableStream } from "@yume-chan/stream-extra";
import { InspectStream } from "@yume-chan/stream-extra";

import type { AdbScrcpyOptions } from "./types.js";

export class AdbScrcpyVideoStream implements ScrcpyVideoSize {
    #options: AdbScrcpyOptions<object>;

    #metadata: ScrcpyVideoStreamMetadata;
    get metadata(): ScrcpyVideoStreamMetadata {
        return this.#metadata;
    }

    #stream: ReadableStream<ScrcpyMediaStreamPacket>;
    get stream(): ReadableStream<ScrcpyMediaStreamPacket> {
        return this.#stream;
    }

    #size = new ScrcpyVideoSizeImpl();
    get width() {
        return this.#size.width;
    }
    get height() {
        return this.#size.height;
    }
    get sizeChanged() {
        return this.#size.sizeChanged;
    }

    constructor(
        options: AdbScrcpyOptions<object>,
        metadata: ScrcpyVideoStreamMetadata,
        stream: ReadableStream<Uint8Array>,
    ) {
        this.#options = options;
        this.#metadata = metadata;
        this.#stream = stream
            .pipeThrough(this.#options.createMediaStreamTransformer())
            .pipeThrough(
                new InspectStream((packet) => {
                    if (packet.type === "configuration") {
                        switch (metadata.codec) {
                            case ScrcpyVideoCodecId.H264:
                                this.#configureH264(packet.data);
                                break;
                            case ScrcpyVideoCodecId.H265:
                                this.#configureH265(packet.data);
                                break;
                            case ScrcpyVideoCodecId.AV1:
                                // AV1 configuration is in data packet
                                break;
                        }
                    } else if (metadata.codec === ScrcpyVideoCodecId.AV1) {
                        this.#configureAv1(packet.data);
                    }
                }),
            );
    }

    #configureH264(data: Uint8Array) {
        const { croppedWidth, croppedHeight } = h264ParseConfiguration(data);
        this.#size.setSize(croppedWidth, croppedHeight);
    }

    #configureH265(data: Uint8Array) {
        const { croppedWidth, croppedHeight } = h265ParseConfiguration(data);
        this.#size.setSize(croppedWidth, croppedHeight);
    }

    #configureAv1(data: Uint8Array) {
        const parser = new Av1(data);
        const sequenceHeader = parser.searchSequenceHeaderObu();
        if (!sequenceHeader) {
            return;
        }

        const { max_frame_width_minus_1, max_frame_height_minus_1 } =
            sequenceHeader;

        const width = max_frame_width_minus_1 + 1;
        const height = max_frame_height_minus_1 + 1;

        this.#size.setSize(width, height);
    }
}
