import type { AdbFeature } from "./features.js";
import type { AdbServerClient } from "./server/client.js";

export const AdbBannerKey = {
    Product: "ro.product.name",
    Model: "ro.product.model",
    Device: "ro.product.device",
    Features: "features",
} as const;

export type AdbBannerKey = (typeof AdbBannerKey)[keyof typeof AdbBannerKey];

export class AdbBanner {
    static parse(banner: string) {
        let state: AdbServerClient.ConnectionState | undefined;
        let product: string | undefined;
        let model: string | undefined;
        let device: string | undefined;
        let features: AdbFeature[] = [];

        const pieces = banner.split("::");
        if (pieces.length > 1) {
            state = (pieces[0]!.trim() || undefined) as
                | AdbServerClient.ConnectionState
                | undefined;
            const props = pieces[1]!;
            for (const prop of props.split(";")) {
                // istanbul ignore if
                if (!prop) {
                    continue;
                }

                const keyValue = prop.split("=");
                if (keyValue.length !== 2) {
                    continue;
                }

                const [key, value] = keyValue;
                switch (key) {
                    case AdbBannerKey.Product:
                        product = value;
                        break;
                    case AdbBannerKey.Model:
                        model = value;
                        break;
                    case AdbBannerKey.Device:
                        device = value;
                        break;
                    case AdbBannerKey.Features:
                        features = value!.split(",") as AdbFeature[];
                        break;
                }
            }
        }

        return new AdbBanner(state, product, model, device, features);
    }

    readonly #state: AdbServerClient.ConnectionState | undefined;
    get state() {
        return this.#state;
    }

    readonly #product: string | undefined;
    get product() {
        return this.#product;
    }

    readonly #model: string | undefined;
    get model() {
        return this.#model;
    }

    readonly #device: string | undefined;
    get device() {
        return this.#device;
    }

    readonly #features: readonly AdbFeature[] = [];
    get features() {
        return this.#features;
    }

    // eslint-disable-next-line @typescript-eslint/max-params
    constructor(
        state: AdbServerClient.ConnectionState | undefined,
        product: string | undefined,
        model: string | undefined,
        device: string | undefined,
        features: readonly AdbFeature[],
    ) {
        this.#state = state;
        this.#product = product;
        this.#model = model;
        this.#device = device;
        this.#features = features;
    }
}
