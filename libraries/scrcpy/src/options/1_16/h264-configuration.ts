// cspell: ignore golomb
// cspell: ignore qpprime
// cspell: ignore colour

// H.264 has two standards: ITU-T H.264 and ISO/IEC 14496-10
// they have the same content, and refer themselves as "H.264".
// The name "AVC" (Advanced Video Coding) is only used in ISO spec name,
// and other ISO specs referring to H.264.
// Because this module parses H.264 Annex B format,
// it's named "h264" instead of "avc".

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
        const value =
            (this.buffer[this.bytePosition]! >> (7 - this.bitPosition)) & 1;
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
        return ((1 << length) | this.read(length)) - 1;
    }
}

/**
 * Split NAL units from a H.264 Annex B stream.
 *
 * The input is not modified.
 * The returned NAL units are views of the input (no memory allocation nor copy),
 * and still contains emulation prevention bytes.
 *
 * This methods returns a generator, so it can be stopped immediately
 * after the interested NAL unit is found.
 */
export function* splitH264Stream(buffer: Uint8Array): Generator<Uint8Array> {
    // -1 means we haven't found the first start code
    let start = -1;
    // How many `0x00`s in a row we have counted
    let zeroCount = 0;
    let inEmulation = false;

    for (let i = 0; i < buffer.length; i += 1) {
        const byte = buffer[i]!;

        if (inEmulation) {
            if (byte > 0x03) {
                // `0x00000304` or larger are invalid
                throw new Error("Invalid data");
            }

            inEmulation = false;
            continue;
        }

        if (byte === 0x00) {
            zeroCount += 1;
            continue;
        }

        const prevZeroCount = zeroCount;
        zeroCount = 0;

        if (start === -1) {
            // 0x000001 is the start code
            // But it can be preceded by any number of zeros
            // So 2 is the minimal
            if (prevZeroCount >= 2 && byte === 0x01) {
                // Found start of first NAL unit
                start = i + 1;
                continue;
            }

            // Not begin with start code
            throw new Error("Invalid data");
        }

        if (prevZeroCount < 2) {
            // zero or one `0x00`s are acceptable
            continue;
        }

        if (byte === 0x01) {
            // Found another NAL unit
            yield buffer.subarray(start, i - prevZeroCount);

            start = i + 1;
            continue;
        }

        if (prevZeroCount > 2) {
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
                inEmulation = true;
                break;
            default:
                // `0x000004` or larger are as-is
                break;
        }
    }

    if (inEmulation) {
        throw new Error("Invalid data");
    }

    yield buffer.subarray(start, buffer.length);
}

/**
 * Remove emulation prevention bytes from a H.264 NAL Unit.
 *
 * The input is not modified.
 * If the input doesn't contain any emulation prevention bytes,
 * the input is returned as-is.
 * Otherwise, a new `Uint8Array` is created and returned.
 */
export function removeH264Emulation(buffer: Uint8Array) {
    // output will be created when first emulation prevention byte is found
    let output: Uint8Array | undefined;
    let outputOffset = 0;

    let zeroCount = 0;
    let inEmulation = false;

    let i = 0;
    scan: for (; i < buffer.length; i += 1) {
        const byte = buffer[i]!;

        if (byte === 0x00) {
            zeroCount += 1;
            continue;
        }

        // Current byte is not zero
        const prevZeroCount = zeroCount;
        zeroCount = 0;

        if (prevZeroCount < 2) {
            // zero or one `0x00`s are acceptable
            continue;
        }

        if (byte === 0x01) {
            // Unexpected start code
            throw new Error("Invalid data");
        }

        if (prevZeroCount > 2) {
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
                inEmulation = true;

                // Create output and copy the data before the emulation prevention byte
                // Output size is unknown, so we use the input size as an upper bound
                output = new Uint8Array(buffer.length - 1);
                output.set(buffer.subarray(0, i - prevZeroCount));
                outputOffset = i - prevZeroCount + 1;
                break scan;
            default:
                // `0x000004` or larger are as-is
                break;
        }
    }

    if (!output) {
        return buffer;
    }

    // Continue at the byte after the emulation prevention byte
    for (; i < buffer.length; i += 1) {
        const byte = buffer[i]!;

        output[outputOffset] = byte;
        outputOffset += 1;

        if (inEmulation) {
            if (byte > 0x03) {
                // `0x00000304` or larger are invalid
                throw new Error("Invalid data");
            }

            inEmulation = false;
            continue;
        }

        if (byte === 0x00) {
            zeroCount += 1;
            continue;
        }

        const prevZeroCount = zeroCount;
        zeroCount = 0;

        if (prevZeroCount < 2) {
            // zero or one `0x00`s are acceptable
            continue;
        }

        if (byte === 0x01) {
            // Unexpected start code
            throw new Error("Invalid data");
        }

        if (prevZeroCount > 2) {
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
                inEmulation = true;

                // Remove the emulation prevention byte
                outputOffset -= 1;
                break;
            default:
                // `0x000004` or larger are as-is
                break;
        }
    }

    return output.subarray(0, outputOffset);
}

// 7.3.2.1.1 Sequence parameter set data syntax
// Variable names in this method uses the snake_case convention as in the spec for easier referencing.
export function parseSequenceParameterSet(buffer: Uint8Array) {
    const reader = new BitReader(buffer);
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
    const constraint_set = reader.read(8);

    const constraint_set_reader = new BitReader(
        new Uint8Array([constraint_set])
    );
    const constraint_set0_flag = !!constraint_set_reader.next();
    const constraint_set1_flag = !!constraint_set_reader.next();
    const constraint_set2_flag = !!constraint_set_reader.next();
    const constraint_set3_flag = !!constraint_set_reader.next();
    const constraint_set4_flag = !!constraint_set_reader.next();
    const constraint_set5_flag = !!constraint_set_reader.next();

    // reserved_zero_2bits
    if (constraint_set_reader.read(2) !== 0) {
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
export function parseH264Configuration(buffer: Uint8Array) {
    let sequenceParameterSet: Uint8Array | undefined;
    let pictureParameterSet: Uint8Array | undefined;

    for (const nalu of splitH264Stream(buffer)) {
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
