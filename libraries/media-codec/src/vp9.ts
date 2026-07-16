class BitReader {
    #data: Uint8Array;

    #byteOffset = 0;
    // Trigger load on first read
    #bitOffset = 8;
    #cache!: number;

    constructor(data: Uint8Array) {
        this.#data = data;
    }

    #load() {
        if (this.#bitOffset !== 8) {
            return;
        }

        if (this.#byteOffset >= this.#data.length) {
            throw new Error("Out of data");
        }

        this.#cache = this.#data[this.#byteOffset]!;
        this.#byteOffset += 1;
        this.#bitOffset = 0;
    }

    readBit(): number {
        this.#load();
        const value = (this.#cache >> (7 - this.#bitOffset)) & 0x01;
        this.#bitOffset += 1;
        return value;
    }

    read(n: number): number {
        if (n <= 0 || n > 32) {
            throw new Error("Invalid length");
        }

        let value = 0;
        for (let i = 0; i < n; i += 1) {
            value = (value << 1) | this.readBit();
        }

        return value;
    }
}

export const FrameTypeKeyFrame = 0;
export const FrameTypeNonKeyFrame = 1;

export function parseFrameHeader(data: Uint8Array): { Profile: number } & (
    | {
          show_existing_frame: true;
          frame_to_show_map_idx: number;
          frame_type?: undefined;
          intra_only?: undefined;
          color_config?: undefined;
          frame_size?: undefined;
          render_size?: undefined;
      }
    | ({
          show_existing_frame: false;
          show_frame: boolean;
          error_resilient_mode: number;
      } & (
          | {
                frame_type: typeof FrameTypeKeyFrame;
                color_config: ReturnType<typeof parseColorConfig>;
                frame_size: ReturnType<typeof parseFrameSize>;
                render_size: ReturnType<typeof parseRenderSize>;
                intra_only?: undefined;
            }
          | ({
                frame_type: typeof FrameTypeNonKeyFrame;
                reset_frame_context: number;
            } & (
                | {
                      intra_only: true;
                      color_config: ReturnType<typeof parseColorConfig>;
                      refresh_frame_flags: number;
                      frame_size: ReturnType<typeof parseFrameSize>;
                      render_size: ReturnType<typeof parseRenderSize>;
                  }
                | {
                      intra_only: false;
                      color_config?: undefined;
                      frame_size?: undefined;
                      render_size?: undefined;
                  }
            ))
      ))
) {
    const reader = new BitReader(data);

    const frame_marker = reader.read(2);
    if (frame_marker !== 2) {
        throw new Error("Invalid VP9 frame");
    }

    const profile_low_bit = reader.readBit();
    const profile_high_bit = reader.readBit();
    const Profile = (profile_high_bit << 1) | profile_low_bit;
    if (Profile === 3) {
        reader.readBit();
    }

    const show_existing_frame = !!reader.readBit();
    if (show_existing_frame) {
        const frame_to_show_map_idx = reader.read(3);
        return {
            Profile,

            show_existing_frame,
            frame_to_show_map_idx,
        };
    }

    const frame_type = reader.readBit() as
        | typeof FrameTypeKeyFrame
        | typeof FrameTypeNonKeyFrame;
    const show_frame = !!reader.readBit();
    const error_resilient_mode = reader.readBit();

    if (frame_type === FrameTypeKeyFrame) {
        parseFrameSyncCode(reader);

        const color_config = parseColorConfig(reader, Profile);
        const frame_size = parseFrameSize(reader);
        const render_size = parseRenderSize(
            reader,
            frame_size.FrameWidth,
            frame_size.FrameHeight,
        );

        return {
            Profile,

            show_existing_frame,

            frame_type: frame_type,
            show_frame,
            error_resilient_mode,

            color_config,
            frame_size,
            render_size,
        };
    } else {
        let intra_only: boolean;
        if (!show_frame) {
            intra_only = !!reader.readBit();
        } else {
            intra_only = false;
        }

        let reset_frame_context: number;
        if (!error_resilient_mode) {
            reset_frame_context = reader.read(2);
        } else {
            reset_frame_context = 0;
        }

        if (intra_only) {
            parseFrameSyncCode(reader);

            let color_config: ReturnType<typeof parseColorConfig>;
            if (Profile > 0) {
                color_config = parseColorConfig(reader, Profile);
            } else {
                color_config = {
                    BitDepth: 8,
                    color_space: ColorSpaceCsBt601,
                    subsampling_x: 1,
                    subsampling_y: 1,
                    color_range: 0, // ????
                };
            }

            const refresh_frame_flags = reader.read(8);

            const frame_size = parseFrameSize(reader);
            const render_size = parseRenderSize(
                reader,
                frame_size.FrameWidth,
                frame_size.FrameHeight,
            );

            return {
                Profile,
                show_existing_frame,

                frame_type,
                show_frame,
                error_resilient_mode,

                intra_only,
                reset_frame_context,

                color_config,
                refresh_frame_flags,
                frame_size,
                render_size,
            };
        } else {
            return {
                Profile,
                show_existing_frame,

                frame_type,
                show_frame,
                error_resilient_mode,

                intra_only,
                reset_frame_context,
            };
        }
    }
}

