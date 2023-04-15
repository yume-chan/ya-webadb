// cspell: ignore golomb
// cspell: ignore qpprime
// cspell: ignore colour

import { NaluSodbBitReader, annexBSplitNalu } from "./nalu.js";

// From https://developer.android.com/reference/android/media/MediaCodecInfo.CodecProfileLevel
export enum AndroidAvcProfile {
    Baseline = 1 << 0,
    Main = 1 << 1,
    Extended = 1 << 2,
    High = 1 << 3,
    High10 = 1 << 4,
    High422 = 1 << 5,
    High444 = 1 << 6,
    ConstrainedBaseline = 1 << 16,
    ConstrainedHigh = 1 << 19,
}

export enum AndroidAvcLevel {
    Level1 = 1 << 0,
    Level1b = 1 << 1,
    Level11 = 1 << 2,
    Level12 = 1 << 3,
    Level13 = 1 << 4,
    Level2 = 1 << 5,
    Level21 = 1 << 6,
    Level22 = 1 << 7,
    Level3 = 1 << 8,
    Level31 = 1 << 9,
    Level32 = 1 << 10,
    Level4 = 1 << 11,
    Level41 = 1 << 12,
    Level42 = 1 << 13,
    Level5 = 1 << 14,
    Level51 = 1 << 15,
    Level52 = 1 << 16,
    Level6 = 1 << 17,
    Level61 = 1 << 18,
    Level62 = 1 << 19,
}

// H.264 has two standards: ITU-T H.264 and ISO/IEC 14496-10
// they have the same content, and refer themselves as "H.264".
// The name "AVC" (Advanced Video Coding) is only used in ISO spec name,
// and other ISO specs referring to H.264.
// Because this module parses H.264 Annex B format,
// it's named "h264" instead of "avc".

// 7.3.2.1.1 Sequence parameter set data syntax
// Variable names in this method uses the snake_case convention as in the spec for easier referencing.
export function h264ParseSequenceParameterSet(nalu: Uint8Array) {
    const reader = new NaluSodbBitReader(nalu);
    if (reader.next() !== 0) {
        throw new Error("Invalid data");
    }

    const nal_ref_idc = reader.read(2);
    const nal_unit_type = reader.read(5);

    if (nal_unit_type !== 7) {
        throw new Error("Invalid data");
    }

    if (nal_ref_idc === 0) {
        throw new Error("Invalid data");
    }

    const profile_idc = reader.read(8);
    const constraint_set = reader.peek(8);

    const constraint_set0_flag = !!reader.next();
    const constraint_set1_flag = !!reader.next();
    const constraint_set2_flag = !!reader.next();
    const constraint_set3_flag = !!reader.next();
    const constraint_set4_flag = !!reader.next();
    const constraint_set5_flag = !!reader.next();

    // reserved_zero_2bits
    if (reader.read(2) !== 0) {
        throw new Error("Invalid data");
    }

    const level_idc = reader.read(8);
    const seq_parameter_set_id = reader.decodeExponentialGolombNumber();

    if (
        profile_idc === 100 ||
        profile_idc === 110 ||
        profile_idc === 122 ||
        profile_idc === 244 ||
        profile_idc === 44 ||
        profile_idc === 83 ||
        profile_idc === 86 ||
        profile_idc === 118 ||
        profile_idc === 128 ||
        profile_idc === 138 ||
        profile_idc === 139 ||
        profile_idc === 134
    ) {
        const chroma_format_idc = reader.decodeExponentialGolombNumber();
        if (chroma_format_idc === 3) {
            // separate_colour_plane_flag
            reader.next();
        }

        // bit_depth_luma_minus8
        reader.decodeExponentialGolombNumber();
        // bit_depth_chroma_minus8
        reader.decodeExponentialGolombNumber();

        // qpprime_y_zero_transform_bypass_flag
        reader.next();

        const seq_scaling_matrix_present_flag = !!reader.next();
        if (seq_scaling_matrix_present_flag) {
            const seq_scaling_list_present_flag: boolean[] = [];
            for (let i = 0; i < (chroma_format_idc !== 3 ? 8 : 12); i += 1) {
                seq_scaling_list_present_flag[i] = !!reader.next();
                if (seq_scaling_list_present_flag[i])
                    if (i < 6) {
                        // TODO
                        // scaling_list( ScalingList4x4[ i ], 16,
                        //               UseDefaultScalingMatrix4x4Flag[ i ])
                    } else {
                        // TODO
                        // scaling_list( ScalingList8x8[ i − 6 ], 64,
                        //               UseDefaultScalingMatrix8x8Flag[ i − 6 ] )
                    }
            }
        }
    }

    // log2_max_frame_num_minus4
    reader.decodeExponentialGolombNumber();
    const pic_order_cnt_type = reader.decodeExponentialGolombNumber();
    if (pic_order_cnt_type === 0) {
        // log2_max_pic_order_cnt_lsb_minus4
        reader.decodeExponentialGolombNumber();
    } else if (pic_order_cnt_type === 1) {
        // delta_pic_order_always_zero_flag
        reader.next();
        // offset_for_non_ref_pic
        reader.decodeExponentialGolombNumber();
        // offset_for_top_to_bottom_field
        reader.decodeExponentialGolombNumber();
        const num_ref_frames_in_pic_order_cnt_cycle =
            reader.decodeExponentialGolombNumber();
        const offset_for_ref_frame: number[] = [];
        for (let i = 0; i < num_ref_frames_in_pic_order_cnt_cycle; i += 1) {
            offset_for_ref_frame[i] = reader.decodeExponentialGolombNumber();
        }
    }

    // max_num_ref_frames
    reader.decodeExponentialGolombNumber();
    // gaps_in_frame_num_value_allowed_flag
    reader.next();
    const pic_width_in_mbs_minus1 = reader.decodeExponentialGolombNumber();
    const pic_height_in_map_units_minus1 =
        reader.decodeExponentialGolombNumber();

    const frame_mbs_only_flag = reader.next();
    if (!frame_mbs_only_flag) {
        // mb_adaptive_frame_field_flag
        reader.next();
    }

    // direct_8x8_inference_flag
    reader.next();

    const frame_cropping_flag = !!reader.next();
    let frame_crop_left_offset: number;
    let frame_crop_right_offset: number;
    let frame_crop_top_offset: number;
    let frame_crop_bottom_offset: number;
    if (frame_cropping_flag) {
        frame_crop_left_offset = reader.decodeExponentialGolombNumber();
        frame_crop_right_offset = reader.decodeExponentialGolombNumber();
        frame_crop_top_offset = reader.decodeExponentialGolombNumber();
        frame_crop_bottom_offset = reader.decodeExponentialGolombNumber();
    } else {
        frame_crop_left_offset = 0;
        frame_crop_right_offset = 0;
        frame_crop_top_offset = 0;
        frame_crop_bottom_offset = 0;
    }

    const vui_parameters_present_flag = !!reader.next();
    if (vui_parameters_present_flag) {
        // TODO
        // vui_parameters( )
    }

    return {
        profile_idc,
        constraint_set,
        constraint_set0_flag,
        constraint_set1_flag,
        constraint_set2_flag,
        constraint_set3_flag,
        constraint_set4_flag,
        constraint_set5_flag,
        level_idc,
        seq_parameter_set_id,
        pic_width_in_mbs_minus1,
        pic_height_in_map_units_minus1,
        frame_mbs_only_flag,
        frame_cropping_flag,
        frame_crop_left_offset,
        frame_crop_right_offset,
        frame_crop_top_offset,
        frame_crop_bottom_offset,
    };
}

