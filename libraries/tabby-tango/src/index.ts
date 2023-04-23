import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import TabbyCorePlugin, {
    AppService,
    ProfileProvider,
    ToolbarButtonProvider,
} from "tabby-core";
import TabbyTerminalModule from "tabby-terminal";
import { ButtonProvider } from "./buttonProvider";
import { AdbTerminalTabComponent } from "./components/terminalTab.component";
import { AdbProfilesService } from "./profiles";
import { AdbState } from "./state";

export { AdbState };

@NgModule({
    imports: [FormsModule, NgbModule, TabbyCorePlugin, TabbyTerminalModule],
    providers: [
        {
            provide: ProfileProvider,
            useClass: AdbProfilesService,
            multi: true,
        },
        {
            provide: ToolbarButtonProvider,
            useClass: ButtonProvider,
            multi: true,
        },
    ],
    declarations: [AdbTerminalTabComponent],
    exports: [AdbTerminalTabComponent],
})
export default class AdbTerminalModule {
    constructor(app: AppService) {}
}