const ColorSpaceCsBt601 = 1;
const ColorSpaceCsRgb = 7;

/**
 * 6.2.1 Frame sync syntax
 */
function parseFrameSyncCode(reader: BitReader) {
    if (
        reader.read(8) !== 0x49 ||
        reader.read(8) !== 0x83 ||
        reader.read(8) !== 0x42
    ) {
        throw new Error("Invalid VP9 frame");
    }
}

/**
 * 6.2.2 Color config syntax
 */
function parseColorConfig(reader: BitReader, Profile: number) {
    let BitDepth: number;
    if (Profile >= 2) {
        const ten_or_twelve_bit = reader.readBit();
        BitDepth = ten_or_twelve_bit ? 12 : 10;
    } else {
        BitDepth = 8;
    }

    const color_space = reader.read(3);

    let color_range: number;
    let subsampling_x: number | undefined;
    let subsampling_y: number | undefined;
    if (color_space !== ColorSpaceCsRgb) {
        color_range = reader.readBit();
        if (Profile === 1 || Profile === 3) {
            subsampling_x = reader.readBit();
            subsampling_y = reader.readBit();
            reader.readBit();
        } else {
            subsampling_x = 1;
            subsampling_y = 1;
        }
    } else {
        color_range = 1;
        if (Profile === 1 || Profile === 3) {
            subsampling_x = 0;
            subsampling_y = 0;
            reader.readBit();
        }
    }

    return {
        BitDepth,
        color_space,
        color_range,
        subsampling_x,
        subsampling_y,
    };
}

/**
 * 6.2.3 Frame size syntax
 */
function parseFrameSize(reader: BitReader) {
    const frame_width_minus_1 = reader.read(16);
    const frame_height_minus_1 = reader.read(16);
    const FrameWidth = frame_width_minus_1 + 1;
    const FrameHeight = frame_height_minus_1 + 1;

    return {
        FrameWidth,
        FrameHeight,
    };
}

/**
 * 6.2.4 Render size syntax
 */
function parseRenderSize(
    reader: BitReader,
    FrameWidth: number,
    FrameHeight: number,
) {
    const render_and_frame_size_different = !!reader.readBit();
    if (render_and_frame_size_different) {
        const render_width_minus_1 = reader.read(16);
        const render_height_minus_1 = reader.read(16);
        const RenderWidth = render_width_minus_1 + 1;
        const RenderHeight = render_height_minus_1 + 1;

        return {
            render_and_frame_size_different,
            RenderWidth,
            RenderHeight,
        };
    } else {
        return {
            render_and_frame_size_different,
            RenderWidth: FrameWidth,
            RenderHeight: FrameHeight,
        };
    }
}
