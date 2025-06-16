export function isErrorName(e: unknown, name: string): e is Error {
    // node-usb package doesn't use `DOMException`,
    // so use a looser check
    // https://github.com/node-usb/node-usb/issues/573
    return (
        typeof e === "object" && e !== null && "name" in e && e.name === name
    );
}

export type PickNonNullable<T, K extends keyof T> = {
    [P in K]-?: NonNullable<T[P]>;
};

/**
 * `classCode`, `subclassCode` and `protocolCode` are required
 * for selecting correct USB configuration and interface.
 */
export type UsbInterfaceFilter = PickNonNullable<
    USBDeviceFilter,
    "classCode" | "subclassCode" | "protocolCode"
>;

export function isUsbInterfaceFilter(
    filter: USBDeviceFilter,
): filter is UsbInterfaceFilter {
    return (
        filter.classCode !== undefined &&
        filter.subclassCode !== undefined &&
        filter.protocolCode !== undefined
    );
}

function matchUsbInterfaceFilter(
    alternate: USBAlternateInterface,
    filter: UsbInterfaceFilter,
) {
    return (
        alternate.interfaceClass === filter.classCode &&
        alternate.interfaceSubclass === filter.subclassCode &&
        alternate.interfaceProtocol === filter.protocolCode
    );
}

export interface UsbInterfaceIdentifier {
    configuration: USBConfiguration;
    interface_: USBInterface;
    alternate: USBAlternateInterface;
}

export function findUsbInterface(
    device: USBDevice,
    filter: UsbInterfaceFilter,
): UsbInterfaceIdentifier | undefined {
    for (const configuration of device.configurations) {
        for (const interface_ of configuration.interfaces) {
            for (const alternate of interface_.alternates) {
                if (matchUsbInterfaceFilter(alternate, filter)) {
                    return { configuration, interface_, alternate };
                }
            }
        }
    }
    return undefined;
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

/**
 * Find the first pair of input and output endpoints from an alternate interface.
 *
 * ADB interface only has two endpoints, one for input and one for output.
 */
export function findUsbEndpoints(endpoints: readonly USBEndpoint[]) {
    if (endpoints.length === 0) {
        throw new TypeError("No endpoints given");
    }

    let inEndpoint: USBEndpoint | undefined;
    let outEndpoint: USBEndpoint | undefined;

    for (const endpoint of endpoints) {
        switch (endpoint.direction) {
            case "in":
                inEndpoint = endpoint;
                if (outEndpoint) {
                    return { inEndpoint, outEndpoint };
                }
                break;
            case "out":
                outEndpoint = endpoint;
                if (inEndpoint) {
                    return { inEndpoint, outEndpoint };
                }
                break;
        }
    }

    if (!inEndpoint) {
        throw new TypeError("No input endpoint found.");
    }
    if (!outEndpoint) {
        throw new TypeError("No output endpoint found.");
    }
    throw new Error("unreachable");
}

export function matchFilter(
    device: USBDevice,
    filter: USBDeviceFilter & UsbInterfaceFilter,
): UsbInterfaceIdentifier | false;
export function matchFilter(
    device: USBDevice,
    filter: USBDeviceFilter,
): boolean;
export function matchFilter(
    device: USBDevice,
    filter: USBDeviceFilter,
): UsbInterfaceIdentifier | boolean {
    if (filter.vendorId !== undefined && device.vendorId !== filter.vendorId) {
        return false;
    }

    if (
        filter.productId !== undefined &&
        device.productId !== filter.productId
    ) {
        return false;
    }

    if (
        filter.serialNumber !== undefined &&
        getSerialNumber(device) !== filter.serialNumber
    ) {
        return false;
    }

    if (isUsbInterfaceFilter(filter)) {
        return findUsbInterface(device, filter) || false;
    }

    return true;
}

export function matchFilters(
    device: USBDevice,
    filters: readonly (USBDeviceFilter & UsbInterfaceFilter)[],
    exclusionFilters?: readonly USBDeviceFilter[],
): UsbInterfaceIdentifier | false;
export function matchFilters(
    device: USBDevice,
    filters: readonly USBDeviceFilter[],
    exclusionFilters?: readonly USBDeviceFilter[],
): boolean;
export function matchFilters(
    device: USBDevice,
    filters: readonly USBDeviceFilter[],
    exclusionFilters?: readonly USBDeviceFilter[],
): UsbInterfaceIdentifier | boolean {
    if (exclusionFilters && exclusionFilters.length > 0) {
        if (matchFilters(device, exclusionFilters)) {
            return false;
        }
    }

    for (const filter of filters) {
        const result = matchFilter(device, filter);
        if (result) {
            return result;
        }
    }
    return false;
}
