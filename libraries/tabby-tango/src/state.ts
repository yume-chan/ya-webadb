import { Adb } from "@yume-chan/adb";
import { makeAutoObservable } from "mobx";

export const TabbyAdb = makeAutoObservable<{ value: Adb | null }>({
    value: null,
});
