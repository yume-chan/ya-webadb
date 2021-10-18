/////////////////////////////
/// Window APIs
/////////////////////////////

interface AudioDataCopyToOptions {
    format?: AudioSampleFormat;
    frameCount?: number;
    frameOffset?: number;
    planeIndex: number;
}

interface AudioDataInit {
    data: BufferSource;
    format: AudioSampleFormat;
    numberOfChannels: number;
    numberOfFrames: number;
    sampleRate: number;
    timestamp: number;
}

interface AudioDecoderConfig {
    codec: string;
    description?: BufferSource;
    numberOfChannels: number;
    sampleRate: number;
}

interface AudioDecoderInit {
    error: WebCodecsErrorCallback;
    output: AudioDataOutputCallback;
}

interface AudioDecoderSupport {
    config?: AudioDecoderConfig;
    supported?: boolean;
}

interface AudioEncoderConfig {
    bitrate?: number;
    codec: string;
    numberOfChannels?: number;
    sampleRate?: number;
}

interface AudioEncoderInit {
    error: WebCodecsErrorCallback;
    output: EncodedAudioChunkOutputCallback;
}

interface AudioEncoderSupport {
    config?: AudioEncoderConfig;
    supported?: boolean;
}

interface EncodedAudioChunkInit {
    data: BufferSource;
    duration?: number;
    timestamp: number;
    type: EncodedAudioChunkType;
}

interface EncodedAudioChunkMetadata {
    decoderConfig?: AudioDecoderConfig;
}

interface EncodedVideoChunkInit {
    data: BufferSource;
    duration?: number;
    timestamp: number;
    type: EncodedVideoChunkType;
}

interface EncodedVideoChunkMetadata {
    alphaSideData?: BufferSource;
    decoderConfig?: VideoDecoderConfig;
    svc?: SvcOutputMetadata;
}

interface ImageDecodeOptions {
    completeFramesOnly?: boolean;
    frameIndex?: number;
}

interface ImageDecodeResult {
    complete: boolean;
    image: VideoFrame;
}

interface ImageDecoderInit {
    colorSpaceConversion?: ColorSpaceConversion;
    data: ImageBufferSource;
    desiredHeight?: number;
    desiredWidth?: number;
    preferAnimation?: boolean;
    premultiplyAlpha?: PremultiplyAlpha;
    type: string;
}

interface PlaneLayout {
    offset: number;
    stride: number;
}

interface SvcOutputMetadata {
    temporalLayerId?: number;
}

interface VideoColorSpaceInit {
    fullRange?: boolean;
    matrix?: VideoMatrixCoefficients;
    primaries?: VideoColorPrimaries;
    transfer?: VideoTransferCharacteristics;
}

interface VideoDecoderConfig {
    codec: string;
    codedHeight?: number;
    codedWidth?: number;
    colorSpace?: VideoColorSpaceInit;
    description?: BufferSource;
    displayAspectHeight?: number;
    displayAspectWidth?: number;
    hardwareAcceleration?: HardwareAcceleration;
    optimizeForLatency?: boolean;
}

interface VideoDecoderInit {
    error: WebCodecsErrorCallback;
    output: VideoFrameOutputCallback;
}

interface VideoDecoderSupport {
    config?: VideoDecoderConfig;
    supported?: boolean;
}

interface VideoEncoderConfig {
    alpha?: AlphaOption;
    bitrate?: number;
    bitrateMode?: BitrateMode;
    codec: string;
    displayHeight?: number;
    displayWidth?: number;
    framerate?: number;
    hardwareAcceleration?: HardwareAcceleration;
    height: number;
    latencyMode?: LatencyMode;
    scalabilityMode?: string;
    width: number;
}

interface VideoEncoderEncodeOptions {
    keyFrame?: boolean;
}

interface VideoEncoderInit {
    error: WebCodecsErrorCallback;
    output: EncodedVideoChunkOutputCallback;
}

interface VideoFrameBufferInit {
    codedHeight: number;
    codedWidth: number;
    colorSpace?: VideoColorSpaceInit;
    displayHeight?: number;
    displayWidth?: number;
    duration?: number;
    format: VideoPixelFormat;
    layout?: PlaneLayout[];
    timestamp: number;
    visibleRect?: DOMRectInit;
}

