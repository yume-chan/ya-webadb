/**
 * `undefined` is a valid value if `TEvent` includes `undefined`,
 * so we use a unique symbol to represent the absence of value.
 */
export const Absence = Symbol("absence");

export type Absence = typeof Absence;
