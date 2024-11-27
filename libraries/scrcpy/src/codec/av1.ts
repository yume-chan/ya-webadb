// cspell: ignore uvlc
// cspell: ignore interintra
// cspell: ignore superres
// cspell: ignore cdef
// cspell: ignore bitdepth
// cspell: ignore Smpte
// cspell: ignore Chromat

export const AndroidAv1Profile = {
    Main8: 1 << 0,
    Main10: 1 << 1,
    Main10Hdr10: 1 << 12,
    Main10Hdr10Plus: 1 << 13,
};

export const AndroidAv1Level = {
    Level2: 1 << 0,
    Level21: 1 << 1,
    Level22: 1 << 2,
    Level23: 1 << 3,
    Level3: 1 << 4,
    Level31: 1 << 5,
    Level32: 1 << 6,
    Level33: 1 << 7,
    Level4: 1 << 8,
    Level41: 1 << 9,
    Level42: 1 << 10,
    Level43: 1 << 11,
    Level5: 1 << 12,
    Level51: 1 << 13,
    Level52: 1 << 14,
    Level53: 1 << 15,
    Level6: 1 << 16,
    Level61: 1 << 17,
    Level62: 1 << 18,
    Level63: 1 << 19,
    Level7: 1 << 20,
    Level71: 1 << 21,
    Level72: 1 << 22,
    Level73: 1 << 23,
};

class BitReader {
    #data: Uint8Array;
    #byte: number;

    #bytePosition: number = 0;
    #bitPosition: number = 7;

    get byteAligned() {
        return this.#bitPosition === 7;
    }

    get ended() {
        return this.#bytePosition >= this.#data.length;
    }

    constructor(data: Uint8Array) {
        this.#data = data;
        this.#byte = data[0]!;
    }

    f1() {
        const value = this.#byte >> this.#bitPosition;
        this.#bitPosition -= 1;
        if (this.#bitPosition < 0) {
            this.#bytePosition += 1;
            this.#bitPosition = 7;
            this.#byte = this.#data[this.#bytePosition]!;
        }
        return value & 1;
    }

    f(n: number) {
        let value = 0;
        for (; n > 0; n -= 1) {
            value <<= 1;
            value |= this.f1();
        }
        return value;
    }

    skip(n: number) {
        if (n <= this.#bitPosition + 1) {
            this.#bytePosition += 1;
            this.#bitPosition = 7;
            this.#byte = this.#data[this.#bytePosition]!;
            return;
        }

        n -= this.#bitPosition + 1;
        this.#bytePosition += 1;

        const bytes = (n / 8) | 0;
        if (bytes > 0) {
            this.#bytePosition += bytes;
            n -= bytes * 8;
        }

        this.#bitPosition = 7 - n;
        this.#byte = this.#data[this.#bytePosition]!;
    }

    readBytes(n: number) {
        if (!this.byteAligned) {
            throw new Error("Bytes must be byte-aligned");
        }

        const value = this.#data.subarray(
            this.#bytePosition,
            this.#bytePosition + n,
        );
        this.#bytePosition += n;
        this.#byte = this.#data[this.#bytePosition]!;
        return value;
    }

    getPosition() {
        return [this.#bytePosition, this.#bitPosition] as const;
    }

    setPosition([bytePosition, bitPosition]: readonly [number, number]) {
        this.#bytePosition = bytePosition;
        this.#bitPosition = bitPosition;
        this.#byte = this.#data[bytePosition]!;
    }
}

const ObuType = {
    SequenceHeader: 1,
    TemporalDelimiter: 2,
    FrameHeader: 3,
    TileGroup: 4,
    Metadata: 5,
    Frame: 6,
    RedundantFrameHeader: 7,
    TileList: 8,
    Padding: 15,
} as const;

type ObuType = (typeof ObuType)[keyof typeof ObuType];

const ColorPrimaries = {
    Bt709: 1,
    Unspecified: 2,
    Bt470M: 4,
    Bt470BG: 5,
    Bt601: 6,
    Smpte240: 7,
    GenericFilm: 8,
    Bt2020: 9,
    Xyz: 10,
    Smpte431: 11,
    Smpte432: 12,
    Ebu3213: 22,
} as const;

const TransferCharacteristics = {
    Bt709: 1,
    Unspecified: 2,
    Bt470M: 4,
    Bt470BG: 5,
    Bt601: 6,
    Smpte240: 7,
    Linear: 8,
    Log100: 9,
    Log100Sqrt10: 10,
    Iec61966: 11,
    Bt1361: 12,
    Srgb: 13,
    Bt2020Ten: 14,
    Bt2020Twelve: 15,
    Smpte2084: 16,
    Smpte428: 17,
    Hlg: 18,
} as const;

