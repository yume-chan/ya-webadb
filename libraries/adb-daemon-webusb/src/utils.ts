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

function alternateMatchesFilter(
    alternate: USBAlternateInterface,
    filters: UsbInterfaceFilter[],
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
    filters: UsbInterfaceFilter[],
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

/**
 * Find the first pair of input and output endpoints from an alternate interface.
 *
 * ADB interface only has two endpoints, one for input and one for output.
 */
export function findUsbEndpoints(endpoints: USBEndpoint[]) {
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

export function matchesFilters(
    device: USBDevice,
    filters: (USBDeviceFilter & UsbInterfaceFilter)[],
) {
    for (const filter of filters) {
        if (
            filter.vendorId !== undefined &&
            device.vendorId !== filter.vendorId
        ) {
            continue;
        }
        if (
            filter.productId !== undefined &&
            device.productId !== filter.productId
        ) {
            continue;
        }
        if (
            filter.serialNumber !== undefined &&
            getSerialNumber(device) !== filter.serialNumber
        ) {
            continue;
        }

        try {
            findUsbAlternateInterface(device, filters);
            return true;
        } catch {
            continue;
        }
    }
    return false;
}
