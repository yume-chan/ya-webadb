const FINGER_DESCRIPTOR = new Uint8Array(
    // prettier-ignore
    [
        0x09, 0x22,       //     Usage (Finger)
        0xa1, 0x02,       //     Collection (Logical)
        0x09, 0x51,       //         Usage (Contact Identifier)
        0x15, 0x00,       //         Logical Minimum (0)
        0x25, 0x7f,       //         Logical Maximum (127)
        0x75, 0x08,       //         Report Size (8)
        0x95, 0x01,       //         Report Count (1)
        0x81, 0x02,       //         Input (Data, Variable, Absolute)

        0x09, 0x42,       //         Usage (Tip Switch)
        0x15, 0x00,       //         Logical Minimum (0)
        0x25, 0x01,       //         Logical Maximum (1)
        0x75, 0x01,       //         Report Size (1)
        0x95, 0x01,       //         Report Count (1)
        0x81, 0x02,       //         Input (Data, Variable, Absolute)

        0x95, 0x07,       //         Report Count (7)
        0x81, 0x03,       //         Input (Constant)

        0x05, 0x01,       //         Usage Page (Generic Desktop)
        0x09, 0x30,       //         Usage (X)
        0x09, 0x31,       //         Usage (Y)
        0x15, 0x00,       //         Logical Minimum (0)
        0x26, 0xff, 0x7f, //         Logical Maximum (32767)
        0x35, 0x00,       //         Physical Minimum (0)
        0x46, 0xff, 0x7f, //         Physical Maximum (32767)
        0x66, 0x00, 0x00, //         Unit (None)
        0x75, 0x10,       //         Report Size (16)
        0x95, 0x02,       //         Report Count (2)
        0x81, 0x02,       //         Input (Data, Variable, Absolute)
        0xc0,             //     End Collection
    ]
);

const DESCRIPTOR_HEAD = new Uint8Array(
    // prettier-ignore
    [
        0x05, 0x0d, // Usage Page (Digitizers)
        0x09, 0x04, // Usage (Touch Screen)
        0xa1, 0x01, // Collection (Application)
        0x09, 0x55, //     Usage (Contact Count Maximum)
        0x25, 0x0a, //     Logical Maximum (10)
        0xB1, 0x02, //     Feature (Data, Variable, Absolute)

        0x09, 0x54, //     Usage (Contact Count)
        0x15, 0x00, //     Logical Minimum (0)
        0x25, 0x0a, //     Logical Maximum (10)
        0x75, 0x08, //     Report Size (8)
        0x95, 0x01, //     Report Count (1)
        0x81, 0x02, //     Input (Data, Variable, Absolute)
    ]
);

const DESCRIPTOR_TAIL = new Uint8Array([
    0xc0, // End Collection
]);

const DESCRIPTOR = new Uint8Array(
    DESCRIPTOR_HEAD.length +
        FINGER_DESCRIPTOR.length * 10 +
        DESCRIPTOR_TAIL.length
);
let offset = 0;
DESCRIPTOR.set(DESCRIPTOR_HEAD, offset);
offset += DESCRIPTOR_HEAD.length;
for (let i = 0; i < 10; i += 1) {
    DESCRIPTOR.set(FINGER_DESCRIPTOR, offset);
    offset += FINGER_DESCRIPTOR.length;
}
DESCRIPTOR.set(DESCRIPTOR_TAIL, offset);

interface Finger {
    x: number;
    y: number;
}

/**
 * A ten-point touch screen.
 */
export class HidTouchScreen {
    public static readonly FINGER_DESCRIPTOR = FINGER_DESCRIPTOR;

    public static readonly DESCRIPTOR = DESCRIPTOR;

    private fingers: Map<number, Finger> = new Map();

    public down(id: number, x: number, y: number) {
        if (this.fingers.size >= 10) {
            return;
        }

        this.fingers.set(id, {
            x,
            y,
        });
    }

    public move(id: number, x: number, y: number) {
        const finger = this.fingers.get(id);
        if (finger) {
            finger.x = x;
            finger.y = y;
        }
    }

    public up(id: number) {
        this.fingers.delete(id);
    }

    public serializeInputReport(): Uint8Array {
        const report = new Uint8Array(1 + 6 * 10);
        report[0] = this.fingers.size;
        let offset = 1;
        for (const [id, finger] of this.fingers) {
            report[offset] = id;
            offset += 1;

            report[offset] = 1;
            offset += 1;

            report[offset] = finger.x & 0xff;
            report[offset + 1] = (finger.x >> 8) & 0xff;
            report[offset + 2] = finger.y & 0xff;
            report[offset + 3] = (finger.y >> 8) & 0xff;
            offset += 4;
        }
        return report;
    }
}
