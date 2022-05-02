// cspell: ignore bugreport
// cspell: ignore bugreportz

import { MessageBar, MessageBarType, PrimaryButton, Stack, StackItem } from "@fluentui/react";
import { BugReport, BugReportZ, BugReportZVersion } from "@yume-chan/android-bin";
import { action, autorun, makeAutoObservable, observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import { GlobalState } from "../state";
import { RouteStackProps, saveFile } from "../utils";

class BugReportState {
    bugReport: BugReport | undefined = undefined;

    bugReportZ: BugReportZ | undefined = undefined;

    bugReportZVersion: BugReportZVersion | undefined = undefined;

    bugReportZInProgress = false;

    bugReportZProgress: string | undefined = undefined;

    bugReportZTotalSize: string | undefined = undefined;

    constructor() {
        makeAutoObservable(this, {
            bugReportZVersion: observable.deep,
            generateBugReport: action.bound,
            generateBugReportZStream: action.bound,
            generateBugReportZ: action.bound,
        });

        autorun(() => {
            if (GlobalState.device) {
                runInAction(() => {
                    this.bugReport = new BugReport(GlobalState.device!);
                    this.bugReportZ = new BugReportZ(GlobalState.device!);

                    this.bugReportZ.version().then(action(version => {
                        this.bugReportZVersion = version;
                    }));
                });
            } else {
                runInAction(() => {
                    this.bugReport = undefined;
                    this.bugReportZ = undefined;
                    this.bugReportZVersion = undefined;
                });
            }
        });
    }

    async generateBugReport() {
        await this.bugReport!.generate()
            .pipeTo(saveFile('bugreport.txt'));
    }

    async generateBugReportZStream() {
        await this.bugReportZ!.stream()
            .pipeTo(saveFile('bugreport.zip'));
    }

    async generateBugReportZ() {
        runInAction(() => {
            this.bugReportZInProgress = true;
        });

        const filename = await this.bugReportZ!.generate(
            this.bugReportZVersion!.supportProgress
                ? action((progress, total) => {
                    this.bugReportZProgress = progress;
                    this.bugReportZTotalSize = total;
                })
                : undefined
        );

        const sync = await GlobalState.device!.sync();
        await sync.read(filename)
            .pipeTo(saveFile('bugreport.zip'));

        sync.dispose();

        runInAction(() => {
            this.bugReportZInProgress = false;
            this.bugReportZProgress = undefined;
            this.bugReportZTotalSize = undefined;
        });
    }
}

const state = new BugReportState();

const BugReportPage: NextPage = () => {
    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>BugReport - Android Web Toolbox</title>
            </Head>

            <MessageBar messageBarType={MessageBarType.info}>This is the `bugreport`/`bugreportz` tool in Android</MessageBar>

            <StackItem>
                <PrimaryButton
                    disabled={!state.bugReport}
                    text="Generate BugReport"
                    onClick={state.generateBugReport}
                />
            </StackItem>

            <StackItem>
                <PrimaryButton
                    disabled={!state.bugReportZVersion?.supportStream}
                    text="Generate Zipped BugReport (Streaming)"
                    onClick={state.generateBugReportZStream}
                />
            </StackItem>

            <StackItem>
                <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
                    <StackItem>
                        <PrimaryButton
                            disabled={!state.bugReportZVersion || state.bugReportZInProgress}
                            text="Generate Zipped BugReport"
                            onClick={state.generateBugReportZ}
                        />
                    </StackItem>

                    {state.bugReportZInProgress && (
                        <StackItem>
                            {state.bugReportZTotalSize ? (
                                <span>
                                    Progress: {state.bugReportZProgress} / {state.bugReportZTotalSize}
                                </span>
                            ) : (
                                <span>
                                    Generating... Please wait
                                    {!state.bugReportZVersion!.supportProgress && ' (this device does not support progress)'}
                                </span>
                            )}
                        </StackItem>
                    )}
                </Stack>
            </StackItem>
        </Stack>
    );
};

export default observer(BugReportPage);
