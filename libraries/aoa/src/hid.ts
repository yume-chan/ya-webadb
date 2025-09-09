import { AoaRequestType } from "./type.js";

export async function aoaHidRegister(
    device: USBDevice,
    accessoryId: number,
    reportDescriptorSize: number,
) {
    await device.controlTransferOut(
        {
            recipient: "device",
            requestType: "vendor",
            request: AoaRequestType.RegisterHid,
            value: accessoryId,
            index: reportDescriptorSize,
        },
        new ArrayBuffer(0),
    );
}

export async function aoaHidSetReportDescriptor(
    device: USBDevice,
    accessoryId: number,
    reportDescriptor: Uint8Array<ArrayBuffer>,
) {
    await device.controlTransferOut(
        {
            recipient: "device",
            requestType: "vendor",
            request: AoaRequestType.SetHidReportDescriptor,
            value: accessoryId,
            index: 0,
        },
        reportDescriptor,
    );
}

export async function aoaHidUnregister(device: USBDevice, accessoryId: number) {
    await device.controlTransferOut(
        {
            recipient: "device",
            requestType: "vendor",
            request: AoaRequestType.UnregisterHid,
            value: accessoryId,
            index: 0,
        },
        new ArrayBuffer(0),
    );
}

export async function aoaHidSendInputReport(
    device: USBDevice,
    accessoryId: number,
    event: Uint8Array<ArrayBuffer>,
) {
    await device.controlTransferOut(
        {
            recipient: "device",
            requestType: "vendor",
            request: AoaRequestType.SendHidEvent,
            value: accessoryId,
            index: 0,
        },
        event,
    );
}

/**
 * Emulate a HID device over AOA protocol.
 *
 * It can only send input reports, but not send feature reports nor receive output reports.
 */
export class AoaHidDevice {
    /**
     * Register a HID device.
     * @param device The Android device.
     * @param accessoryId An arbitrary number to uniquely identify the HID device.
     * @param reportDescriptor The HID report descriptor.
     * @returns An instance of AoaHidDevice to send events.
     */
    static async register(
        device: USBDevice,
        accessoryId: number,
        reportDescriptor: Uint8Array<ArrayBuffer>,
    ) {
        await aoaHidRegister(device, accessoryId, reportDescriptor.length);
        await aoaHidSetReportDescriptor(device, accessoryId, reportDescriptor);
        return new AoaHidDevice(device, accessoryId);
    }

    #device: USBDevice;
    #accessoryId: number;

    constructor(device: USBDevice, accessoryId: number) {
        this.#device = device;
        this.#accessoryId = accessoryId;
    }

    async sendInputReport(event: Uint8Array<ArrayBuffer>) {
        await aoaHidSendInputReport(this.#device, this.#accessoryId, event);
    }

    async unregister() {
        await aoaHidUnregister(this.#device, this.#accessoryId);
    }
}
