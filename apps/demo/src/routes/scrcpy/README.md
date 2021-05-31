# Scrcpy client

## Decoders

|                       | JMuxer                                                               | TinyH264                                                            |
| --------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Principle             | Remux H.264 stream into MP4 container                                | Decode H.264 stream into image data                                 |
| Renderer              | Native `<video>`<br/>Hardware-accelerated video decoding by browsers | WebGL for hardware-accelerated color space conversion and rendering |
| Tech Stack            | Media Source Extensions                                              | WebAssembly, Shared Web Worker, WebGL                               |
| Browser compatibility | Supported by most modern browsers                                    | Supported by most modern browsers                                   |
| H.264 compatibility   | Depends on browsers<br/>Supports most H.264 profiles and levels      | Only supports H.264 baseline profile                                |
| CPU usage             | Very little processing and mostly copying<br/>Low                    | Decode H.264 on CPU<br/>Very High                                   |
| Latency               | High and unstable                                                    | Lower                                                               |

## Encoders

Scrcpy server version 1.17 supports specifying encoders.

| Encoder Name      | OMX.google.h264.encoder  | c2.android.avc.encoder   | OMX.qcom.video.encoder.avc | OMX.hisi.video.encoder.avc       |
| ----------------- | ------------------------ | ------------------------ | -------------------------- | -------------------------------- |
| Vendor            | Google                   | UNKNOWN                  | Qualcomm                   | Huawei                           |
| Type              | Software encoder         | UNKNOWN                  | Hardware encoder           | Hardware encoder                 |
| Huawei Mate 9     | Works                    | Not exist                | Not exist                  | Ignores profile and level config |
| Samsung Galaxy S9 | IllegalArgumentException | IllegalArgumentException | Works                      | Not exist                        |
