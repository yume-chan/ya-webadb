import { Dialog, DialogFooter, DialogType, PrimaryButton } from '@fluentui/react';
import { observer } from "mobx-react-lite";
import { PropsWithChildren } from 'react';
import { global } from '../state';

export const ErrorDialogProvider = observer((props: PropsWithChildren<{}>) => {
    return (
        <>
            {props.children}

            <Dialog
                hidden={!global.errorDialogVisible}
                dialogContentProps={{
                    type: DialogType.normal,
                    title: 'Error',
                    subText: global.errorDialogMessage,
                }}
            >
                <DialogFooter>
                    <PrimaryButton text="OK" onClick={global.hideErrorDialog} />
                </DialogFooter>
            </Dialog>
        </>
    );
});
