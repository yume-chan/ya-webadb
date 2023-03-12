import { AoaRequestType } from "./type.js";

// The original plan is to add more audio modes,
// but AOA audio accessory mode is soon deprecated in Android 8.
export enum AoaAudioMode {
    Off,
    /**
     * 2 channel, 16 bit, 44.1KHz PCM
     */
    On,
}

/**
 * Sets the audio mode. This method must be called before {@link aoaStartAccessory}.
 *
 * AOA audio accessory mode turns the Android device into a USB microphone,
 * all system audio will be directed to the microphone, to be capture by the USB host.
 *
 * It's like connecting a audio cable between the Android headphone jack and PC microphone jack,
 * except all signals are digital.
 *
 * Audio mode is deprecated in Android 8. On Android 9 and later, this call still switches the device
 * to audio accessory mode, and the device will be recognized as a USB microphone, but the
 * required USB endpoint is not presented anymore.
 * @param device The Android device.
 * @param mode The audio mode.
 */
export async function aoaSetAudioMode(device: USBDevice, mode: AoaAudioMode) {
    await device.controlTransferOut(
        {
            recipient: "device",
            requestType: "vendor",
            request: AoaRequestType.SetAudioMode,
            value: mode,
            index: 0,
        },
        new ArrayBuffer(0)
    );
}

function findAudioStreamingInterface(device: USBDevice) {
    for (const configuration of device.configurations) {
        for (const interface_ of configuration.interfaces) {
            for (const alternate of interface_.alternates) {
                // Audio
                if (alternate.interfaceClass !== 0x01) {
                    continue;
                }
                // AudioStreaming
                if (alternate.interfaceSubclass !== 0x02) {
                    continue;
                }
                if (alternate.endpoints.length === 0) {
                    continue;
                }
                return { configuration, interface_, alternate };
            }
        }
    }

    throw new Error("No matched alternate interface found");
}

/**
 * It doesn't work on Web, because Chrome blocked audio devices from WebUSB API.
 * @param device The Android device.
 * @returns A readable stream of raw audio data.
 */
export function aoaGetAudioStream(device: USBDevice) {
    let endpointNumber!: number;
    return new ReadableStream<Uint8Array>({
        async start() {
            const { configuration, interface_, alternate } =
                findAudioStreamingInterface(device);

            if (
                device.configuration?.configurationValue !==
                configuration.configurationValue
            ) {
                await device.selectConfiguration(
                    configuration.configurationValue
                );
            }

            if (!interface_.claimed) {
                await device.claimInterface(interface_.interfaceNumber);
            }

            if (
                interface_.alternate.alternateSetting !==
                alternate.alternateSetting
            ) {
                await device.selectAlternateInterface(
                    interface_.interfaceNumber,
                    alternate.alternateSetting
                );
            }

            const endpoint = alternate.endpoints.find(
                (endpoint) =>
                    endpoint.type === "isochronous" &&
                    endpoint.direction === "in"
            );
            if (!endpoint) {
                throw new Error("No matched endpoint found");
            }

            endpointNumber = endpoint.endpointNumber;
        },
        async pull(controller) {
            const result = await device.isochronousTransferIn(endpointNumber, [
                1024,
            ]);
            for (const packet of result.packets) {
                const data = packet.data!;
                const array = new Uint8Array(
                    data.buffer,
                    data.byteOffset,
                    data.byteLength
                );
                controller.enqueue(array);
            }
        },
    });
}
