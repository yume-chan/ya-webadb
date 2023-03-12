export class HidMouse {
    public static readonly descriptor = new Uint8Array(
        // prettier-ignore
        [
            0x05, 0x01,       // Usage Page (Generic Desktop)
            0x09, 0x02,       // Usage (Mouse)
            0xa1, 0x01,       // Collection (Application)
            0x09, 0x01,       //     Usage (Pointer)
            0xa1, 0x00,       //     Collection (Physical)
            0x05, 0x09,       //         Usage Page (Button)
            0x19, 0x01,       //         Usage Minimum (Button 1)
            0x29, 0x05,       //         Usage Maximum (Button 5)
            0x15, 0x00,       //         Logical Minimum (0)
            0x25, 0x01,       //         Logical Maximum (1)
            0x75, 0x01,       //         Report Size (1)
            0x95, 0x05,       //         Report Count (5)
            0x81, 0x02,       //         Input (Data, Variable, Absolute)

            0x75, 0x03,       //         Report Size (3)
            0x95, 0x01,       //         Report Count (1)
            0x81, 0x01,       //         Input (Constant)

            0x05, 0x01,       //         Usage Page (Generic Desktop)
            0x09, 0x30,       //         Usage (X)
            0x09, 0x31,       //         Usage (Y)
            0x09, 0x38,       //         Usage (Wheel)
            0x15, 0x81,       //         Logical Minimum (-127)
            0x25, 0x7f,       //         Logical Maximum (127)
            0x75, 0x08,       //         Report Size (8)
            0x95, 0x03,       //         Report Count (3)
            0x81, 0x06,       //         Input (Data, Variable, Relative)

            0x05, 0x0C,       //         Usage Page (Consumer)
            0x0A, 0x38, 0x02, //         Usage (AC Pan)
            0x15, 0x81,       //         Logical Minimum (-127)
            0x25, 0x7f,       //         Logical Maximum (127)
            0x75, 0x08,       //         Report Size (8)
            0x95, 0x01,       //         Report Count (1)
            0x81, 0x06,       //         Input (Data, Variable, Relative)
            0xc0,             //     End Collection
            0xc0,             // End Collection
        ]
    );

    public static serializeInputReport(
        movementX: number,
        movementY: number,
        buttons: number,
        scrollX: number,
        scrollY: number
    ): Uint8Array {
        return new Uint8Array([
            buttons,
            movementX,
            movementY,
            scrollY,
            scrollX,
        ]);
    }
}
