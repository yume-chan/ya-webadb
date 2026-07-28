/**
 * Parse VP8 frame tag.
 *
 * https://datatracker.ietf.org/doc/html/rfc6386#section-19.1
 *
 * @param data Frame data
 * @returns
 */
export function parseFrameTag(data: Uint8Array): {
    version: number;
    show_frame: boolean;
    first_part_size: number;
} & (
    | {
          key_frame: true;
          width: number;
          horizontal_scale: number;
          height: number;
          vertical_scale: number;
      }
    | {
          key_frame: false;
          width?: undefined;
          horizontal_scale?: undefined;
          height?: undefined;
          vertical_scale?: undefined;
      }
) {
    const frame_tag = data[0]! | (data[1]! << 8) | (data[2]! << 16);

    const key_frame = (frame_tag & 0x01) === 0;
    const version = (frame_tag >> 1) & 0x07;
    const show_frame = ((frame_tag >> 4) & 0x01) === 1;
    const first_part_size = frame_tag >> 5;

    if (key_frame) {
        if (data[3] !== 0x9d || data[4] !== 0x01 || data[5] !== 0x2a) {
            throw new Error("Invalid VP8 frame");
        }

        const width = data[6]! | ((data[7]! & 0x3f) << 8);
        const horizontal_scale = (data[7]! & 0xc0) >> 6;
        const height = data[8]! | ((data[9]! & 0x3f) << 8);
        const vertical_scale = (data[9]! & 0xc0) >> 6;

        return {
            key_frame,
            version,
            show_frame,
            first_part_size,
            width,
            horizontal_scale,
            height,
            vertical_scale,
        };
    }

    return {
        key_frame,
        version,
        show_frame,
        first_part_size,
    };
}
