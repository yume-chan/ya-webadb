// cspell: ignore golomb
// cspell: ignore qpprime

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
        const value = (this.buffer[this.bytePosition]! >> (7 - this.bitPosition)) & 1;
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
                throw new Error('Invalid data');
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
            throw new Error('Invalid data');
        }

        if (lastZeroCount < 2) {
            // zero or one `0x00`s are acceptable
            continue;
        }

        if (byte === 0x01) {
            // Remove all leading `0x00`s and this `0x01`
            writeIndex -= lastZeroCount + 1;

            // Found another NAL unit
            yield buffer.subarray(start, writeIndex);

            start = writeIndex;
            continue;
        }

        if (lastZeroCount > 2) {
            // Too much `0x00`s
            throw new Error('Invalid data');
        }

        switch (byte) {
            case 0x02:
                // Didn't find why, but 7.4.1 NAL unit semantics forbids `0x000002` appearing in NAL units
                throw new Error('Invalid data');
            case 0x03:
                // `0x000003` is the "emulation_prevention_three_byte"
                // `0x00000300`, `0x00000301`, `0x00000302` and `0x00000303` represent
                // `0x000000`, `0x000001`, `0x000002` and `0x000003` respectively

                // Remove current byte
                writeIndex -= 1;

                inEmulation = true;
                break;
            default:
                // `0x000004` or larger are ok
                break;
        }
    }

    if (inEmulation || zeroCount !== 0) {
        throw new Error('Invalid data');
    }

    yield buffer.subarray(start, writeIndex);
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
        const constraint_set = reader.read(8);

        const constraint_set_reader = new BitReader(new Uint8Array([constraint_set]));
        const constraint_set0_flag = !!constraint_set_reader.next();
        const constraint_set1_flag = !!constraint_set_reader.next();
        const constraint_set2_flag = !!constraint_set_reader.next();
        const constraint_set3_flag = !!constraint_set_reader.next();
        const constraint_set4_flag = !!constraint_set_reader.next();
        const constraint_set5_flag = !!constraint_set_reader.next();

        // reserved_zero_2bits
        if (constraint_set_reader.read(2) !== 0) {
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
            const num_ref_frames_in_pic_order_cnt_cycle = reader.decodeExponentialGolombNumber();
            const offset_for_ref_frame: number[] = [];
            for (let i = 0; i < num_ref_frames_in_pic_order_cnt_cycle; i++) {
                offset_for_ref_frame[i] = reader.decodeExponentialGolombNumber();
            }
        }

        // max_num_ref_frames
        reader.decodeExponentialGolombNumber();
        // gaps_in_frame_num_value_allowed_flag
        reader.next();
        const pic_width_in_mbs_minus1 = reader.decodeExponentialGolombNumber();
        const pic_height_in_map_units_minus1 = reader.decodeExponentialGolombNumber();

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

    throw new Error('Invalid data');
}

export type SequenceParameterSet = ReturnType<typeof parse_sequence_parameter_set>;
