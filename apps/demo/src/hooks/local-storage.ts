import { useState } from "react";

import { useAddEventListener } from "./add-event-listener";
import { useStableCallback } from "./stable-callback";

function useClientLocalStorage<T extends string = string>(
    key: string,
    fallbackValue: T
) {
    const [value, setValue] = useState<T>(
        () => (localStorage.getItem(key) as T) || fallbackValue
    );

    useAddEventListener(
        globalThis,
        "storage",
        () =>
            setValue((localStorage.getItem(key) as T | null) ?? fallbackValue),
        { passive: true },
        [key, fallbackValue]
    );

    const handleChange = useStableCallback((value: T) => {
        setValue(value);
        localStorage.setItem(key, value);
    });

    return [value, handleChange] as const;
}

export const useLocalStorage: typeof useClientLocalStorage =
    typeof localStorage !== "undefined"
        ? useClientLocalStorage
        : (key, fallbackValue) => [fallbackValue, () => {}];