const MatrixCoefficients = {
    Identity: 0,
    Bt709: 1,
    Unspecified: 2,
    Fcc: 4,
    Bt470BG: 5,
    Bt601: 6,
    Smpte240: 7,
    YCgCo: 8,
    Bt2020Ncl: 9,
    Bt2020Cl: 10,
    Smpte2085: 11,
    ChromatNcl: 12,
    ChromatCl: 13,
    ICtCp: 14,
} as const;

export class Av1 extends BitReader {
    static ObuType = ObuType;
    static ColorPrimaries = ColorPrimaries;
    static TransferCharacteristics = TransferCharacteristics;
    static MatrixCoefficients = MatrixCoefficients;

    #Leb128Bytes: number = 0;

    uvlc() {
        let leadingZeros = 0;
        while (!this.f1()) {
            leadingZeros += 1;
        }
        if (leadingZeros >= 32) {
            return 2 ** 32 - 1;
        }
        const value = this.f(leadingZeros);
        return value + ((1 << leadingZeros) >>> 0) - 1;
    }

    leb128() {
        if (!this.byteAligned) {
            throw new Error("LEB128 must be byte-aligned");
        }

        let value = 0n;
        this.#Leb128Bytes = 0;
        for (let i = 0n; i < 8n; i += 1n) {
            const leb128_byte = this.f(8);
            value |= BigInt(leb128_byte & 0x7f) << (7n * i);
            this.#Leb128Bytes += 1;
            if ((leb128_byte & 0x80) == 0) {
                break;
            }
        }
        return value;
    }

    *annexBBitstream(): Generator<Av1.OpenBitstreamUnit, void, void> {
        while (!this.ended) {
            const temporal_unit_size = this.leb128();
            yield* this.temporalUnit(temporal_unit_size);
        }
    }

