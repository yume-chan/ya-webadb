import { Injectable } from "@angular/core";
import {
    NewTabParameters,
    PartialProfile,
    Profile,
    ProfileProvider,
} from "tabby-core";
import { AdbTerminalTabComponent } from "./components/terminalTab.component";

@Injectable({ providedIn: "root" })
export class AdbProfilesService extends ProfileProvider<Profile> {
    id = "adb";
    name = "Adb shell";

    async getBuiltinProfiles(): Promise<PartialProfile<Profile>[]> {
        return [
            {
                id: "adb",
                type: "adb",
                name: "ADB shell",
                icon: "fas fa-microchip",
                isBuiltin: true,
            },
        ];
    }

    async getNewTabParameters(
        profile: Profile
    ): Promise<NewTabParameters<AdbTerminalTabComponent>> {
        return {
            type: AdbTerminalTabComponent,
            inputs: {
                profile,
            },
        };
    }

    getDescription(_profile: Profile): string {
        return "";
    }
}
