class BitReader {
    private buffer: Uint8Array;

    private bytePosition = 0;

    private bitPosition = 0;

    public constructor(buffer: Uint8Array) {
        this.buffer = buffer;
    }

    public read(length: number): number {
        let result = 0;
        for (let i = 0; i < length; i += 1) {
            result = (result << 1) | this.next();
        }
        return result;
    }

    public next(): number {
        const value = (this.buffer[this.bytePosition] >> (7 - this.bitPosition)) & 1;
        this.bitPosition += 1;
        if (this.bitPosition === 8) {
            this.bytePosition += 1;
            this.bitPosition = 0;
        }
        return value;
    }

    public decodeExponentialGolombNumber(): number {
        let length = 0;
        while (this.next() === 0) {
            length += 1;
        }
        if (length === 0) {
            return 0;
        }
        return (1 << length | this.read(length)) - 1;
    }
}

function* iterateNalu(buffer: Uint8Array): Generator<Uint8Array> {
    let start = -1;
    let readIndex = 0;
    let writeIndex = 0;
    while (readIndex < buffer.length) {
        if (buffer[readIndex] !== 0x00) {
            buffer[writeIndex] = buffer[readIndex];
            readIndex += 1;
            writeIndex += 1;
            continue;
        }

        readIndex += 1;
        if (buffer[readIndex] !== 0x00) {
            buffer[writeIndex] = buffer[readIndex];
            readIndex += 1;
            writeIndex += 1;
            continue;
        }

        readIndex += 1;
        switch (buffer[readIndex]) {
            // @ts-expect-error fallthrough
            case 0x00:
                readIndex += 1;
                if (buffer[readIndex] !== 0x01) {
                    throw new Error('Invalid data');
                }
            case 0x01:
                if (start !== -1) {
                    yield buffer.subarray(start, writeIndex);
                }
                readIndex += 1;
                start = writeIndex;
                break;
            // @ts-expect-error fallthrough
            case 0x03:
                readIndex += 1;
            default:
                buffer[writeIndex] = buffer[readIndex];
                readIndex += 1;
                writeIndex += 1;
                break;
        }
    }

    yield buffer.subarray(start);
}

// 7.3.2.1.1 Sequence parameter set data syntax
export function parse_sequence_parameter_set(buffer: ArrayBuffer) {
    for (const nalu of iterateNalu(new Uint8Array(buffer))) {
        const reader = new BitReader(nalu);
        if (reader.next() !== 0) {
            throw new Error('Invalid data');
        }

        const nal_ref_idc = reader.read(2);
        const nal_unit_type = reader.read(5);

        if (nal_unit_type !== 7) {
            continue;
        }

        if (nal_ref_idc === 0) {
            throw new Error('Invalid data');
        }

        const profile_idc = reader.read(8);
        const constraint_set0_flag = !!reader.next();
        const constraint_set1_flag = !!reader.next();
        const constraint_set2_flag = !!reader.next();
        const constraint_set3_flag = !!reader.next();
        const constraint_set4_flag = !!reader.next();
        const constraint_set5_flag = !!reader.next();

        // reserved_zero_2bits
        if (reader.read(2) !== 0) {
            throw new Error('Invalid data');
        }

        const level_idc = reader.read(8);
        const seq_parameter_set_id = reader.decodeExponentialGolombNumber();

        if (profile_idc === 100 || profile_idc === 110 ||
            profile_idc === 122 || profile_idc === 244 || profile_idc === 44 ||
            profile_idc === 83 || profile_idc === 86 || profile_idc === 118 ||
            profile_idc === 128 || profile_idc === 138 || profile_idc === 139 ||
            profile_idc === 134) {
            const chroma_format_idc = reader.decodeExponentialGolombNumber();
            if (chroma_format_idc === 3) {
                const separate_colour_plane_flag = !!reader.next();
            }

            const bit_depth_luma_minus8 = reader.decodeExponentialGolombNumber();
            const bit_depth_chroma_minus8 = reader.decodeExponentialGolombNumber();

            const qpprime_y_zero_transform_bypass_flag = !!reader.next();

            const seq_scaling_matrix_present_flag = !!reader.next();
            if (seq_scaling_matrix_present_flag) {
                const seq_scaling_list_present_flag: boolean[] = [];
                for (let i = 0; i < ((chroma_format_idc !== 3) ? 8 : 12); i++) {
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

        const log2_max_frame_num_minus4 = reader.decodeExponentialGolombNumber();
        const pic_order_cnt_type = reader.decodeExponentialGolombNumber();
        if (pic_order_cnt_type === 0) {
            const log2_max_pic_order_cnt_lsb_minus4 = reader.decodeExponentialGolombNumber();
        } else if (pic_order_cnt_type === 1) {
            const delta_pic_order_always_zero_flag = reader.next();
            const offset_for_non_ref_pic = reader.decodeExponentialGolombNumber();
            const offset_for_top_to_bottom_field = reader.decodeExponentialGolombNumber();
            const num_ref_frames_in_pic_order_cnt_cycle = reader.decodeExponentialGolombNumber();
            const offset_for_ref_frame: number[] = [];
            for (let i = 0; i < num_ref_frames_in_pic_order_cnt_cycle; i++) {
                offset_for_ref_frame[i] = reader.decodeExponentialGolombNumber();
            }
        }

        const max_num_ref_frames = reader.decodeExponentialGolombNumber();
        const gaps_in_frame_num_value_allowed_flag = reader.next();
        const pic_width_in_mbs_minus1 = reader.decodeExponentialGolombNumber();
        const pic_height_in_map_units_minus1 = reader.decodeExponentialGolombNumber();

        const frame_mbs_only_flag = reader.next();
        if (!frame_mbs_only_flag) {
            const mb_adaptive_frame_field_flag = !!reader.next();
        }

        const direct_8x8_inference_flag = reader.next();

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

    throw new Error('Invalid data');
}
