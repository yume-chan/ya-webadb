import { EventEmitter, EventListenerInfo, RemoveEventListener } from '@yume-chan/event';

const NoopRemoveEventListener: RemoveEventListener = () => { };
NoopRemoveEventListener.dispose = NoopRemoveEventListener;

export class CloseEventEmitter extends EventEmitter<void, void>{
    private closed = false;

    protected addEventListener(info: EventListenerInfo<void, void>) {
        if (this.closed) {
            info.listener.apply(info.thisArg, [undefined, ...info.args]);
            return NoopRemoveEventListener;
        } else {
            return super.addEventListener(info);
        }
    }

    fire() {
        super.fire();
        this.closed = true;
        this.listeners.length = 0;
    }

    dispose() {
        this.fire();
        super.dispose();
    }
}
