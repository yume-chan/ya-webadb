import { Dialog, DialogFooter, DialogType, PrimaryButton } from '@fluentui/react';
import { observer } from "mobx-react-lite";
import { PropsWithChildren } from 'react';
import { globalState } from '../state';

export const ErrorDialogProvider = observer((props: PropsWithChildren<{}>) => {
    return (
        <>
            {props.children}

            <Dialog
                hidden={!globalState.errorDialogVisible}
                dialogContentProps={{
                    type: DialogType.normal,
                    title: 'Error',
                    subText: globalState.errorDialogMessage,
                }}
            >
                <DialogFooter>
                    <PrimaryButton text="OK" onClick={globalState.hideErrorDialog} />
                </DialogFooter>
            </Dialog>
        </>
    );
});
