import { IconButton, Stack } from "@fluentui/react";
import { makeStyles, mergeClasses } from "@griffel/react";
import { AndroidKeyCode, AndroidKeyEventAction } from "@yume-chan/scrcpy";
import { observer } from "mobx-react-lite";
import { CSSProperties, PointerEvent, ReactNode } from "react";
import { Icons } from "../../utils";
import { STATE } from "./state";

const useClasses = makeStyles({
    container: {
        height: "40px",
        backgroundColor: "#999",
    },
    bar: {
        width: "100%",
        maxWidth: "300px",
    },
    icon: {
        color: "white",
    },
    back: {
        transform: "rotate(180deg)",
    },
});

function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!STATE.client) {
        return false;
    }

    if (e.button !== 0) {
        return false;
    }

    STATE.fullScreenContainer!.focus();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();

    return true;
}

function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!STATE.client) {
        return false;
    }

    if (e.button !== 0) {
        return false;
    }

    return true;
}

function handleBackPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!handlePointerDown(e)) {
        return;
    }

    STATE.client!.controlMessageWriter!.backOrScreenOn(
        AndroidKeyEventAction.Down
    );
}

function handleBackPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!handlePointerUp(e)) {
        return;
    }

    STATE.client!.controlMessageWriter!.backOrScreenOn(
        AndroidKeyEventAction.Up
    );
}

function handleHomePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!handlePointerDown(e)) {
        return;
    }

    STATE.client!.controlMessageWriter!.injectKeyCode({
        action: AndroidKeyEventAction.Down,
        keyCode: AndroidKeyCode.AndroidHome,
        repeat: 0,
        metaState: 0,
    });
}

function handleHomePointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!handlePointerUp(e)) {
        return;
    }

    STATE.client!.controlMessageWriter!.injectKeyCode({
        action: AndroidKeyEventAction.Up,
        keyCode: AndroidKeyCode.AndroidHome,
        repeat: 0,
        metaState: 0,
    });
}

function handleAppSwitchPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!handlePointerDown(e)) {
        return;
    }

    STATE.client!.controlMessageWriter!.injectKeyCode({
        action: AndroidKeyEventAction.Down,
        keyCode: AndroidKeyCode.AndroidAppSwitch,
        repeat: 0,
        metaState: 0,
    });
}

function handleAppSwitchPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!handlePointerUp(e)) {
        return;
    }

    STATE.client!.controlMessageWriter!.injectKeyCode({
        action: AndroidKeyEventAction.Up,
        keyCode: AndroidKeyCode.AndroidAppSwitch,
        repeat: 0,
        metaState: 0,
    });
}

export const NavigationBar = observer(function NavigationBar({
    className,
    style,
    children,
}: {
    className: string;
    style: CSSProperties;
    children: ReactNode;
}) {
    const classes = useClasses();

    if (!STATE.navigationBarVisible) {
        return (
            <div className={className} style={style}>
                {children}
            </div>
        );
    }

    return (
        <Stack
            className={mergeClasses(classes.container, className)}
            verticalFill
            horizontalAlign="center"
            style={style}
        >
            {children}

            <Stack
                className={classes.bar}
                verticalFill
                horizontal
                horizontalAlign="space-evenly"
                verticalAlign="center"
            >
                <IconButton
                    className={mergeClasses(classes.back, classes.icon)}
                    iconProps={{ iconName: Icons.Play }}
                    onPointerDown={handleBackPointerDown}
                    onPointerUp={handleBackPointerUp}
                />
                <IconButton
                    className={classes.icon}
                    iconProps={{ iconName: Icons.Circle }}
                    onPointerDown={handleHomePointerDown}
                    onPointerUp={handleHomePointerUp}
                />
                <IconButton
                    className={classes.icon}
                    iconProps={{ iconName: Icons.Stop }}
                    onPointerDown={handleAppSwitchPointerDown}
                    onPointerUp={handleAppSwitchPointerUp}
                />
            </Stack>
        </Stack>
    );
});
