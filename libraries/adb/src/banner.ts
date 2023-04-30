import type { AdbFeature } from "./features.js";

export enum AdbBannerKey {
    Product = "ro.product.name",
    Model = "ro.product.model",
    Device = "ro.product.device",
    Features = "features",
}

export class AdbBanner {
    public static parse(banner: string) {
        let product: string | undefined;
        let model: string | undefined;
        let device: string | undefined;
        let features: AdbFeature[] = [];

        const pieces = banner.split("::");
        if (pieces.length > 1) {
            const props = pieces[1]!;
            for (const prop of props.split(";")) {
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

        return new AdbBanner(product, model, device, features);
    }

    private _product: string | undefined;
    public get product() {
        return this._product;
    }

    private _model: string | undefined;
    public get model() {
        return this._model;
    }

    private _device: string | undefined;
    public get device() {
        return this._device;
    }

    private _features: AdbFeature[] = [];
    public get features() {
        return this._features;
    }

    public constructor(
        product: string | undefined,
        model: string | undefined,
        device: string | undefined,
        features: AdbFeature[]
    ) {
        this._product = product;
        this._model = model;
        this._device = device;
        this._features = features;
    }
}
