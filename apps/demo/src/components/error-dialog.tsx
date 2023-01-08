import {
    Dialog,
    DialogFooter,
    DialogType,
    PrimaryButton,
} from "@fluentui/react";
import { observer } from "mobx-react-lite";
import { PropsWithChildren } from "react";
import { GLOBAL_STATE } from "../state";

export const ErrorDialogProvider = observer((props: PropsWithChildren<{}>) => {
    return (
        <>
            {props.children}

            <Dialog
                hidden={!GLOBAL_STATE.errorDialogVisible}
                dialogContentProps={{
                    type: DialogType.normal,
                    title: "Error",
                    subText: GLOBAL_STATE.errorDialogMessage,
                }}
            >
                <DialogFooter>
                    <PrimaryButton
                        text="OK"
                        onClick={GLOBAL_STATE.hideErrorDialog}
                    />
                </DialogFooter>
            </Dialog>
        </>
    );
});
