type HardwareAcceleration = "no-preference" | "prefer-hardware" | "prefer-software";

interface VideoDecoderConfig {
    codec: string;
    description?: BufferSource | undefined;
    codedWidth?: number | undefined;
    codedHeight?: number | undefined;
    displayAspectWidth?: number | undefined;
    displayAspectHeight?: number | undefined;
    colorSpace?: VideoColorSpaceInit | undefined;
    hardwareAcceleration?: HardwareAcceleration | undefined;
    optimizeForLatency?: boolean | undefined;
}

interface VideoDecoderSupport {
    supported: boolean;
    config: VideoDecoderConfig;
}

class VideoFrame {
    constructor(image: CanvasImageSource, init?: VideoFrameInit);
    constructor(image: VideoFrame, init?: VideoFrameInit);
    constructor(data: BufferSource, init: VideoFrameInit);

    get codedWidth(): number;
    get codedHeight(): number;
    get displayWidth(): number;

    close(): void;
}

interface CanvasDrawImage {
    drawImage(image: VideoFrame, dx: number, dy: number): void;
    drawImage(image: VideoFrame, dx: number, dy: number, dw: number, dh: number): void;
    drawImage(image: VideoFrame, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
}

interface VideoDecoderInit {
    output: (output: VideoFrame) => void;
    error: (error: DOMException) => void;
}

declare class VideoDecoder {
    static isConfigSupported(config: VideoDecoderConfig): Promise<VideoDecoderSupport>;

    constructor(options: VideoDecoderInit);

    get state(): 'unconfigured' | 'configured' | 'closed';
    get decodeQueueSize(): number;

    configure(config: VideoDecoderConfig): void;
    decode(chunk: EncodedVideoChunk): void;
    flush(): Promise<void>;
    reset(): void;
    close(): void;
}

type EncodedVideoChunkType = 'key' | 'delta';

interface EncodedVideoChunkInit {
    type: EncodedVideoChunkType;
    timestamp: number;
    duration?: number | undefined;
    data: BufferSource;
}

class EncodedVideoChunk {
    constructor(init: EncodedVideoChunkInit);

    get type(): EncodedVideoChunkType;
    get timestamp(): number;
    get duration(): number | undefined;
    get byteLength(): number;

    copyTo(destination: BufferSource): void;
}

declare interface Window {
    VideoDecoder: typeof VideoDecoder;
    EncodedVideoChunk: typeof EncodedVideoChunk,
}
