const AdbReverseErrorBrand = Symbol.for("AdbReverseError.brand");

export class AdbReverseError extends Error {
    [AdbReverseErrorBrand] = true;

    static override [Symbol.hasInstance](value: unknown) {
        return !!(value as AdbReverseNotSupportedError | undefined)?.[
            AdbReverseErrorBrand
        ];
    }

    constructor(message: string) {
        super(message);
    }
}

const AdbReverseNotSupportedErrorBrand = Symbol.for(
    "AdbReverseNotSupportedError.brand",
);

export class AdbReverseNotSupportedError extends AdbReverseError {
    [AdbReverseNotSupportedErrorBrand] = true;

    static override [Symbol.hasInstance](value: unknown) {
        return !!(value as AdbReverseNotSupportedError | undefined)?.[
            AdbReverseNotSupportedErrorBrand
        ];
    }

    constructor() {
        super(
            "ADB reverse tunnel is not supported on this device when connected wirelessly.",
        );
    }
}
