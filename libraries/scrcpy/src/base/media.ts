export interface ScrcpyMediaStreamConfigurationPacket {
    type: "configuration";
    data: Uint8Array;
}

export interface ScrcpyMediaStreamDataPacket {
    type: "data";
    keyframe?: boolean;
    pts?: bigint;
    data: Uint8Array;
}

export type ScrcpyMediaStreamPacket =
    | ScrcpyMediaStreamConfigurationPacket
    | ScrcpyMediaStreamDataPacket;
