import { useEffect, useState } from 'react';

export function useDevicePixelRatio() {
    const [value, setValue] = useState(window.devicePixelRatio);

    useEffect(() => {
        const match = window.matchMedia(
            `(min-device-pixel-ratio: ${value}) and (max-device-pixel-ratio: ${value})`
        );

        function handler() {
            setValue(window.devicePixelRatio);
        }
        match.addEventListener('change', handler);

        return match.removeEventListener('change', handler);
    }, [value]);
}
