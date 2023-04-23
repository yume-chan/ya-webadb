import { Component, Injector } from "@angular/core";
import {
    BaseSession,
    BaseTerminalProfile,
    BaseTerminalTabComponent,
} from "tabby-terminal";
import { AdbSession } from "../session";

@Component({
    selector: "adbTerminalTab",
    template: BaseTerminalTabComponent.template,
    styles: BaseTerminalTabComponent.styles,
    animations: BaseTerminalTabComponent.animations,
})
export class AdbTerminalTabComponent extends BaseTerminalTabComponent<BaseTerminalProfile> {
    constructor(injector: Injector) {
        super(injector);
    }

    ngOnInit(): void {
        this.logger = this.log.create("terminalTab");
        this.session = new AdbSession(
            this.injector,
            this.logger
        ) as unknown as BaseSession;
        super.ngOnInit();
    }

    protected onFrontendReady(): void {
        this.initializeSession();
        super.onFrontendReady();
    }

    initializeSession(): void {
        this.session!.start(undefined);
        this.attachSessionHandlers(true);
        this.recoveryStateChangedHint.next();
    }

    ngOnDestroy(): void {
        super.ngOnDestroy();
        this.session?.destroy();
    }
}
