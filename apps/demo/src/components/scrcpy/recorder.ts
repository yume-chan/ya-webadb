import {
    ScrcpyVideoStreamFramePacket,
    ScrcpyVideoStreamPacket,
    splitH264Stream,
} from "@yume-chan/scrcpy";
import { InspectStream } from "@yume-chan/stream-extra";
import { action, makeAutoObservable, reaction } from "mobx";
import WebMMuxer from "webm-muxer";
import { saveFile } from "../../utils";

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

function h264StreamToAvcSample(buffer: Uint8Array) {
    const nalUnits: Uint8Array[] = [];
    let totalLength = 0;

    for (const unit of splitH264Stream(buffer)) {
        nalUnits.push(unit);
        totalLength += unit.byteLength + 4;
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
    private framesFromKeyframe: ScrcpyVideoStreamFramePacket[] = [];

    private appendFrame(frame: ScrcpyVideoStreamFramePacket) {
        let timestamp = Number(frame.pts);
        if (this.firstTimestamp === -1) {
            this.firstTimestamp = timestamp;
            timestamp = 0;
        } else {
            timestamp -= this.firstTimestamp;
        }

        const sample = h264StreamToAvcSample(frame.data);
        this.muxer!.addVideoChunkRaw(
            sample,
            frame.keyframe ? "key" : "delta",
            timestamp,
            this.configurationWritten
                ? undefined
                : {
                      decoderConfig: {
                          // Not used
                          codec: "",
                          description: this.avcConfiguration,
                      },
                  }
        );
        this.configurationWritten = true;
    }

    constructor() {
        super((packet) => {
            try {
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

                // To ensure the first frame is a keyframe
                // save the last keyframe and the following frames
                if (packet.keyframe === true) {
                    this.framesFromKeyframe.length = 0;
                }
                this.framesFromKeyframe.push(packet);

                if (!this.muxer) {
                    return;
                }

                this.appendFrame(packet);
            } catch (e) {
                console.error(e);
            }
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

        if (this.framesFromKeyframe.length > 0) {
            for (const frame of this.framesFromKeyframe) {
                this.appendFrame(frame);
            }
        }
    }

    stop() {
        if (!this.muxer) {
            return;
        }

        const buffer = this.muxer.finalize()!;
        const now = new Date();
        const stream = saveFile(
            // prettier-ignore
            `Recording ${
                now.getFullYear()
            }-${
                (now.getMonth() + 1).toString().padStart(2, '0')
            }-${
                now.getDate().toString().padStart(2, '0')
            } ${
                now.getHours().toString().padStart(2, '0')
            }-${
                now.getMinutes().toString().padStart(2, '0')
            }-${
                now.getSeconds().toString().padStart(2, '0')
            }.webm`
        );
        const writer = stream.getWriter();
        writer.write(new Uint8Array(buffer));
        writer.close();

        this.muxer = undefined;
        this.configurationWritten = false;
        this.running = false;
        this.firstTimestamp = -1;
    }
}

export const RECORD_STATE = makeAutoObservable({
    recorder: new MuxerStream(),
    recording: false,
    intervalId: -1,
    hours: 0,
    minutes: 0,
    seconds: 0,
});

reaction(
    () => RECORD_STATE.recording,
    (recording) => {
        if (recording) {
            RECORD_STATE.intervalId = window.setInterval(
                action(() => {
                    RECORD_STATE.seconds += 1;
                    if (RECORD_STATE.seconds >= 60) {
                        RECORD_STATE.seconds = 0;
                        RECORD_STATE.minutes += 1;
                    }
                    if (RECORD_STATE.minutes >= 60) {
                        RECORD_STATE.minutes = 0;
                        RECORD_STATE.hours += 1;
                    }
                }),
                1000
            );
        } else {
            window.clearInterval(RECORD_STATE.intervalId);
            RECORD_STATE.intervalId = -1;
            RECORD_STATE.hours = 0;
            RECORD_STATE.minutes = 0;
            RECORD_STATE.seconds = 0;
        }
    }
);