/**
 * Find Sequence Parameter Set (SPS) and Picture Parameter Set (PPS)
 * from H.264 Annex B formatted data.
 */
export function h264SearchConfiguration(buffer: Uint8Array) {
    let sequenceParameterSet: Uint8Array | undefined;
    let pictureParameterSet: Uint8Array | undefined;

    for (const nalu of annexBSplitNalu(buffer)) {
        const naluType = nalu[0]! & 0x1f;
        switch (naluType) {
            case 7: // Sequence parameter set
                sequenceParameterSet = nalu;
                if (pictureParameterSet) {
                    return {
                        sequenceParameterSet,
                        pictureParameterSet,
                    };
                }
                break;
            case 8: // Picture parameter set
                pictureParameterSet = nalu;
                if (sequenceParameterSet) {
                    return {
                        sequenceParameterSet,
                        pictureParameterSet,
                    };
                }
                break;
            default:
                // ignore
                break;
        }
    }

    throw new Error("Invalid data");
}

export interface H264Configuration {
    pictureParameterSet: Uint8Array;
    sequenceParameterSet: Uint8Array;

    profileIndex: number;
    constraintSet: number;
    levelIndex: number;

    encodedWidth: number;
    encodedHeight: number;

    cropLeft: number;
    cropRight: number;
    cropTop: number;
    cropBottom: number;
    croppedWidth: number;
    croppedHeight: number;
}

export function h264ParseConfiguration(data: Uint8Array): H264Configuration {
    const { sequenceParameterSet, pictureParameterSet } =
        h264SearchConfiguration(data);

    const {
        profile_idc: profileIndex,
        constraint_set: constraintSet,
        level_idc: levelIndex,
        pic_width_in_mbs_minus1,
        pic_height_in_map_units_minus1,
        frame_mbs_only_flag,
        frame_crop_left_offset,
        frame_crop_right_offset,
        frame_crop_top_offset,
        frame_crop_bottom_offset,
    } = h264ParseSequenceParameterSet(sequenceParameterSet);

    const encodedWidth = (pic_width_in_mbs_minus1 + 1) * 16;
    const encodedHeight =
        (pic_height_in_map_units_minus1 + 1) * (2 - frame_mbs_only_flag) * 16;
    const cropLeft = frame_crop_left_offset * 2;
    const cropRight = frame_crop_right_offset * 2;
    const cropTop = frame_crop_top_offset * 2;
    const cropBottom = frame_crop_bottom_offset * 2;

    const croppedWidth = encodedWidth - cropLeft - cropRight;
    const croppedHeight = encodedHeight - cropTop - cropBottom;

    return {
        pictureParameterSet,
        sequenceParameterSet,
        profileIndex,
        constraintSet,
        levelIndex,
        encodedWidth,
        encodedHeight,
        cropLeft,
        cropRight,
        cropTop,
        cropBottom,
        croppedWidth,
        croppedHeight,
    };
}
