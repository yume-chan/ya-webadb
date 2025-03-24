import {
    bipedal,
    buffer,
    concat,
    decodeUtf8,
    encodeUtf8,
    extend,
    s16,
    s32,
    s64,
    s8,
    string,
    struct,
    u16,
    u32,
    u64,
    u8,
} from "@yume-chan/struct";

bipedal(function* () {});
buffer(u8);
decodeUtf8(new Uint8Array());
encodeUtf8("");
s16(1);
s32(1);
s64(1);
s8(1);
string(1);
u16(1);
u32(1);
u64(1);
u8(1);
struct({}, { littleEndian: true });
concat(
    { littleEndian: true },
    struct({ a: u8 }, { littleEndian: true }),
    struct({ b: u8 }, { littleEndian: true }),
);
extend(struct({ a: u16 }, { littleEndian: true }), { b: buffer(32) });

export * from "@yume-chan/scrcpy";
export * from "@yume-chan/struct";
