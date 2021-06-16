import { Adb } from '@yume-chan/adb';
import React, { useContext } from "react";

export interface RouteProps {
    visible?: boolean;
}

const AdbDeviceContext = React.createContext<Adb | undefined>(undefined);

export const AdbDeviceProvider = AdbDeviceContext.Provider;

export function useAdbDevice() {
    return useContext(AdbDeviceContext);
}