    *temporalUnit(sz: bigint): Generator<Av1.OpenBitstreamUnit, void, void> {
        while (sz > 0) {
            const frame_unit_size = this.leb128();
            sz -= BigInt(this.#Leb128Bytes);
            yield* this.frameUnit(frame_unit_size);
            sz -= frame_unit_size;
        }
    }

    *frameUnit(sz: bigint): Generator<Av1.OpenBitstreamUnit, void, void> {
        while (sz > 0) {
            const obu_length = this.leb128();
            sz -= BigInt(this.#Leb128Bytes);
            const obu = this.openBitstreamUnit(obu_length);
            if (obu) {
                yield obu;
            }
            sz -= obu_length;
        }
    }

    #OperatingPointIdc = 0;

    openBitstreamUnit(sz?: bigint) {
        const obu_header = this.obuHeader();
        let obu_size: bigint;
        if (obu_header.obu_has_size_field) {
            obu_size = this.leb128();
        } else if (sz !== undefined) {
            obu_size = sz - 1n - (obu_header.obu_extension_flag ? 1n : 0n);
        } else {
            throw new Error("obu_has_size_field must be true");
        }

        const startPosition = this.getPosition();

        if (
            obu_header.obu_type !== Av1.ObuType.SequenceHeader &&
            obu_header.obu_type !== Av1.ObuType.TemporalDelimiter &&
            this.#OperatingPointIdc !== 0 &&
            obu_header.obu_extension_header
        ) {
            const inTemporalLayer = !!(
                this.#OperatingPointIdc &
                (1 << obu_header.obu_extension_header.temporal_id)
            );
            const inSpatialLayer = !!(
                this.#OperatingPointIdc &
                (1 << (obu_header.obu_extension_header.spatial_id + 8))
            );
            if (!inTemporalLayer || !inSpatialLayer) {
                this.skip(Number(obu_size));
                return;
            }
        }

        let sequence_header_obu:
            | ReturnType<Av1["sequenceHeaderObu"]>
            | undefined;
        switch (obu_header.obu_type) {
            case Av1.ObuType.SequenceHeader:
                sequence_header_obu = this.sequenceHeaderObu();
                break;
        }

        const currentPosition = this.getPosition();
        const payloadBits =
            (currentPosition[0] - startPosition[0]) * 8 +
            (startPosition[1] - currentPosition[1]);

        if (
            obu_size > 0 /* &&
            obu_header.obu_type !== Av1.ObuType.TileGroup &&
            obu_header.obu_type !== Av1.ObuType.TileList &&
            obu_header.obu_type !== Av1.ObuType.Frame */
        ) {
            this.skip(Number(obu_size) * 8 - payloadBits);
        }
        return {
            obu_header,
            obu_size,
            sequence_header_obu,
        };
    }

    obuHeader() {
        const obu_forbidden_bit = !!this.f1();
        if (obu_forbidden_bit) {
            throw new Error("Invalid data");
        }

        const obu_type = this.f(4);
        const obu_extension_flag = !!this.f1();
        const obu_has_size_field = !!this.f1();
        this.f1();

        let obu_extension_header:
            | ReturnType<Av1["obuExtensionHeader"]>
            | undefined;
        if (obu_extension_flag) {
            obu_extension_header = this.obuExtensionHeader();
        }

        return {
            obu_type,
            obu_extension_flag,
            obu_has_size_field,
            obu_extension_header,
        };
    }

    obuExtensionHeader() {
        const temporal_id = this.f(3);
        const spatial_id = this.f(2);
        this.skip(3);
        return { temporal_id, spatial_id };
    }

    static readonly SelectScreenContentTools = 2;
    static readonly SelectIntegerMv = 2;

    sequenceHeaderObu() {
        const seq_profile = this.f(3);
        const still_picture = !!this.f1();
        const reduced_still_picture_header = !!this.f1();

        let timing_info_present_flag = false;
        let timing_info: ReturnType<Av1["timingInfo"]> | undefined;
        let decoder_model_info_present_flag = false;
        let decoder_model_info: ReturnType<Av1["decoderModelInfo"]> | undefined;
        let initial_display_delay_present_flag = false;
        let operating_points_cnt_minus_1 = 0;
        const operating_point_idc: number[] = [];
        const seq_level_idx: number[] = [];
        const seq_tier: number[] = [];
        const decoder_model_present_for_this_op: boolean[] = [];
        const initial_display_delay_present_for_this_op: boolean[] = [];
        let operating_parameters_info:
            | ReturnType<Av1["operatingParametersInfo"]>[]
            | undefined;
        let initial_display_delay_minus_1: number[] | undefined;
        if (reduced_still_picture_header) {
            operating_point_idc[0] = 0;
            seq_level_idx[0] = this.f(5);
            seq_tier[0] = 0;
            decoder_model_present_for_this_op[0] = false;
            initial_display_delay_present_for_this_op[0] = false;
        } else {
            timing_info_present_flag = !!this.f1();
            if (timing_info_present_flag) {
                timing_info = this.timingInfo();
                decoder_model_info_present_flag = !!this.f1();
                if (decoder_model_info_present_flag) {
                    decoder_model_info = this.decoderModelInfo();
                    operating_parameters_info = [];
                }
            }
            initial_display_delay_present_flag = !!this.f1();
            if (initial_display_delay_present_flag) {
                initial_display_delay_minus_1 = [];
            }
            operating_points_cnt_minus_1 = this.f(5);
            for (let i = 0; i <= operating_points_cnt_minus_1; i += 1) {
                operating_point_idc[i] = this.f(12);
                seq_level_idx[i] = this.f(5);
                if (seq_level_idx[i]! > 7) {
                    seq_tier[i] = this.f1();
                } else {
                    seq_tier[i] = 0;
                }
                if (decoder_model_info_present_flag) {
                    decoder_model_present_for_this_op[i] = !!this.f1();
                    if (decoder_model_present_for_this_op[i]) {
                        operating_parameters_info![i] =
                            this.operatingParametersInfo(decoder_model_info!);
                    }
                } else {
                    decoder_model_present_for_this_op[i] = false;
                }
                if (initial_display_delay_present_flag) {
                    initial_display_delay_present_for_this_op[i] = !!this.f1();
                    if (initial_display_delay_present_for_this_op[i]) {
                        initial_display_delay_minus_1![i] = this.f(4);
                    }
                }
            }
        }

        const operatingPoint = this.chooseOperatingPoint();
        this.#OperatingPointIdc = operating_point_idc[operatingPoint]!;

        const frame_width_bits_minus_1 = this.f(4);
        const frame_height_bits_minus_1 = this.f(4);
        const max_frame_width_minus_1 = this.f(frame_width_bits_minus_1 + 1);
        const max_frame_height_minus_1 = this.f(frame_height_bits_minus_1 + 1);

        let frame_id_numbers_present_flag = false;
        let delta_frame_id_length_minus_2: number | undefined;
        let additional_frame_id_length_minus_1: number | undefined;
        if (!reduced_still_picture_header) {
            frame_id_numbers_present_flag = !!this.f1();
            if (frame_id_numbers_present_flag) {
                delta_frame_id_length_minus_2 = this.f(4);
                additional_frame_id_length_minus_1 = this.f(3);
            }
        }

        const use_128x128_superblock = !!this.f1();
        const enable_filter_intra = !!this.f1();
        const enable_intra_edge_filter = !!this.f1();

        let enable_interintra_compound = false;
        let enable_masked_compound = false;
        let enable_warped_motion = false;
        let enable_dual_filter = false;
        let enable_order_hint = false;
        let enable_jnt_comp = false;
        let enable_ref_frame_mvs = false;
        let seq_choose_screen_content_tools = false;
        let seq_force_screen_content_tools = Av1.SelectScreenContentTools;
        let seq_choose_integer_mv = false;
        let seq_force_integer_mv = Av1.SelectIntegerMv;
        let order_hint_bits_minus_1: number | undefined;
        // let OrderHintBits = 0;
        if (!reduced_still_picture_header) {
            enable_interintra_compound = !!this.f1();
            enable_masked_compound = !!this.f1();
            enable_warped_motion = !!this.f1();
            enable_dual_filter = !!this.f1();

            enable_order_hint = !!this.f1();
            if (enable_order_hint) {
                enable_jnt_comp = !!this.f1();
                enable_ref_frame_mvs = !!this.f1();
            }

            seq_choose_screen_content_tools = !!this.f1();
            if (!seq_choose_screen_content_tools) {
                seq_force_screen_content_tools = this.f1();
            }

            if (seq_force_screen_content_tools > 0) {
                seq_choose_integer_mv = !!this.f1();
                if (!seq_choose_integer_mv) {
                    seq_force_integer_mv = this.f1();
                }
            }

            if (enable_order_hint) {
                order_hint_bits_minus_1 = this.f(3);
                // OrderHintBits = order_hint_bits_minus_1 + 1;
            }
        }

        const enable_superres = !!this.f1();
        const enable_cdef = !!this.f1();
        const enable_restoration = !!this.f1();
        const color_config = this.colorConfig(seq_profile);
        const film_grain_params_present = !!this.f1();

        return {
            seq_profile,
            still_picture,
            reduced_still_picture_header,
            timing_info_present_flag,
            timing_info,
            decoder_model_info_present_flag,
            decoder_model_info,
            initial_display_delay_present_flag,
            initial_display_delay_minus_1,
            operating_points_cnt_minus_1,
            operating_point_idc,
            seq_level_idx,
            seq_tier,
            decoder_model_present_for_this_op,
            operating_parameters_info,
            initial_display_delay_present_for_this_op,
            frame_width_bits_minus_1,
            frame_height_bits_minus_1,
            max_frame_width_minus_1,
            max_frame_height_minus_1,
            frame_id_numbers_present_flag,
            delta_frame_id_length_minus_2,
            additional_frame_id_length_minus_1,
            use_128x128_superblock,
            enable_filter_intra,
            enable_intra_edge_filter,
            enable_interintra_compound,
            enable_masked_compound,
            enable_warped_motion,
            enable_dual_filter,
            enable_order_hint,
            enable_jnt_comp,
            enable_ref_frame_mvs,
            seq_choose_screen_content_tools,
            seq_force_screen_content_tools,
            seq_choose_integer_mv,
            seq_force_integer_mv,
            order_hint_bits_minus_1,
            enable_superres,
            enable_cdef,
            enable_restoration,
            color_config,
            film_grain_params_present,
        };
    }

    searchSequenceHeaderObu() {
        while (!this.ended) {
            const obu = this.openBitstreamUnit();
            if (!obu) {
                continue;
            }
            if (obu.sequence_header_obu) {
                return obu.sequence_header_obu;
            }
        }
        return undefined;
    }

    timingInfo() {
        const num_units_in_display_tick = this.f(32);
        const time_scale = this.f(32);
        const equal_picture_interval = !!this.f1();
        let num_ticks_per_picture_minus_1: number | undefined;
        if (equal_picture_interval) {
            num_ticks_per_picture_minus_1 = this.uvlc();
        }
        return {
            num_units_in_display_tick,
            time_scale,
            equal_picture_interval,
            num_ticks_per_picture_minus_1,
        };
    }

    decoderModelInfo() {
        const buffer_delay_length_minus_1 = this.f(5);
        const num_units_in_decoding_tick = this.f(32);
        const buffer_removal_time_length_minus_1 = this.f(5);
        const frame_presentation_time_length_minus_1 = this.f(5);
        return {
            buffer_delay_length_minus_1,
            num_units_in_decoding_tick,
            buffer_removal_time_length_minus_1,
            frame_presentation_time_length_minus_1,
        };
    }

    operatingParametersInfo(
        decoderModelInfo: ReturnType<Av1["decoderModelInfo"]>,
    ) {
        const n = decoderModelInfo.buffer_delay_length_minus_1 + 1;
        const decoder_buffer_delay = this.f(n);
        const encoder_buffer_delay = this.f(n);
        const low_delay_mode_flag = !!this.f1();
        return {
            decoder_buffer_delay,
            encoder_buffer_delay,
            low_delay_mode_flag,
        };
    }

    chooseOperatingPoint() {
        return 0;
    }

    colorConfig(seq_profile: number) {
        const high_bitdepth = !!this.f1();
        let twelve_bit = false;
        let BitDepth = 8;
        if (seq_profile === 2 && high_bitdepth) {
            twelve_bit = !!this.f1();
            BitDepth = twelve_bit ? 12 : 10;
        } else if (seq_profile <= 2) {
            BitDepth = high_bitdepth ? 10 : 8;
        }

        let mono_chrome = false;
        if (seq_profile === 1) {
            mono_chrome = !!this.f1();
        }

        // const NumPlanes = mono_chrome ? 1 : 3;

        const color_description_present_flag = !!this.f1();
        let color_primaries: Av1.ColorPrimaries =
            Av1.ColorPrimaries.Unspecified;
        let transfer_characteristics: Av1.TransferCharacteristics =
            Av1.TransferCharacteristics.Unspecified;
        let matrix_coefficients: Av1.MatrixCoefficients =
            Av1.MatrixCoefficients.Unspecified;
        if (color_description_present_flag) {
            color_primaries = this.f(8) as Av1.ColorPrimaries;
            transfer_characteristics = this.f(8) as Av1.TransferCharacteristics;
            matrix_coefficients = this.f(8) as Av1.MatrixCoefficients;
        }

        let color_range = false;
        let subsampling_x: boolean;
        let subsampling_y: boolean;
        let chroma_sample_position = 0;
        let separate_uv_delta_q = false;
        if (mono_chrome) {
            color_range = !!this.f1();
            subsampling_x = true;
            subsampling_y = true;
        } else {
            if (
                color_primaries === Av1.ColorPrimaries.Bt709 &&
                transfer_characteristics === Av1.TransferCharacteristics.Srgb &&
                matrix_coefficients === Av1.MatrixCoefficients.Identity
            ) {
                color_range = true;
                subsampling_x = false;
                subsampling_y = false;
            } else {
                color_range = !!this.f1();
                switch (seq_profile) {
                    case 0:
                        subsampling_x = true;
                        subsampling_y = true;
                        break;
                    case 1:
                        subsampling_x = false;
                        subsampling_y = false;
                        break;
                    default:
                        if (BitDepth == 12) {
                            subsampling_x = !!this.f1();
                            if (subsampling_x) {
                                subsampling_y = !!this.f1();
                            } else {
                                subsampling_y = false;
                            }
                        } else {
                            subsampling_x = true;
                            subsampling_y = false;
                        }
                        break;
                }
                if (subsampling_x && subsampling_y) {
                    chroma_sample_position = this.f(2);
                }
            }
            separate_uv_delta_q = !!this.f1();
        }

        return {
            high_bitdepth,
            twelve_bit,
            BitDepth,
            mono_chrome,
            color_description_present_flag,
            color_primaries,
            transfer_characteristics,
            matrix_coefficients,
            color_range,
            subsampling_x,
            subsampling_y,
            chroma_sample_position,
            separate_uv_delta_q,
        };
    }
}

export namespace Av1 {
    export type OpenBitstreamUnit = Exclude<
        ReturnType<Av1["openBitstreamUnit"]>,
        undefined
    >;

    export type SequenceHeaderObu = ReturnType<Av1["sequenceHeaderObu"]>;

    export type ObuType = (typeof ObuType)[keyof typeof ObuType];

    export type ColorPrimaries =
        (typeof ColorPrimaries)[keyof typeof ColorPrimaries];

    export type TransferCharacteristics =
        (typeof TransferCharacteristics)[keyof typeof TransferCharacteristics];

    export type MatrixCoefficients =
        (typeof MatrixCoefficients)[keyof typeof MatrixCoefficients];
}
