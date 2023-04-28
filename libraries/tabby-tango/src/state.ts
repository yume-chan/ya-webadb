import { Adb } from "@yume-chan/adb";
import { makeAutoObservable } from "mobx";

export const AdbState = makeAutoObservable<{ value: Adb | null }>({
    value: null,
});
