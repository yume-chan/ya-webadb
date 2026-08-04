import {
    createCompressStream as createCompressStreamRaw,
    createDecompressStream as createDecompressStreamRaw,
} from "@structured-world/structured-zstd";
export type {
    CompressStream,
    DecompressStream,
} from "@structured-world/structured-zstd";
import * as Comlink from "comlink";

export async function createCompressStream() {
    return Comlink.proxy(await createCompressStreamRaw());
}

export async function createDecompressStream() {
    return Comlink.proxy(await createDecompressStreamRaw());
}
