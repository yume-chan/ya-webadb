export function isErrorName(e: unknown, name: string): boolean {
    // node-usb package doesn't use `DOMException`,
    // so use a looser check
    // https://github.com/node-usb/node-usb/issues/573
    return (
        typeof e === "object" && e !== null && "name" in e && e.name === name
    );
}

/**
 * `classCode`, `subclassCode` and `protocolCode` are required
 * for selecting correct USB configuration and interface.
 */
export type AdbDeviceFilter = USBDeviceFilter &
    Required<
        Pick<USBDeviceFilter, "classCode" | "subclassCode" | "protocolCode">
    >;

function alternateMatchesFilter(
    alternate: USBAlternateInterface,
    filters: AdbDeviceFilter[],
) {
    return filters.some(
        (filter) =>
            alternate.interfaceClass === filter.classCode &&
            alternate.interfaceSubclass === filter.subclassCode &&
            alternate.interfaceProtocol === filter.protocolCode,
    );
}

export function findUsbAlternateInterface(
    device: USBDevice,
    filters: AdbDeviceFilter[],
) {
    for (const configuration of device.configurations) {
        for (const interface_ of configuration.interfaces) {
            for (const alternate of interface_.alternates) {
                if (alternateMatchesFilter(alternate, filters)) {
                    return { configuration, interface_, alternate };
                }
            }
        }
    }

    throw new TypeError("No matched alternate interface found");
}

function padNumber(value: number) {
    return value.toString(16).padStart(4, "0");
}

export function getSerialNumber(device: USBDevice) {
    if (device.serialNumber) {
        return device.serialNumber;
    }

    return padNumber(device.vendorId) + "x" + padNumber(device.productId);
}
