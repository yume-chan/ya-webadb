import { H264BsdDecoder } from "@yume-chan/scrcpy-decoder-h264bsd";

export function createDecoder() {
    return new H264BsdDecoder();
}
