import { decodeUtf8, WritableStream } from "@yume-chan/adb";
import { makeAutoObservable, reaction, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import { GlobalState } from "../state";

const state = makeAutoObservable({
    log: [] as string[],
});

reaction(() => GlobalState.device, async device => {
    if (!device) {
        return;
    }

    await device.reverse.remove('tcp:3000').catch(() => { });
    await device.reverse.add('tcp:3000', 'tcp:1234', socket => {
        runInAction(() => {
            state.log.push(`received stream ${socket.localId}`);
        });
        socket.readable.pipeTo(new WritableStream({
            write: chunk => {
                runInAction(() => {
                    state.log.push(`data from ${socket.localId}: ${decodeUtf8(chunk)}`);
                });
            }
        }));

        // Return true to accept the connection.
        return true;
    });
}, { fireImmediately: true });

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
