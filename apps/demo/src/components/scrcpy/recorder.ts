import {
    ScrcpyAudioCodec,
    ScrcpyMediaStreamDataPacket,
    ScrcpyMediaStreamPacket,
    ScrcpyVideoCodecId,
    ScrcpyVideoStreamMetadata,
    h264SearchConfiguration,
    h264SplitNalu,
} from "@yume-chan/scrcpy";
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

    for (const unit of h264SplitNalu(buffer)) {
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

// https://github.com/FFmpeg/FFmpeg/blob/adb5f7b41faf354a3e0bf722f44aeb230aefa310/libavformat/matroska.c
const MatroskaVideoCodecNameMap: Record<ScrcpyVideoCodecId, string> = {
    [ScrcpyVideoCodecId.H264]: "V_MPEG4/ISO/AVC",
    [ScrcpyVideoCodecId.H265]: "V_MPEGH/ISO/HEVC",
    [ScrcpyVideoCodecId.AV1]: "V_AV1",
};

const MatroskaAudioCodecNameMap: Record<string, string> = {
    [ScrcpyAudioCodec.RAW.mimeType]: "A_PCM/INT/LIT",
    [ScrcpyAudioCodec.AAC.mimeType]: "A_AAC",
    [ScrcpyAudioCodec.OPUS.mimeType]: "A_OPUS",
};

export class MatroskaMuxingRecorder {
    public running = false;

    private _videoMetadata: ScrcpyVideoStreamMetadata | undefined;
    private _audioCodec: ScrcpyAudioCodec | undefined;

    private muxer: WebMMuxer | undefined;
    private avcConfiguration: Uint8Array | undefined;
    private configurationWritten = false;
    private _firstTimestamp = -1;
    private _packetsFromLastKeyframe: {
        type: "video" | "audio";
        packet: ScrcpyMediaStreamDataPacket;
    }[] = [];

    private addVideoChunk(packet: ScrcpyMediaStreamDataPacket) {
        if (this._firstTimestamp === -1) {
            this._firstTimestamp = Number(packet.pts!);
        }

        const sample = h264StreamToAvcSample(packet.data);
        this.muxer!.addVideoChunkRaw(
            sample,
            packet.keyframe ? "key" : "delta",
            Number(packet.pts) - this._firstTimestamp,
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

    public addVideoPacket(packet: ScrcpyMediaStreamPacket) {
        try {
            if (packet.type === "configuration") {
                const { sequenceParameterSet, pictureParameterSet } =
                    h264SearchConfiguration(packet.data);
                this.avcConfiguration =
                    h264ConfigurationToAvcDecoderConfigurationRecord(
                        sequenceParameterSet,
                        pictureParameterSet
                    );
                this.configurationWritten = false;
                return;
            }

            // To ensure the first frame is a keyframe
            // save the last keyframe and the following frames
            if (packet.keyframe === true) {
                this._packetsFromLastKeyframe.length = 0;
            }
            this._packetsFromLastKeyframe.push({ type: "video", packet });

            if (!this.muxer) {
                return;
            }

            this.addVideoChunk(packet);
        } catch (e) {
            console.error(e);
        }
    }

    private addAudioChunk(chunk: ScrcpyMediaStreamDataPacket) {
        if (this._firstTimestamp === -1) {
            return;
        }

        const timestamp = Number(chunk.pts) - this._firstTimestamp;
        if (timestamp < 0) {
            return;
        }

        if (!this.muxer) {
            return;
        }

        this.muxer.addAudioChunkRaw(chunk.data, "key", timestamp);
    }

    public addAudioPacket(packet: ScrcpyMediaStreamDataPacket) {
        this._packetsFromLastKeyframe.push({ type: "audio", packet });
        this.addAudioChunk(packet);
    }

    public start(
        videoMetadata: ScrcpyVideoStreamMetadata,
        audioCodec: ScrcpyAudioCodec | undefined
    ) {
        if (!videoMetadata.codec) {
            throw new Error("Video codec is not defined");
        }

        this._videoMetadata = videoMetadata;
        this._audioCodec = audioCodec;

        this.running = true;

        const options: ConstructorParameters<typeof WebMMuxer>[0] = {
            target: "buffer",
            type: "matroska",
            firstTimestampBehavior: "permissive",
            video: {
                codec: MatroskaVideoCodecNameMap[videoMetadata.codec!],
                width: videoMetadata.width ?? 0,
                height: videoMetadata.height ?? 0,
            },
        };

        if (audioCodec) {
            options.audio = {
                codec: MatroskaAudioCodecNameMap[audioCodec.mimeType!],
                sampleRate: 48000,
                numberOfChannels: 2,
                bitDepth: audioCodec === ScrcpyAudioCodec.RAW ? 16 : undefined,
            };
        }

        this.muxer = new WebMMuxer(options);

        if (this._packetsFromLastKeyframe.length > 0) {
            for (const { type, packet } of this._packetsFromLastKeyframe) {
                if (type === "video") {
                    this.addVideoChunk(packet);
                } else {
                    this.addAudioChunk(packet);
                }
            }
        }
    }

    public stop() {
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
            }.mkv`
        );
        const writer = stream.getWriter();
        writer.write(new Uint8Array(buffer));
        writer.close();

        this.muxer = undefined;
        this.configurationWritten = false;
        this.running = false;
    }
}

export const RECORD_STATE = makeAutoObservable({
    recorder: new MatroskaMuxingRecorder(),
    recording: false,
    videoMetadata: undefined as ScrcpyVideoStreamMetadata | undefined,
    audioCodec: undefined as ScrcpyAudioCodec | undefined,
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
