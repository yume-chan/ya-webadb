// cspell: ignore MPEGH

import {
    ScrcpyAudioCodec,
    ScrcpyMediaStreamDataPacket,
    ScrcpyMediaStreamPacket,
    ScrcpyVideoCodecId,
    ScrcpyVideoStreamMetadata,
    annexBSplitNalu,
    h264SearchConfiguration,
    h265ParseSequenceParameterSet,
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

function h265ConfigurationToHevcDecoderConfigurationRecord(
    videoParameterSet: Uint8Array,
    sequenceParameterSet: Uint8Array,
    pictureParameterSet: Uint8Array
) {
    const parsedSequenceParameterSet =
        h265ParseSequenceParameterSet(sequenceParameterSet);

    const buffer = new Uint8Array(100);
    buffer[0] = 1;
    buffer[1] =
        (parsedSequenceParameterSet.profileTierLevel.generalProfileTier
            .profile_space <<
            6) |
        (Number(
            parsedSequenceParameterSet.profileTierLevel.generalProfileTier
                .tier_flag
        ) <<
            5) |
        parsedSequenceParameterSet.profileTierLevel.generalProfileTier
            .profile_idc;

    buffer[2] =
        parsedSequenceParameterSet.profileTierLevel.generalProfileTier.profileCompatibilitySet[0];
    buffer[3] =
        parsedSequenceParameterSet.profileTierLevel.generalProfileTier.profileCompatibilitySet[1];
    buffer[4] =
        parsedSequenceParameterSet.profileTierLevel.generalProfileTier.profileCompatibilitySet[2];
    buffer[5] =
        parsedSequenceParameterSet.profileTierLevel.generalProfileTier.profileCompatibilitySet[3];

    buffer[6] =
        parsedSequenceParameterSet.profileTierLevel.generalProfileTier.constraintSet[0];
    buffer[7] =
        parsedSequenceParameterSet.profileTierLevel.generalProfileTier.constraintSet[1];
    buffer[8] =
        parsedSequenceParameterSet.profileTierLevel.generalProfileTier.constraintSet[2];
    buffer[9] =
        parsedSequenceParameterSet.profileTierLevel.generalProfileTier.constraintSet[3];
    buffer[10] =
        parsedSequenceParameterSet.profileTierLevel.generalProfileTier.constraintSet[4];
    buffer[11] =
        parsedSequenceParameterSet.profileTierLevel.generalProfileTier.constraintSet[5];
    buffer[12] =
        parsedSequenceParameterSet.profileTierLevel.generalProfileTier.constraintSet[6];

    buffer[13] = parsedSequenceParameterSet.profileTierLevel.general_level_idc;

    buffer[14] = 0xf0;
    buffer[15] = 0x00;

    buffer[16] = 0xfc;

    buffer[17] = 0xfc | parsedSequenceParameterSet.chroma_format_idc;
}

function h264StreamToAvcSample(buffer: Uint8Array) {
    const nalUnits: Uint8Array[] = [];
    let totalLength = 0;

    for (const unit of annexBSplitNalu(buffer)) {
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

    public videoMetadata: ScrcpyVideoStreamMetadata | undefined;
    public audioCodec: ScrcpyAudioCodec | undefined;

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
        if (!this.videoMetadata) {
            throw new Error("videoMetadata must be set");
        }

        try {
            if (packet.type === "configuration") {
                switch (this.videoMetadata.codec) {
                    case ScrcpyVideoCodecId.H264: {
                        const { sequenceParameterSet, pictureParameterSet } =
                            h264SearchConfiguration(packet.data);
                        this.avcConfiguration =
                            h264ConfigurationToAvcDecoderConfigurationRecord(
                                sequenceParameterSet,
                                pictureParameterSet
                            );
                        this.configurationWritten = false;
                        break;
                    }
                    case ScrcpyVideoCodecId.H265: {
                        this.configurationWritten = false;
                        break;
                    }
                }
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

    public start() {
        if (!this.videoMetadata) {
            throw new Error("videoMetadata must be set");
        }

        this.running = true;

        const options: ConstructorParameters<typeof WebMMuxer>[0] = {
            target: "buffer",
            type: "matroska",
            firstTimestampBehavior: "permissive",
            video: {
                codec: MatroskaVideoCodecNameMap[this.videoMetadata.codec!],
                width: this.videoMetadata.width ?? 0,
                height: this.videoMetadata.height ?? 0,
            },
        };

        if (this.audioCodec) {
            options.audio = {
                codec: MatroskaAudioCodecNameMap[this.audioCodec.mimeType!],
                sampleRate: 48000,
                numberOfChannels: 2,
                bitDepth:
                    this.audioCodec === ScrcpyAudioCodec.RAW ? 16 : undefined,
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
