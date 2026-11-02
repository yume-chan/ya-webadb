export const AOA_DEFAULT_DEVICE_FILTERS = [
    {
        vendorId: 0x18d1,
        // accessory
        productId: 0x2d00,
    },
    {
        vendorId: 0x18d1,
        // accessory + adb
        productId: 0x2d01,
    },
] as const satisfies readonly USBDeviceFilter[];
