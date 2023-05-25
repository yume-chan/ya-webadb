// cspell: ignore MPEGH
// cspell: ignore rbsp
// cspell: ignore Nalus

import {
    H265NaluRaw,
    ScrcpyAudioCodec,
    ScrcpyMediaStreamDataPacket,
    ScrcpyMediaStreamPacket,
    ScrcpyVideoCodecId,
    ScrcpyVideoStreamMetadata,
    annexBSplitNalu,
    h264SearchConfiguration,
    h265ParseSequenceParameterSet,
    h265ParseVideoParameterSet,
    h265SearchConfiguration,
} from "@yume-chan/scrcpy";
import { action, makeAutoObservable, reaction } from "mobx";
import { ArrayBufferTarget, Muxer as WebMMuxer } from "webm-muxer";
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
    videoParameterSet: H265NaluRaw,
    sequenceParameterSet: H265NaluRaw,
    pictureParameterSet: H265NaluRaw
) {
    const {
        profileTierLevel: {
            generalProfileTier: {
                profile_space: general_profile_space,
                tier_flag: general_tier_flag,
                profile_idc: general_profile_idc,
                profileCompatibilitySet: generalProfileCompatibilitySet,
                constraintSet: generalConstraintSet,
            },
            general_level_idc,
        },
        vps_max_layers_minus1,
        vps_temporal_id_nesting_flag,
    } = h265ParseVideoParameterSet(videoParameterSet.rbsp);

    const {
        chroma_format_idc,
        bit_depth_luma_minus8,
        bit_depth_chroma_minus8,
        vuiParameters: { min_spatial_segmentation_idc = 0 } = {},
    } = h265ParseSequenceParameterSet(sequenceParameterSet.rbsp);

    const buffer = new Uint8Array(
        23 +
            5 * 3 +
            videoParameterSet.data.length +
            sequenceParameterSet.data.length +
            pictureParameterSet.data.length
    );

    /* unsigned int(8) configurationVersion = 1; */
    buffer[0] = 1;

    /*
     * unsigned int(2) general_profile_space;
     * unsigned int(1) general_tier_flag;
     * unsigned int(5) general_profile_idc;
     */
    buffer[1] =
        (general_profile_space << 6) |
        (Number(general_tier_flag) << 5) |
        general_profile_idc;

    /* unsigned int(32) general_profile_compatibility_flags; */
    buffer[2] = generalProfileCompatibilitySet[0];
    buffer[3] = generalProfileCompatibilitySet[1];
    buffer[4] = generalProfileCompatibilitySet[2];
    buffer[5] = generalProfileCompatibilitySet[3];

    /* unsigned int(48) general_constraint_indicator_flags; */
    buffer[6] = generalConstraintSet[0];
    buffer[7] = generalConstraintSet[1];
    buffer[8] = generalConstraintSet[2];
    buffer[9] = generalConstraintSet[3];
    buffer[10] = generalConstraintSet[4];
    buffer[11] = generalConstraintSet[5];

    /* unsigned int(8) general_level_idc; */
    buffer[12] = general_level_idc;

    /*
     * bit(4) reserved = '1111'b;
     * unsigned int(12) min_spatial_segmentation_idc;
     */
    buffer[13] = 0xf0 | (min_spatial_segmentation_idc >> 8);
    buffer[14] = min_spatial_segmentation_idc;

    /*
     * bit(6) reserved = '111111'b;
     * unsigned int(2) parallelismType;
     */
    buffer[15] = 0xfc;

    /*
     * bit(6) reserved = '111111'b;
     * unsigned int(2) chromaFormat;
     */
    buffer[16] = 0xfc | chroma_format_idc;

    /*
     * bit(5) reserved = '11111'b;
     * unsigned int(3) bitDepthLumaMinus8;
     */
    buffer[17] = 0xf8 | bit_depth_luma_minus8;

    /*
     * bit(5) reserved = '11111'b;
     * unsigned int(3) bitDepthChromaMinus8;
     */
    buffer[18] = 0xf8 | bit_depth_chroma_minus8;

    /* bit(16) avgFrameRate; */
    buffer[19] = 0;
    buffer[20] = 0;

    /*
     * bit(2) constantFrameRate;
     * bit(3) numTemporalLayers;
     * bit(1) temporalIdNested;
     * unsigned int(2) lengthSizeMinusOne;
     */
    buffer[21] =
        ((vps_max_layers_minus1 + 1) << 3) |
        (Number(vps_temporal_id_nesting_flag) << 2) |
        3;

    /* unsigned int(8) numOfArrays; */
    buffer[22] = 3;

    let i = 23;

    for (const nalu of [
        videoParameterSet,
        sequenceParameterSet,
        pictureParameterSet,
    ]) {
        /*
         * bit(1) array_completeness;
         * unsigned int(1) reserved = 0;
         * unsigned int(6) NAL_unit_type;
         */
        buffer[i] = nalu.nal_unit_type;
        i += 1;

        /* unsigned int(16) numNalus; */
        buffer[i] = 0;
        i += 1;
        buffer[i] = 1;
        i += 1;

        /* unsigned int(16) nalUnitLength; */
        buffer[i] = nalu.data.length >> 8;
        i += 1;
        buffer[i] = nalu.data.length;
        i += 1;

        buffer.set(nalu.data, i);
        i += nalu.data.length;
    }

    return buffer;
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

    private muxer: WebMMuxer<ArrayBufferTarget> | undefined;
    private videoCodecDescription: Uint8Array | undefined;
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
                          description: this.videoCodecDescription,
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
                        this.videoCodecDescription =
                            h264ConfigurationToAvcDecoderConfigurationRecord(
                                sequenceParameterSet,
                                pictureParameterSet
                            );
                        this.configurationWritten = false;
                        break;
                    }
                    case ScrcpyVideoCodecId.H265: {
                        const {
                            videoParameterSet,
                            sequenceParameterSet,
                            pictureParameterSet,
                        } = h265SearchConfiguration(packet.data);
                        this.videoCodecDescription =
                            h265ConfigurationToHevcDecoderConfigurationRecord(
                                videoParameterSet,
                                sequenceParameterSet,
                                pictureParameterSet
                            );
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
            target: new ArrayBufferTarget(),
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

        this.muxer = new WebMMuxer(options as any);

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

        this.muxer.finalize()!;
        const buffer = this.muxer.target.buffer;
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
            RECORD_STATE.intervalId = globalThis.setInterval(
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
            ) as unknown as number;
        } else {
            globalThis.clearInterval(RECORD_STATE.intervalId);
            RECORD_STATE.intervalId = -1;
            RECORD_STATE.hours = 0;
            RECORD_STATE.minutes = 0;
            RECORD_STATE.seconds = 0;
        }
    }
);
