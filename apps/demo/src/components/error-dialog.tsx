import { Dialog, DialogFooter, DialogType, PrimaryButton } from '@fluentui/react';
import { observer } from "mobx-react-lite";
import { PropsWithChildren } from 'react';
import { GlobalState } from '../state';

export const ErrorDialogProvider = observer((props: PropsWithChildren<{}>) => {
    return (
        <>
            {props.children}

            <Dialog
                hidden={!GlobalState.errorDialogVisible}
                dialogContentProps={{
                    type: DialogType.normal,
                    title: 'Error',
                    subText: GlobalState.errorDialogMessage,
                }}
            >
                <DialogFooter>
                    <PrimaryButton text="OK" onClick={GlobalState.hideErrorDialog} />
                </DialogFooter>
            </Dialog>
        </>
    );
});
