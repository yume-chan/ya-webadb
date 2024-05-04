import type { BufferFieldConverter } from "./base.js";
import { BufferLikeFieldDefinition } from "./base.js";

export interface FixedLengthBufferLikeFieldOptions {
    length: number;
}

export class FixedLengthBufferLikeFieldDefinition<
    TConverter extends BufferFieldConverter = BufferFieldConverter,
    TOptions extends
        FixedLengthBufferLikeFieldOptions = FixedLengthBufferLikeFieldOptions,
    TTypeScriptType = TConverter["TTypeScriptType"],
> extends BufferLikeFieldDefinition<
    TConverter,
    TOptions,
    never,
    TTypeScriptType
> {
    getSize(): number {
        return this.options.length;
    }
}
