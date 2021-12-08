import { ICommandBarItemProps, Stack } from '@fluentui/react';
import { AdbFrameBuffer } from "@yume-chan/adb";
import { action, autorun, computed, makeAutoObservable } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { CommandBar, DemoMode, DeviceView } from '../components';
import { global } from "../state";
import { RouteStackProps } from "../utils";

class FrameBufferState {
    width = 0;
    height = 0;
    imageData: ImageData | undefined;
    demoModeVisible = false;

    constructor() {
        makeAutoObservable(this, {
            toggleDemoModeVisible: action.bound,
        });
    }

    setImage(image: AdbFrameBuffer) {
        this.width = image.width;
        this.height = image.height;
        this.imageData = new ImageData(image.data, image.width, image.height);
    }

    toggleDemoModeVisible() {
        this.demoModeVisible = !this.demoModeVisible;
    }
}

const state = new FrameBufferState();

const FrameBuffer: NextPage = (): JSX.Element | null => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const capture = useCallback(async () => {
        if (!global.device) {
            return;
        }

        try {
            const start = window.performance.now();
            const framebuffer = await global.device.framebuffer();
            const end = window.performance.now();
            console.log('time', end - start);
            state.setImage(framebuffer);
        } catch (e) {
            global.showErrorDialog(e instanceof Error ? e.message : `${e}`);
        }
    }, []);

    useEffect(() => {
        return autorun(() => {
            const canvas = canvasRef.current;
            if (canvas && state.imageData) {
                canvas.width = state.width;
                canvas.height = state.height;
                const context = canvas.getContext("2d")!;
                context.putImageData(state.imageData, 0, 0);
            }
        });
    }, []);

    const commandBarItems = computed(() => [
        {
            key: 'start',
            disabled: !global.device,
            iconProps: { iconName: 'Camera' },
            text: 'Capture',
            onClick: capture,
        },
        {
            key: 'Save',
            disabled: !state.imageData,
            iconProps: { iconName: 'Save' },
            text: 'Save',
            onClick: () => {
                const canvas = canvasRef.current;
                if (!canvas) {
                    return;
                }

                const url = canvas.toDataURL();
                const a = document.createElement('a');
                a.href = url;
                a.download = `Screenshot of ${global.device!.name}.png`;
                a.click();
            },
        },
    ]);

    const commandBarFarItems = computed((): ICommandBarItemProps[] => [
        {
            key: 'DemoMode',
            iconProps: { iconName: 'Personalize' },
            checked: state.demoModeVisible,
            text: 'Demo Mode Settings',
            onClick: state.toggleDemoModeVisible,
        },
        {
            key: 'info',
            iconProps: { iconName: 'Info' },
            iconOnly: true,
            tooltipHostProps: {
                content: 'Use ADB FrameBuffer command to capture a full-size, high-resolution screenshot.',
                calloutProps: {
                    calloutMaxWidth: 250,
                }
            },
        }
    ]);

    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>Screen Capture - WebADB</title>
            </Head>

            <CommandBar items={commandBarItems.get()} farItems={commandBarFarItems.get()} />
            <Stack horizontal grow styles={{ root: { height: 0 } }}>
                <DeviceView width={state.width} height={state.height}>
                    <canvas ref={canvasRef} style={{ display: 'block' }} />
                </DeviceView>

                <DemoMode style={{ display: state.demoModeVisible ? 'block' : 'none' }} />
            </Stack>
        </Stack>
    );
};

export default observer(FrameBuffer);
