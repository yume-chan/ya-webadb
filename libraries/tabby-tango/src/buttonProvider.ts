import { Injectable } from "@angular/core";
import {
    AppService,
    NotificationsService,
    ProfilesService,
    ToolbarButton,
    ToolbarButtonProvider,
} from "tabby-core";
import { AdbState } from "./state";

@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor(
        app: AppService,
        private profile: ProfilesService,
        private notification: NotificationsService
    ) {
        super();

        app.ready$.subscribe(() => {
            this.launchProfile(false);
        });
    }

    private launchProfile(showError: boolean) {
        if (AdbState.value) {
            this.profile.openNewTabForProfile({ type: "adb", name: "Shell" });
        } else if (showError) {
            this.notification.error("Please connect your device first");
        }
    }

    provide(): ToolbarButton[] {
        return [
            {
                icon: require("./icons/plus.svg"),
                title: "New tab",
                click: () => {
                    this.launchProfile(true);
                },
            },
        ];
    }
}
