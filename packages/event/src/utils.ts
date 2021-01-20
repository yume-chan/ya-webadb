import { PromiseResolver } from '@yume-chan/async-operation-manager';
import { Event } from './event';

export async function once<T>(event: Event<T>): Promise<T> {
    const resolver = new PromiseResolver<T>();
    const dispose = event(resolver.resolve);
    const result = await resolver.promise;
    dispose();
    return result;
}
