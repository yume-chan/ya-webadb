import { ScrcpyVideoStreamPacket } from "@yume-chan/scrcpy";
import { InspectStream } from "@yume-chan/stream-extra";
import WebMMuxer from "webm-muxer";

// https://ffmpeg.org/doxygen/0.11/avc_8c-source.html#l00106
function h264ConfigurationToAvcDecoderConfigurationRecord(
    sequenceParameterSet: Uint8Array,
    pictureParameterSet: Uint8Array
) {
    const buffer = new Uint8Array(
        11 + sequenceParameterSet.byteLength + pictureParameterSet.byteLength
    );
    buffer[0] = 1;
    buffer[1] = sequenceParameterSet[1];
    buffer[2] = sequenceParameterSet[2];
    buffer[3] = sequenceParameterSet[3];
    buffer[4] = 0xff;
    buffer[5] = 0xe1;
    buffer[6] = sequenceParameterSet.byteLength >> 8;
    buffer[7] = sequenceParameterSet.byteLength & 0xff;
    buffer.set(sequenceParameterSet, 8);
    buffer[8 + sequenceParameterSet.byteLength] = 1;
    buffer[9 + sequenceParameterSet.byteLength] =
        pictureParameterSet.byteLength >> 8;
    buffer[10 + sequenceParameterSet.byteLength] =
        pictureParameterSet.byteLength & 0xff;
    buffer.set(pictureParameterSet, 11 + sequenceParameterSet.byteLength);
    return buffer;
}

function h264NaluToAvcSample(buffer: Uint8Array) {
    const nalUnits: Uint8Array[] = [];
    let totalLength = 0;

    // -1 means we haven't found the first start code
    let start = -1;
    let writeIndex = 0;

    // How many `0x00`s in a row we have counted
    let zeroCount = 0;

    let inEmulation = false;

    for (const byte of buffer) {
        buffer[writeIndex] = byte;
        writeIndex += 1;

        if (inEmulation) {
            if (byte > 0x03) {
                // `0x00000304` or larger are invalid
                throw new Error("Invalid data");
            }

            inEmulation = false;
            continue;
        }

        if (byte == 0x00) {
            zeroCount += 1;
            continue;
        }

        const lastZeroCount = zeroCount;
        zeroCount = 0;

        if (start === -1) {
            // 0x000001 is the start code
            // But it can be preceded by any number of zeros
            // So 2 is the minimal
            if (lastZeroCount >= 2 && byte === 0x01) {
                // Found start of first NAL unit
                writeIndex = 0;
                start = 0;
                continue;
            }

            // Not begin with start code
            throw new Error("Invalid data");
        }

        if (lastZeroCount < 2) {
            // zero or one `0x00`s are acceptable
            continue;
        }

        if (byte === 0x01) {
            // Remove all leading `0x00`s and this `0x01`
            writeIndex -= lastZeroCount + 1;

            // Found another NAL unit
            nalUnits.push(buffer.subarray(start, writeIndex));
            totalLength += 4 + writeIndex - start;

            start = writeIndex;
            continue;
        }

        if (lastZeroCount > 2) {
            // Too much `0x00`s
            throw new Error("Invalid data");
        }

        switch (byte) {
            case 0x02:
                // Didn't find why, but 7.4.1 NAL unit semantics forbids `0x000002` appearing in NAL units
                throw new Error("Invalid data");
            case 0x03:
                // `0x000003` is the "emulation_prevention_three_byte"
                // `0x00000300`, `0x00000301`, `0x00000302` and `0x00000303` represent
                // `0x000000`, `0x000001`, `0x000002` and `0x000003` respectively

                // Remove current byte
                writeIndex -= 1;

                inEmulation = true;
                break;
            default:
                // `0x000004` or larger are as-is
                break;
        }

        if (inEmulation) {
            throw new Error("Invalid data");
        }

        nalUnits.push(buffer.subarray(start, writeIndex));
        totalLength += 4 + writeIndex - start;
    }

    const sample = new Uint8Array(totalLength);
    let offset = 0;
    for (const nalu of nalUnits) {
        sample[offset] = nalu.byteLength >> 24;
        sample[offset + 1] = nalu.byteLength >> 16;
        sample[offset + 2] = nalu.byteLength >> 8;
        sample[offset + 3] = nalu.byteLength & 0xff;
        sample.set(nalu, offset + 4);
        offset += 4 + nalu.byteLength;
    }
    return sample;
}

export class MuxerStream extends InspectStream<ScrcpyVideoStreamPacket> {
    public running = false;

    private muxer: WebMMuxer | undefined;
    private width = 0;
    private height = 0;
    private firstTimestamp = -1;
    private avcConfiguration: Uint8Array | undefined;
    private configurationWritten = false;
    private keyframeWritten = false;

    constructor() {
        super((packet) => {
            if (packet.type === "configuration") {
                this.width = packet.data.croppedWidth;
                this.height = packet.data.croppedHeight;
                this.avcConfiguration =
                    h264ConfigurationToAvcDecoderConfigurationRecord(
                        packet.sequenceParameterSet,
                        packet.pictureParameterSet
                    );
                this.configurationWritten = false;
                return;
            }

            if (!this.muxer) {
                return;
            }

            // if (!this.keyframeWritten && packet.keyframe !== true) {
            //     return;
            // }
            // this.keyframeWritten = true;

            let timestamp = Number(packet.pts);
            if (this.firstTimestamp === -1) {
                this.firstTimestamp = timestamp;
                timestamp = 0;
            } else {
                timestamp -= this.firstTimestamp;
            }

            const sample = h264NaluToAvcSample(packet.data.slice());
            this.muxer.addVideoChunk(
                {
                    byteLength: sample.byteLength,
                    timestamp,
                    type: packet.keyframe ? "key" : "delta",
                    // Not used
                    duration: null,
                    copyTo: (destination) => {
                        // destination is a Uint8Array
                        (destination as Uint8Array).set(sample);
                    },
                },
                {
                    decoderConfig: this.configurationWritten
                        ? undefined
                        : {
                              // Not used
                              codec: "",
                              description: this.avcConfiguration,
                          },
                }
            );
            this.configurationWritten = true;
        });
    }

    start() {
        this.running = true;
        this.muxer = new WebMMuxer({
            target: "buffer",
            video: {
                // https://www.matroska.org/technical/codec_specs.html
                codec: "V_MPEG4/ISO/AVC",
                width: this.width,
                height: this.height,
            },
        });

        setTimeout(() => {
            this.stop();
        }, 5000);
    }

    stop() {
        if (!this.muxer) {
            return;
        }

        const buffer = this.muxer.finalize()!;
        const blob = new Blob([buffer], { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "scrcpy.webm";
        a.click();

        this.muxer = undefined;
        this.configurationWritten = false;
        this.running = false;
        this.firstTimestamp = -1;
    }
}
