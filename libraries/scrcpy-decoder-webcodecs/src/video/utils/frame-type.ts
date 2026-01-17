export function convertFrameType(
    keyframe?: boolean,
): EncodedVideoChunkType | undefined {
    if (keyframe === true) return "key";
    if (keyframe === false) return "delta";
    return undefined;
}
