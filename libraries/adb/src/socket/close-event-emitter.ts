import { EventEmitter, EventListenerInfo, RemoveEventListener } from '@yume-chan/event';

const NoopRemoveEventListener: RemoveEventListener = () => { };
NoopRemoveEventListener.dispose = NoopRemoveEventListener;

export class CloseEventEmitter extends EventEmitter<void, void>{
    private closed = false;

    protected override addEventListener(info: EventListenerInfo<void, void>) {
        if (this.closed) {
            info.listener.apply(info.thisArg, [undefined, ...info.args]);
            return NoopRemoveEventListener;
        } else {
            return super.addEventListener(info);
        }
    }

    public override fire() {
        super.fire();
        this.closed = true;
        this.listeners.length = 0;
    }

    public override dispose() {
        this.fire();
        super.dispose();
    }
}
