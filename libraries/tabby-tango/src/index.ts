import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
// @ts-ignore
import { FormsModule } from "@angular/forms";
// @ts-ignore
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
import { TabbyAdb } from "./state";

export { TabbyAdb };

@NgModule({
    imports: [
        FormsModule,
        BrowserModule,
        NgbModule,
        TabbyCorePlugin,
        TabbyTerminalModule,
    ],
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
    entryComponents: [AdbTerminalTabComponent],
    declarations: [AdbTerminalTabComponent],
    exports: [AdbTerminalTabComponent],
})
export default class AdbTerminalModule {
    constructor(app: AppService) {}
}