interface VideoFrameCopyToOptions {
    layout?: PlaneLayout[];
    rect?: DOMRectInit;
}

interface VideoFrameInit {
    alpha?: AlphaOption;
    displayHeight?: number;
    displayWidth?: number;
    duration?: number;
    timestamp?: number;
    visibleRect?: DOMRectInit;
}

interface AudioData {
    readonly duration: number;
    readonly format: AudioSampleFormat | null;
    readonly numberOfChannels: number;
    readonly numberOfFrames: number;
    readonly sampleRate: number;
    readonly timestamp: number;
    allocationSize(options: AudioDataCopyToOptions): number;
    clone(): AudioData;
    close(): void;
    copyTo(destination: BufferSource, options: AudioDataCopyToOptions): void;
}

declare var AudioData: {
    prototype: AudioData;
    new(init: AudioDataInit): AudioData;
};

/** Available only in secure contexts. */
interface AudioDecoder {
    readonly decodeQueueSize: number;
    readonly state: CodecState;
    close(): void;
    configure(config: AudioDecoderConfig): void;
    decode(chunk: EncodedAudioChunk): void;
    flush(): Promise<void>;
    reset(): void;
}

declare var AudioDecoder: {
    prototype: AudioDecoder;
    new(init: AudioDecoderInit): AudioDecoder;
    isConfigSupported(config: AudioDecoderConfig): Promise<AudioDecoderSupport>;
};

/** Available only in secure contexts. */
interface AudioEncoder {
    readonly encodeQueueSize: number;
    readonly state: CodecState;
    close(): void;
    configure(config: AudioEncoderConfig): void;
    encode(data: AudioData): void;
    flush(): Promise<void>;
    reset(): void;
}

declare var AudioEncoder: {
    prototype: AudioEncoder;
    new(init: AudioEncoderInit): AudioEncoder;
    isConfigSupported(config: AudioEncoderConfig): Promise<AudioEncoderSupport>;
};

interface EncodedAudioChunk {
    readonly byteLength: number;
    readonly duration: number | null;
    readonly timestamp: number;
    readonly type: EncodedAudioChunkType;
    copyTo(destination: BufferSource): void;
}

declare var EncodedAudioChunk: {
    prototype: EncodedAudioChunk;
    new(init: EncodedAudioChunkInit): EncodedAudioChunk;
};

interface EncodedVideoChunk {
    readonly byteLength: number;
    readonly duration: number | null;
    readonly timestamp: number;
    readonly type: EncodedVideoChunkType;
    copyTo(destination: BufferSource): void;
}

declare var EncodedVideoChunk: {
    prototype: EncodedVideoChunk;
    new(init: EncodedVideoChunkInit): EncodedVideoChunk;
};

/** Available only in secure contexts. */
interface ImageDecoder {
    readonly complete: boolean;
    readonly completed: Promise<undefined>;
    readonly tracks: ImageTrackList;
    close(): void;
    decode(options?: ImageDecodeOptions): Promise<ImageDecodeResult>;
    reset(): void;
}

declare var ImageDecoder: {
    prototype: ImageDecoder;
    new(init: ImageDecoderInit): ImageDecoder;
    isTypeSupported(type: string): Promise<boolean>;
};

interface ImageTrackEventMap {
    "change": Event;
}

