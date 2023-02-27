import { AoaRequestType } from "./type.js";

export async function aoaGetProtocol(device: USBDevice) {
    const result = await device.controlTransferIn(
        {
            recipient: "device",
            requestType: "vendor",
            request: AoaRequestType.GetProtocol,
            value: 0,
            index: 0,
        },
        2
    );
    const version = result.data!.getUint16(0, true);
    return version;
}

/**
 * The device will reset (disconnect) after this call.
 * @param device The Android device.
 */
export async function aoaStartAccessory(device: USBDevice) {
    await device.controlTransferOut(
        {
            recipient: "device",
            requestType: "vendor",
            request: AoaRequestType.Start,
            value: 0,
            index: 0,
        },
        new ArrayBuffer(0)
    );
}
