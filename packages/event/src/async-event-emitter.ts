import { Event } from './event';
import { EventEmitter } from './event-emitter';

export type AsyncEventResult = void | Promise<void>;

export type AsyncEvent<TEvent> = Event<TEvent, AsyncEventResult>;

export class AsyncEventEmitter<TEvent> extends EventEmitter<TEvent, AsyncEventResult> {
    public async fire(e: TEvent) {
        for (const info of this.listeners) {
            await info.listener.apply(info.thisArg, [e, ...info.args]);
        }
    }
}
