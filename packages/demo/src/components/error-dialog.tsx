import { Dialog, DialogFooter, DialogType, PrimaryButton } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { createContext, PropsWithChildren, useMemo, useState } from 'react';
import { withDisplayName } from '../utils';

export interface ErrorDialogContext {
    show(message: string): void;
}

export const ErrorDialogContext = createContext<ErrorDialogContext>({
    show() { }
});

export const ErrorDialogProvider = withDisplayName('ErrorDialogProvider')((props: PropsWithChildren<{}>) => {
    const [errorDialogVisible, { setTrue: showErrorDialog, setFalse: hideErrorDialog }] = useBoolean(false);
    const [errorMessage, setErrorMessage] = useState<string | undefined>();

    const context = useMemo((): ErrorDialogContext => ({
        show(message) {
            setErrorMessage(message);
            showErrorDialog();
        }
    }), []);

    return (
        <ErrorDialogContext.Provider value={context}>
            {props.children}

            <Dialog
                hidden={!errorDialogVisible}
                dialogContentProps={{
                    type: DialogType.normal,
                    title: 'Error',
                    subText: errorMessage,
                }}
            >
                <DialogFooter>
                    <PrimaryButton text="OK" onClick={hideErrorDialog} />
                </DialogFooter>
            </Dialog>
        </ErrorDialogContext.Provider>
    );
});
