import { DefaultButton, ProgressIndicator, Stack } from "@fluentui/react";
import { ADB_SYNC_MAX_PACKET_SIZE, ChunkStream, ReadableStream } from "@yume-chan/adb";
import { action, makeAutoObservable, observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import { GlobalState } from "../state";
import { createFileStream, pickFile, ProgressStream, RouteStackProps } from "../utils";

enum Stage {
    Uploading,

    Installing,

    Completed,
}

interface Progress {
    filename: string;

    stage: Stage;

    uploadedSize: number;

    totalSize: number;

    value: number | undefined;
}

class InstallPageState {
    installing = false;

    progress: Progress | undefined = undefined;

    constructor() {
        makeAutoObservable(this, {
            progress: observable.ref,
            install: false,
        });
    }

    install = async () => {
        const file = await pickFile({ accept: '.apk' });
        if (!file) {
            return;
        }

        runInAction(() => {
            this.installing = true;
            this.progress = {
                filename: file.name,
                stage: Stage.Uploading,
                uploadedSize: 0,
                totalSize: file.size,
                value: 0,
            };
        });

        await createFileStream(file)
            .pipeThrough(new ChunkStream(ADB_SYNC_MAX_PACKET_SIZE))
            .pipeThrough(new ProgressStream(action((uploaded) => {
                if (uploaded !== file.size) {
                    this.progress = {
                        filename: file.name,
                        stage: Stage.Uploading,
                        uploadedSize: uploaded,
                        totalSize: file.size,
                        value: uploaded / file.size * 0.8,
                    };
                } else {
                    this.progress = {
                        filename: file.name,
                        stage: Stage.Installing,
                        uploadedSize: uploaded,
                        totalSize: file.size,
                        value: 0.8,
                    };
                }
            })))
            .pipeTo(GlobalState.device!.install());

        runInAction(() => {
            this.progress = {
                filename: file.name,
                stage: Stage.Completed,
                uploadedSize: file.size,
                totalSize: file.size,
                value: 1,
            };
            this.installing = false;
        });
    };
}

const state = new InstallPageState();

const Install: NextPage = () => {
    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>Install APK - Android Web Toolbox</title>
            </Head>

            <Stack horizontal>
                <DefaultButton
                    disabled={!GlobalState.device || state.installing}
                    text="Open"
                    onClick={state.install}
                />
            </Stack>

            {state.progress && (
                <ProgressIndicator
                    styles={{ root: { width: 300 } }}
                    label={state.progress.filename}
                    percentComplete={state.progress.value}
                    description={Stage[state.progress.stage]}
                />
            )}
        </Stack>
    );
};

export default observer(Install);
