import { Adb } from "@yume-chan/adb";
import { AndroidCodecLevel, AndroidCodecProfile } from "../codec";
import { ScrcpyClientConnection, ScrcpyClientForwardConnection, ScrcpyClientReverseConnection } from "../connection";
import { DEFAULT_SERVER_PATH, ScrcpyLogLevel, ScrcpyOptions, ScrcpyScreenOrientation } from "./common";

export interface ScrcpyOptions1_17Init {
    path?: string,

    version?: string;

    logLevel?: ScrcpyLogLevel;

    /**
     * The maximum value of both width and height.
     */
    maxSize?: number | undefined;

    bitRate: number;

    maxFps?: number;

    /**
     * The orientation of the video stream.
     *
     * It will not keep the device screen in specific orientation,
     * only the captured video will in this orientation.
     */
    orientation?: ScrcpyScreenOrientation;

    tunnelForward?: boolean;

    profile?: AndroidCodecProfile;

    level?: AndroidCodecLevel;

    encoder?: string;
}

export class ScrcpyOptions1_17 implements ScrcpyOptions {
    path: string;

    version: string;

    logLevel: ScrcpyLogLevel;

    /**
     * The maximum value of both width and height.
     */
    maxSize: number;

    bitRate: number;

    maxFps: number;

    /**
     * The orientation of the video stream.
     *
     * It will not keep the device screen in specific orientation,
     * only the captured video will in this orientation.
     */
    orientation: ScrcpyScreenOrientation;

    tunnelForward: boolean;

    profile: AndroidCodecProfile;

    level: AndroidCodecLevel;

    encoder: string;

    public constructor({
        path = DEFAULT_SERVER_PATH,
        version = '1.17',
        logLevel = ScrcpyLogLevel.Error,
        maxSize = 0,
        bitRate,
        maxFps = 0,
        orientation = ScrcpyScreenOrientation.Unlocked,
        tunnelForward = false,
        profile = AndroidCodecProfile.Baseline,
        level = AndroidCodecLevel.Level4,
        encoder = '-',
    }: ScrcpyOptions1_17Init) {
        this.path = path;
        this.version = version;
        this.logLevel = logLevel;
        this.maxSize = maxSize;
        this.bitRate = bitRate;
        this.maxFps = maxFps;
        this.orientation = orientation;
        this.tunnelForward = tunnelForward;
        this.profile = profile;
        this.level = level;
        this.encoder = encoder;
    }

    public formatServerArguments() {
        return [
            `CLASSPATH=${this.path}`,
            'app_process',
            /*          unused */ '/',
            'com.genymobile.scrcpy.Server',
            this.version,
            this.logLevel,
            this.maxSize.toString(), // (0: unlimited)
            this.bitRate.toString(),
            this.maxFps.toString(),
            this.orientation.toString(),
            this.tunnelForward.toString(),
            /*            crop */ '-',
            /* send_frame_meta */ 'true', // always send frame meta (packet boundaries + timestamp)
            /*         control */ 'true',
            /*      display_id */ '0',
            /*    show_touches */ 'false',
            /*      stay_awake */ 'true',
            /*   codec_options */ `profile=${this.profile},level=${this.level}`,
            this.encoder,
        ];
    }

    public formatGetEncoderListArguments() {
        return [
            `CLASSPATH=${this.path}`,
            'app_process',
            /*          unused */ '/',
            'com.genymobile.scrcpy.Server',
            this.version,
            this.logLevel,
            this.maxSize.toString(), // (0: unlimited)
            this.bitRate.toString(),
            this.maxFps.toString(),
            this.orientation.toString(),
            this.tunnelForward.toString(),
            /*            crop */ '-',
            /* send_frame_meta */ 'true', // always send frame meta (packet boundaries + timestamp)
            /*         control */ 'true',
            /*      display_id */ '0',
            /*    show_touches */ 'false',
            /*      stay_awake */ 'true',
            /*   codec_options */ `profile=${this.profile},level=${this.level}`,
            // Provide an invalid encoder name
            // So the server will return all available encoders
            /*    encoder_name */ '_',
        ];
    }

    public createConnection(device: Adb): ScrcpyClientConnection {
        if (this.tunnelForward) {
            return new ScrcpyClientForwardConnection(device);
        } else {
            return new ScrcpyClientReverseConnection(device);
        }
    }

    public getOutputEncoderNameRegex(): RegExp {
        return /^\s+scrcpy --encoder-name '(.*?)'/;
    }
}
