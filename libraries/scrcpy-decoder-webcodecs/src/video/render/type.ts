export interface WebCodecsVideoDecoderRenderer {
    setSize(width: number, height: number): void;

    draw(frame: VideoFrame): Promise<void>;
}
