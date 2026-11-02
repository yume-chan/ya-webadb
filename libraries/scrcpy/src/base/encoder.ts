export interface ScrcpyEncoder {
    type: "video" | "audio";
    name: string;
    codec?: string;
    hardwareType?: "hardware" | "software" | "hybrid" | undefined;
    vendor?: boolean | undefined;
    aliasFor?: string | undefined;
}
