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

export interface ScrcpyVideoStreamSessionPacket {
    type: "session";
    isClientResize: boolean;
    width: number;
    height: number;
}

export type ScrcpyAudioStreamPacket =
    | ScrcpyMediaStreamConfigurationPacket
    | ScrcpyMediaStreamDataPacket;

export type ScrcpyVideoStreamPacket =
    | ScrcpyAudioStreamPacket
    | ScrcpyVideoStreamSessionPacket;
