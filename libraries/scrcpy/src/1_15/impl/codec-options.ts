// cspell: ignore Bframes
// cspell: ignore macroblocks

import type { ScrcpyOptionValue } from "../../base/option-value.js";

export interface NumberCodecOption {
    type: "int" | "float";
    value: number;
}

export interface BigIntCodecOption {
    type: "long";
    value: bigint;
}

export interface StringCodecOption {
    type: "string";
    value: string;
}

export type CodecOption =
    | NumberCodecOption
    | BigIntCodecOption
    | StringCodecOption;

export class CodecOptions implements ScrcpyOptionValue {
    static Empty = /* #__PURE__ */ new CodecOptions();

    #values = new Map<string, CodecOption>();
    get values(): ReadonlyMap<string, CodecOption> {
        return this.#values;
    }

    setInt(key: string, value: number): this {
        this.#values.set(key, { type: "int", value });
        return this;
    }

    setFloat(key: string, value: number): this {
        this.#values.set(key, { type: "float", value });
        return this;
    }

    setLong(key: string, value: bigint): this {
        this.#values.set(key, { type: "long", value });
        return this;
    }

    setString(key: string, value: string): this {
        this.#values.set(key, { type: "string", value });
        return this;
    }

    delete(key: string) {
        return this.#values.delete(key);
    }

    clear() {
        this.#values.clear();
    }

    /**
     * A key describing the desired codec priority.
     *
     * The associated value is an integer. Higher value means lower priority.
     *
     * Currently, only two levels are supported:
     *
     * - 0: realtime priority - meaning that the codec shall support the given performance
     *  configuration (e.g. framerate) at realtime. This should only be used by media playback,
     *  capture, and possibly by realtime communication scenarios if best effort performance
     *  is not suitable.
     * - 1: non-realtime priority (best effort).
     *
     * This is a hint used at codec configuration and resource planning -
     * to understand the realtime requirements of the application;
     * however, due to the nature of media components, performance is not guaranteed.
     */
    setPriority(priority: number): this {
        return this.setInt("priority", priority);
    }

    toOptionValue(): string | undefined {
        if (this.#values.size === 0) {
            return undefined;
        }

        return Array.from(this.#values.entries(), ([key, value]) => {
            let result = key;

            if (value.type !== "int") {
                result += ":" + value.type;
            }

            result += "=";

            if (value.type === "string") {
                result += value.value.replaceAll(",", "\\,");
            } else {
                result += value.value;
            }

            return result;
        }).join(",");
    }
}

export class VideoCodecOptions extends CodecOptions {
    /**
     * A key for applications to opt out of allowing a Surface to
     * discard undisplayed/unconsumed frames as means to catch up after falling behind.
     * This value is an integer.
     * The value 0 indicates the surface is not allowed to drop frames.
     * The value 1 indicates the surface is allowed to drop frames.
     * [`MediaCodec`](https://developer.android.com/reference/android/media/MediaCodec)
     * describes the semantics.
     */
    setAllowFrameDrop(value: boolean): this {
        return this.setInt("allow-frame-drop", value ? 1 : 0);
    }

    /**
     * An optional key describing the period of intra refresh in frames.
     * This is an optional parameter that applies only to video encoders.
     * If encoder supports it (MediaCodecInfo.CodecCapabilities.FEATURE_IntraRefresh),
     * the whole frame is completely refreshed after the specified period.
     * Also for each frame, a fix subset of macroblocks must be intra coded
     * which leads to more constant bitrate than inserting a key frame.
     * This key is recommended for video streaming applications as it provides
     * low-delay and good error-resilience.
     * This key is ignored if the video encoder does not support the intra refresh feature.
     * The associated value is an integer.
     */
    setIntraRefreshPeriod(value: number): this {
        return this.setInt("intra-refresh-period", value);
    }

    /**
     * A key describing the frequency of key frames expressed in seconds between key frames.
     *
     * This key is used by video encoders.
     * A negative value means no key frames are requested after the first frame.
     * A zero value means a stream containing all key frames is requested.
     *
     * The associated value is an integer (or float since `Build.VERSION_CODES.N_MR1`).
     */
    setIFrameInterval(value: number, type: "int" | "float" = "int"): this {
        return type === "int"
            ? this.setInt("i-frame-interval", value)
            : this.setFloat("i-frame-interval", value);
    }

    /**
     *
     * An optional key describing the desired encoder latency in frames.
     * This is an optional parameter that applies only to video encoders.
     * If encoder supports it, it should output at least one output frame
     * after being queued the specified number of frames.
     * This key is ignored if the video encoder does not support the latency feature.
     * Use the output format to verify that this feature was enabled
     * and the actual value used by the encoder.
     *
     * If the key is not specified, the default latency will be implementation specific.
     * The associated value is an integer.
     */
    setLatency(value: number): this {
        return this.setInt("latency", value);
    }

    /**
     * A key describing the desired profile to be used by an encoder.
     *
     * The associated value is an integer. Constants are declared in
     * [`MediaCodecInfo.CodecProfileLevel`](https://developer.android.com/reference/android/media/MediaCodecInfo.CodecProfileLevel).
     * This key is used as a further hint when specifying a desired profile,
     * and is only supported for codecs that specify a level.
     *
     * This key is ignored if the {@link setProfile | `profile`} is not specified.
     * Otherwise, the value should be a level compatible with the configured encoding parameters.
     */
    setLevel(value: number): this {
        return this.setInt("level", value);
    }

    /**
     * A key describing the maximum number of B frames between I or P frames,
     * to be used by a video encoder.
     * The associated value is an integer.
     * The default value is 0, which means that no B frames are allowed.
     * Note that non-zero value does not guarantee B frames; it's up to the encoder to decide.
     */
    setMaxBFrames(value: number): this {
        return this.setInt("max-bframes", value);
    }

    /**
     * Instruct the video encoder in "surface-input" mode to drop excessive frames from the source,
     * so that the input frame rate to the encoder does not exceed the specified fps.
     * The associated value is a float, representing the max frame rate to feed the encoder at.
     */
    setMaxFpsToEncoder(value: number): this {
        return this.setFloat("max-fps-to-encoder", value);
    }

    /**
     * A key describing the desired profile to be used by an encoder.
     *
     * The associated value is an integer.
     * Constants are declared in
     * [MediaCodecInfo.CodecProfileLevel](https://developer.android.com/reference/android/media/MediaCodecInfo.CodecProfileLevel).
     * This key is used as a hint, and is only supported for codecs that specify a profile.
     * When configuring profile,
     * encoder configuration may fail if other parameters are not compatible with
     * the desired profile or if the desired profile is not supported,
     * but it may also fail silently
     * (where the encoder ends up using a different, compatible profile.)
     *
     * It is recommended that the profile is set for all encoders.
     * For more information, see the *Encoder Profiles* section of the
     * [`MediaCodec`](https://developer.android.com/reference/android/media/MediaCodec)
     * API reference.
     */
    setProfile(value: number): this {
        return this.setInt("profile", value);
    }

    /**
     * Applies only when configuring a video encoder in "surface-input" mode.
     * The associated value is a long and gives the time in microseconds
     * after which the frame previously submitted to the encoder will be repeated (once)
     * if no new frame became available since.
     */
    setRepeatPreviousFrameAfter(value: bigint): this {
        return this.setLong("repeat-previous-frame-after", value);
    }
}