interface ImageTrack extends EventTarget {
    readonly animated: boolean;
    readonly frameCount: number;
    onchange: ((this: ImageTrack, ev: Event) => any) | null;
    readonly repetitionCount: number;
    selected: boolean;
    addEventListener<K extends keyof ImageTrackEventMap>(type: K, listener: (this: ImageTrack, ev: ImageTrackEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<K extends keyof ImageTrackEventMap>(type: K, listener: (this: ImageTrack, ev: ImageTrackEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

declare var ImageTrack: {
    prototype: ImageTrack;
    new(): ImageTrack;
};

interface ImageTrackList {
    readonly length: number;
    readonly ready: Promise<undefined>;
    readonly selectedIndex: number;
    readonly selectedTrack: ImageTrack | null;
    [index: number]: ImageTrack;
}

declare var ImageTrackList: {
    prototype: ImageTrackList;
    new(): ImageTrackList;
};

interface VideoColorSpace {
    readonly fullRange: boolean | null;
    readonly matrix: VideoMatrixCoefficients | null;
    readonly primaries: VideoColorPrimaries | null;
    readonly transfer: VideoTransferCharacteristics | null;
    toJSON(): VideoColorSpaceInit;
}

declare var VideoColorSpace: {
    prototype: VideoColorSpace;
    new(init?: VideoColorSpaceInit): VideoColorSpace;
};

/** Available only in secure contexts. */
interface VideoDecoder {
    readonly decodeQueueSize: number;
    readonly state: CodecState;
    close(): void;
    configure(config: VideoDecoderConfig): void;
    decode(chunk: EncodedVideoChunk): void;
    flush(): Promise<void>;
    reset(): void;
}

declare var VideoDecoder: {
    prototype: VideoDecoder;
    new(init: VideoDecoderInit): VideoDecoder;
    isConfigSupported(config: VideoDecoderConfig): Promise<VideoDecoderSupport>;
};

/** Available only in secure contexts. */
interface VideoEncoder {
    readonly encodeQueueSize: number;
    readonly state: CodecState;
    close(): void;
    configure(config: VideoEncoderConfig): void;
    encode(frame: VideoFrame, options?: VideoEncoderEncodeOptions): void;
    flush(): Promise<void>;
    reset(): void;
}

declare var VideoEncoder: {
    prototype: VideoEncoder;
    new(init: VideoEncoderInit): VideoEncoder;
    isConfigSupported(config: VideoEncoderConfig): Promise<boolean>;
};

interface VideoFrame {
    readonly codedHeight: number;
    readonly codedRect: DOMRectReadOnly | null;
    readonly codedWidth: number;
    readonly colorSpace: VideoColorSpace;
    readonly displayHeight: number;
    readonly displayWidth: number;
    readonly duration: number | null;
    readonly format: VideoPixelFormat | null;
    readonly timestamp: number | null;
    readonly visibleRect: DOMRectReadOnly | null;
    allocationSize(options?: VideoFrameCopyToOptions): number;
    clone(): VideoFrame;
    close(): void;
    copyTo(destination: BufferSource, options?: VideoFrameCopyToOptions): Promise<PlaneLayout[]>;
}

declare var VideoFrame: {
    prototype: VideoFrame;
    new(image: CanvasImageSource, init?: VideoFrameInit): VideoFrame;
    new(data: BufferSource, init: VideoFrameBufferInit): VideoFrame;
};

interface AudioDataOutputCallback {
    (output: AudioData): void;
}

interface EncodedAudioChunkOutputCallback {
    (output: EncodedAudioChunk, metadata?: EncodedAudioChunkMetadata): void;
}

interface EncodedVideoChunkOutputCallback {
    (chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata): void;
}

interface VideoFrameOutputCallback {
    (output: VideoFrame): void;
}

interface WebCodecsErrorCallback {
    (error: DOMException): void;
}

interface HTMLElementTagNameMap {
}

interface HTMLElementDeprecatedTagNameMap {
}

interface SVGElementTagNameMap {
}

/** @deprecated Directly use HTMLElementTagNameMap or SVGElementTagNameMap as appropriate, instead. */
type ElementTagNameMap = HTMLElementTagNameMap & Pick<SVGElementTagNameMap, Exclude<keyof SVGElementTagNameMap, keyof HTMLElementTagNameMap>>;

type ImageBufferSource = BufferSource | ReadableStream;
type AlphaOption = "discard" | "keep";
type AudioSampleFormat = "f32" | "f32-planar" | "s16" | "s16-planar" | "s32" | "s32-planar" | "u8" | "u8-planar";
type CodecState = "closed" | "configured" | "unconfigured";
type EncodedAudioChunkType = "delta" | "key";
type EncodedVideoChunkType = "delta" | "key";
type HardwareAcceleration = "no-preference" | "prefer-hardware" | "prefer-software";
type LatencyMode = "quality" | "realtime";
type VideoColorPrimaries = "bt470bg" | "bt709" | "smpte170m";
type VideoMatrixCoefficients = "bt470bg" | "bt709" | "rgb" | "smpte170m";
type VideoPixelFormat = "BGRA" | "BGRX" | "I420" | "I420A" | "I422" | "I444" | "NV12" | "RGBA" | "RGBX";
type VideoTransferCharacteristics = "bt709" | "iec61966-2-1" | "smpte170m";
