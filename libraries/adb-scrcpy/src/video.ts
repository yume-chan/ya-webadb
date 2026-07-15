import { Av1, H264, H265 } from "@yume-chan/media-codec";
import type {
    ScrcpyVideoSize,
    ScrcpyVideoStreamMetadata,
    ScrcpyVideoStreamPacket,
} from "@yume-chan/scrcpy";
import { ScrcpyVideoCodecId, ScrcpyVideoSizeImpl } from "@yume-chan/scrcpy";
import type { ReadableStream } from "@yume-chan/stream-extra";
import { InspectStream } from "@yume-chan/stream-extra";

import type { AdbScrcpyOptions } from "./types.js";

export class AdbScrcpyVideoStream implements ScrcpyVideoSize {
    #options: AdbScrcpyOptions<object>;

    #metadata: ScrcpyVideoStreamMetadata;
    get metadata(): ScrcpyVideoStreamMetadata {
        return this.#metadata;
    }

    #stream: ReadableStream<ScrcpyVideoStreamPacket>;
    get stream(): ReadableStream<ScrcpyVideoStreamPacket> {
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
                new InspectStream(this.#handlePacket, {
                    close: () => this.#size.dispose(),
                    cancel: () => this.#size.dispose(),
                }),
            );
    }

    #supportSessionPackets = false;
    #handlePacket = (packet: ScrcpyVideoStreamPacket): undefined => {
        switch (packet.type) {
            case "session":
                this.#supportSessionPackets = true;
                this.#size.setSize(
                    packet.width,
                    packet.height,
                    packet.isClientResize,
                );
                break;
            case "configuration":
                if (this.#supportSessionPackets) {
                    break;
                }

                switch (this.#metadata.codec) {
                    case ScrcpyVideoCodecId.H264:
                        this.#configureH264(packet.data);
                        break;
                    case ScrcpyVideoCodecId.H265:
                        this.#configureH265(packet.data);
                        break;
                    case ScrcpyVideoCodecId.Av1:
                        // AV1 configuration is in data packet
                        break;
                }

                break;
            case "data":
                if (this.#supportSessionPackets) {
                    break;
                }

                if (this.#metadata.codec === ScrcpyVideoCodecId.Av1) {
                    this.#configureAv1(packet.data);
                }

                break;
        }
    };

    #configureH264(data: Uint8Array) {
        const { croppedWidth, croppedHeight } = H264.parseConfiguration(data);
        this.#size.setSize(croppedWidth, croppedHeight);
    }

    #configureH265(data: Uint8Array) {
        const { croppedWidth, croppedHeight } = H265.parseConfiguration(data);
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
