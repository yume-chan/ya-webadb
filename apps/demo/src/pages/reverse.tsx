import { NOOP, decodeUtf8 } from "@yume-chan/adb";
import { WritableStream } from "@yume-chan/stream-extra";
import { makeAutoObservable, reaction, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import { GLOBAL_STATE } from "../state";

const state = makeAutoObservable({
    log: [] as string[],
});

reaction(
    () => GLOBAL_STATE.adb,
    async (device) => {
        if (!device) {
            return;
        }

        await device.reverse.remove("tcp:3000").catch(NOOP);
        await device.reverse.add("tcp:3000", (socket) => {
            runInAction(() => {
                state.log.push(`received stream`);
            });
            socket.readable.pipeTo(
                new WritableStream({
                    write: (chunk) => {
                        runInAction(() => {
                            state.log.push(
                                `received data: ${decodeUtf8(chunk)}`
                            );
                        });
                    },
                })
            );
        });
    },
    { fireImmediately: true }
);

const ReverseTesterPage: NextPage = () => {
    return (
        <div>
            {state.log.map((line, index) => (
                <div key={index}>{line}</div>
            ))}
        </div>
    );
};

export default observer(ReverseTesterPage);
