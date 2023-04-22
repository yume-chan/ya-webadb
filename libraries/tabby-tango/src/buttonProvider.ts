import { Injectable } from "@angular/core";
import { AppService, ToolbarButton, ToolbarButtonProvider } from "tabby-core";
import { AdbTerminalTabComponent } from "./components/terminalTab.component";
import { TabbyAdb } from "./state";

@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor(private app: AppService) {
        super();

        app.ready$.subscribe(() => {
            if (TabbyAdb.value) {
                app.openNewTab({ type: AdbTerminalTabComponent });
            }
        });
    }

    provide(): ToolbarButton[] {
        return [
            {
                icon: require("./icons/plus.svg"),
                title: "New ADB shell",
                click: () => {
                    this.app.openNewTab({ type: AdbTerminalTabComponent });
                },
            },
        ];
    }
}
