import { ScrcpyOptions1_17Init, ScrcpyOptions1_17 } from "./1_17";

export interface ScrcpyOptions1_19Init extends ScrcpyOptions1_17Init {
    powerOffOnClose?: boolean;
}

export class ScrcpyOptions1_19 extends ScrcpyOptions1_17 {
    powerOffOnClose: boolean;

    constructor(init: ScrcpyOptions1_19Init) {
        super(init);
        const {
            powerOffOnClose = false
        } = init;
        this.powerOffOnClose = powerOffOnClose;
    }

    public override formatServerArguments(): string[] {
        return [
            ...super.formatServerArguments(),
            this.powerOffOnClose.toString()
        ];
    }

    public override formatGetEncoderListArguments(): string[] {
        return [
            ...super.formatGetEncoderListArguments(),
            this.powerOffOnClose.toString()
        ];
    }

    public override getOutputEncoderNameRegex(): RegExp {
        return /^\s+scrcpy --encoder '(.*?)'/;
    }
}
